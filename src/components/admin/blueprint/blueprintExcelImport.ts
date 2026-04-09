import ExcelJS from 'exceljs';
import {
  COMPONENT_COLUMNS,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprintConfig';
import { supabase } from '@/integrations/supabase/client';

interface ParsedRow {
  chapter_id: string;
  module_id: string;
  section_id: string | null;
  component_type: string;
  inclusion_level: string;
  question_types: string[];
  exam_type: string;
}

interface ImportResult {
  upserted: number;
  cleared: number;
  errors: string[];
}

const LEVEL_RE = /^(High|Average|Low)(\s*\((.+)\))?$/i;

function parseCell(value: string | undefined | null): { level: string; types: string[] } | null {
  if (!value || !value.trim()) return null;
  const m = value.trim().match(LEVEL_RE);
  if (!m) return null;
  const level = m[1].toLowerCase();
  const types = m[3] ? m[3].split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
  return { level, types };
}

export async function importBlueprintFromExcel(
  buffer: ArrayBuffer,
  chapters: { id: string; chapter_number: number; title: string; module_id: string }[],
  examType: string = 'default',
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in file');

  // Build lookup maps
  const chapterById = new Map(chapters.map(ch => [ch.id, ch]));
  const chapterByLabel = new Map(
    chapters.map(ch => [`ch ${ch.chapter_number}: ${ch.title}`.toLowerCase(), ch])
  );

  // Fetch sections for all chapters
  const chapterIds = chapters.map(ch => ch.id);
  const sectionMap = new Map<string, { id: string; name: string; section_number: string | null; chapter_id: string }[]>();
  if (chapterIds.length > 0) {
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, section_number, chapter_id, display_order')
      .in('chapter_id', chapterIds)
      .order('display_order', { ascending: true })
      .limit(5000);
    if (sections) {
      for (const s of sections) {
        const list = sectionMap.get(s.chapter_id) || [];
        list.push(s);
        sectionMap.set(s.chapter_id, list);
      }
    }
  }

  // Detect column mapping from header row
  const headerRow = ws.getRow(1);
  const colMap = new Map<number, string>(); // col index → component_type key
  headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = String(cell.value ?? '').trim().toLowerCase();
    for (const col of COMPONENT_COLUMNS) {
      if (val === col.label.toLowerCase()) {
        colMap.set(colNum, col.key);
        break;
      }
    }
  });

  // Find hidden ID columns (chapter_id, section_id)
  let chapterIdCol: number | null = null;
  let sectionIdCol: number | null = null;
  headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = String(cell.value ?? '').trim().toLowerCase();
    if (val === 'chapter_id') chapterIdCol = colNum;
    if (val === 'section_id') sectionIdCol = colNum;
  });

  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  let currentChapter: { id: string; module_id: string } | null = null;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const label = String(row.getCell(1).value ?? '').trim();
    if (!label) continue;

    // Try to resolve chapter/section by hidden IDs first, then by name
    const rowChapterId = chapterIdCol ? String(row.getCell(chapterIdCol).value ?? '').trim() : '';
    const rowSectionId = sectionIdCol ? String(row.getCell(sectionIdCol).value ?? '').trim() : '';

    const isSection = label.startsWith('→') || label.startsWith('→');

    if (!isSection) {
      // Chapter row
      let ch = rowChapterId ? chapterById.get(rowChapterId) : undefined;
      if (!ch) {
        // Fallback to name matching
        ch = chapterByLabel.get(label.toLowerCase());
        if (!ch) {
          // Try partial match: strip "Ch N: "
          const stripped = label.replace(/^ch\s*\d+:\s*/i, '').toLowerCase();
          for (const [, c] of chapterByLabel) {
            if (c.title.toLowerCase() === stripped) { ch = c; break; }
          }
        }
      }
      if (!ch) {
        errors.push(`Row ${r}: Could not match chapter "${label}"`);
        currentChapter = null;
        continue;
      }
      currentChapter = { id: ch.id, module_id: ch.module_id };

      // Parse component cells
      for (const [colNum, compKey] of colMap) {
        const cellVal = String(row.getCell(colNum).value ?? '').trim();
        const parsed = parseCell(cellVal);
        if (parsed) {
          rows.push({
            chapter_id: ch.id,
            module_id: ch.module_id,
            section_id: null,
            component_type: compKey,
            inclusion_level: parsed.level,
            question_types: parsed.types,
            exam_type: examType,
          });
        }
      }
    } else {
      // Section row
      if (!currentChapter) {
        errors.push(`Row ${r}: Section row without preceding chapter`);
        continue;
      }

      const secName = label.replace(/^[→→]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      const chapterSections = sectionMap.get(currentChapter.id) || [];

      let sec: typeof chapterSections[0] | undefined;

      // Try by hidden ID first
      if (rowSectionId) {
        sec = chapterSections.find(s => s.id === rowSectionId);
      }
      if (!sec) {
        // Name match
        sec = chapterSections.find(s => s.name.toLowerCase() === secName.toLowerCase());
        if (!sec) {
          // Partial/fuzzy
          sec = chapterSections.find(s => secName.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(secName.toLowerCase()));
        }
      }

      if (!sec) {
        errors.push(`Row ${r}: Could not match section "${secName}" in chapter`);
        continue;
      }

      for (const [colNum, compKey] of colMap) {
        const cellVal = String(row.getCell(colNum).value ?? '').trim();
        const parsed = parseCell(cellVal);
        if (parsed) {
          rows.push({
            chapter_id: currentChapter.id,
            module_id: currentChapter.module_id,
            section_id: sec.id,
            component_type: compKey,
            inclusion_level: parsed.level,
            question_types: parsed.types,
            exam_type: examType,
          });
        }
      }
    }
  }

  // Batch upsert - manual check + insert/update to handle COALESCE unique index
  let upserted = 0;
  let cleared = 0;

  for (const r of rows) {
    let query = supabase
      .from('chapter_blueprint_config')
      .select('id')
      .eq('chapter_id', r.chapter_id)
      .eq('exam_type', r.exam_type)
      .eq('component_type', r.component_type);

    if (r.section_id) {
      query = query.eq('section_id', r.section_id);
    } else {
      query = query.is('section_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('chapter_blueprint_config')
        .update({
          inclusion_level: r.inclusion_level,
          question_types: r.question_types,
        })
        .eq('id', existing.id);
      if (error) {
        errors.push(`Update failed for ${r.component_type}/${r.chapter_id}: ${error.message}`);
      } else {
        upserted++;
      }
    } else {
      const { error } = await supabase
        .from('chapter_blueprint_config')
        .insert({
          chapter_id: r.chapter_id,
          module_id: r.module_id,
          section_id: r.section_id,
          exam_type: r.exam_type,
          component_type: r.component_type,
          inclusion_level: r.inclusion_level,
          question_types: r.question_types,
        });
      if (error) {
        errors.push(`Insert failed for ${r.component_type}/${r.chapter_id}: ${error.message}`);
      } else {
        upserted++;
      }
    }
  }

  return { upserted, cleared, errors };
}
