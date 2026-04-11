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

interface ClearRow {
  chapter_id: string;
  section_id: string | null;
  component_type: string;
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
  replaceAll: boolean = false,
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
  const colMap = new Map<number, string>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = String(cell.value ?? '').trim().toLowerCase();
    for (const col of COMPONENT_COLUMNS) {
      if (val === col.label.toLowerCase()) {
        colMap.set(colNum, col.key);
        break;
      }
    }
  });

  // Find hidden ID columns
  let chapterIdCol: number | null = null;
  let sectionIdCol: number | null = null;
  headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = String(cell.value ?? '').trim().toLowerCase();
    if (val === 'chapter_id') chapterIdCol = colNum;
    if (val === 'section_id') sectionIdCol = colNum;
  });

  const rows: ParsedRow[] = [];
  const clears: ClearRow[] = [];
  const errors: string[] = [];
  let currentChapter: { id: string; module_id: string } | null = null;

  // Helper: process component cells for a resolved chapter/section
  function processCells(
    row: ExcelJS.Row,
    chapterId: string,
    moduleId: string,
    sectionId: string | null,
  ) {
    for (const [colNum, compKey] of colMap) {
      const cellVal = String(row.getCell(colNum).value ?? '').trim();
      const parsed = parseCell(cellVal);
      if (parsed) {
        rows.push({
          chapter_id: chapterId,
          module_id: moduleId,
          section_id: sectionId,
          component_type: compKey,
          inclusion_level: parsed.level,
          question_types: parsed.types,
          exam_type: examType,
        });
      } else if (!cellVal || cellVal === '—' || cellVal === '-') {
        // Empty / dash cell → mark for deletion if a config exists
        clears.push({
          chapter_id: chapterId,
          section_id: sectionId,
          component_type: compKey,
          exam_type: examType,
        });
      }
    }
  }

  // Build a reverse lookup: section name → { sectionObj, chapterId }
  const sectionByName = new Map<string, { sec: { id: string; name: string; section_number: string | null; chapter_id: string }; chapterId: string }>();
  for (const [chId, secs] of sectionMap) {
    for (const s of secs) {
      sectionByName.set(s.name.toLowerCase(), { sec: s, chapterId: chId });
    }
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawLabel = String(row.getCell(1).value ?? '').trim();
    if (!rawLabel) continue;

    // Strip common emoji/symbol prefixes (✅, ❌, ⚠️, etc.)
    const label = rawLabel.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u2705\u274C\u26A0\uFE0F✅❌⚠️🔴🟢🟡✓✔☑️]+\s*/u, '').trim();

    const rowChapterId = chapterIdCol ? String(row.getCell(chapterIdCol).value ?? '').trim() : '';
    const rowSectionId = sectionIdCol ? String(row.getCell(sectionIdCol).value ?? '').trim() : '';

    const isSection = label.startsWith('→') || label.startsWith('→');

    // Detect if this is a section row even without → prefix:
    // If there's a section_id column with a value, or the label matches a known section name
    const isSectionByContext = !isSection && (
      (rowSectionId && rowSectionId.length > 10) ||
      (!rowChapterId && currentChapter && sectionByName.has(label.replace(/^\d+\.\s*/, '').trim().toLowerCase()))
    );

    if (!isSection && !isSectionByContext) {
      // Chapter row
      let ch = rowChapterId ? chapterById.get(rowChapterId) : undefined;
      if (!ch) {
        ch = chapterByLabel.get(label.toLowerCase());
        if (!ch) {
          // Strip "Ch N:" prefix and emoji for matching
          const stripped = label.replace(/^ch\s*\d+:\s*/i, '').toLowerCase().trim();
          for (const [, c] of chapterByLabel) {
            if (c.title.toLowerCase() === stripped) { ch = c; break; }
          }
          // Also try partial/fuzzy match
          if (!ch) {
            for (const [, c] of chapterByLabel) {
              if (stripped.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(stripped)) {
                ch = c; break;
              }
            }
          }
        }
      }
      if (!ch) {
        errors.push(`Row ${r}: Could not match chapter "${rawLabel}"`);
        currentChapter = null;
        continue;
      }
      currentChapter = { id: ch.id, module_id: ch.module_id };
      processCells(row, ch.id, ch.module_id, null);
    } else {
      // Section row
      if (!currentChapter) {
        errors.push(`Row ${r}: Section row without preceding chapter`);
        continue;
      }

      const secName = label.replace(/^[→→]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u2705\u274C]+\s*/u, '').trim();
      const chapterSections = sectionMap.get(currentChapter.id) || [];

      let sec: typeof chapterSections[0] | undefined;
      if (rowSectionId) {
        sec = chapterSections.find(s => s.id === rowSectionId);
      }
      if (!sec) {
        sec = chapterSections.find(s => s.name.toLowerCase() === secName.toLowerCase());
        if (!sec) {
          sec = chapterSections.find(s =>
            secName.toLowerCase().includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(secName.toLowerCase())
          );
        }
      }

      if (!sec) {
        errors.push(`Row ${r}: Could not match section "${secName}" in chapter`);
        continue;
      }

      processCells(row, currentChapter.id, currentChapter.module_id, sec.id);
    }
  }

  // Batch upsert
  let upserted = 0;
  let cleared = 0;
  let replaced = 0;

  // Replace All mode: delete all existing configs for affected chapters first
  if (replaceAll) {
    const affectedChapterIds = [...new Set(rows.map(r => r.chapter_id))];
    if (affectedChapterIds.length > 0) {
      // Delete in batches of 50 to avoid query size limits
      for (let i = 0; i < affectedChapterIds.length; i += 50) {
        const batch = affectedChapterIds.slice(i, i + 50);
        const { count, error } = await supabase
          .from('chapter_blueprint_config')
          .delete()
          .in('chapter_id', batch)
          .eq('exam_type', examType);
        if (error) {
          errors.push(`Failed to clear existing configs: ${error.message}`);
        } else {
          replaced += count ?? 0;
        }
      }
    }
  }

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

  // Delete configs for cells that were cleared (empty/dash)
  for (const c of clears) {
    let query = supabase
      .from('chapter_blueprint_config')
      .select('id')
      .eq('chapter_id', c.chapter_id)
      .eq('exam_type', c.exam_type)
      .eq('component_type', c.component_type);

    if (c.section_id) {
      query = query.eq('section_id', c.section_id);
    } else {
      query = query.is('section_id', null);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from('chapter_blueprint_config')
        .delete()
        .eq('id', existing.id);
      if (error) {
        errors.push(`Clear failed for ${c.component_type}/${c.chapter_id}: ${error.message}`);
      } else {
        cleared++;
      }
    }
  }

  return { upserted, cleared, errors };
}
