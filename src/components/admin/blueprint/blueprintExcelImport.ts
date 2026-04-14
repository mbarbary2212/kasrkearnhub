import ExcelJS from 'exceljs';
import {
  COMPONENT_COLUMNS,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprintConfig';
import { supabase } from '@/integrations/supabase/client';
import {
  resolveColumnAlias,
  normalizeText,
  isHeaderRow,
  isSkippableRow,
  matchChapter,
  matchSection,
  type ChapterCandidate,
  type SectionCandidate,
} from '@/lib/blueprintImportMatching';

// ─── Types ─────────────────────────────────────────────────────────
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

export interface ImportResult {
  upserted: number;
  cleared: number;
  replaced: number;
  skippedRows: number;
  unmatchedChapters: string[];
  unmatchedSections: string[];
  unmatchedColumns: string[];
  warnings: string[];
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

// ─── Main import function ──────────────────────────────────────────
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

  const result: ImportResult = {
    upserted: 0, cleared: 0, replaced: 0, skippedRows: 0,
    unmatchedChapters: [], unmatchedSections: [], unmatchedColumns: [],
    warnings: [], errors: [],
  };

  // Build chapter lookup
  const chapterCandidates: ChapterCandidate[] = chapters.map(ch => ({
    id: ch.id, module_id: ch.module_id, chapter_number: ch.chapter_number, title: ch.title,
  }));

  // Fetch all sections for relevant chapters
  const chapterIds = chapters.map(ch => ch.id);
  const sectionMap = new Map<string, SectionCandidate[]>();
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
        list.push({ id: s.id, name: s.name, section_number: s.section_number, chapter_id: s.chapter_id });
        sectionMap.set(s.chapter_id, list);
      }
    }
  }

  // ── Step 1: Detect real header row ───────────────────────────────
  let headerRowNum = 1;
  for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      cells.push(String(cell.value ?? ''));
    });
    if (isHeaderRow(cells)) { headerRowNum = r; break; }
  }

  // ── Step 2: Map columns using aliases ────────────────────────────
  const headerRow = ws.getRow(headerRowNum);
  const colMap = new Map<number, string>(); // colNum → component key
  let chapterIdCol: number | null = null;
  let sectionIdCol: number | null = null;
  const matchedKeys = new Set<string>();
  const unmatchedHeaders: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = String(cell.value ?? '').trim();
    const lc = val.toLowerCase();

    if (lc === 'chapter_id') { chapterIdCol = colNum; return; }
    if (lc === 'section_id') { sectionIdCol = colNum; return; }

    // Try exact label match first, then alias
    for (const col of COMPONENT_COLUMNS) {
      if (lc === col.label.toLowerCase() || lc === col.key) {
        colMap.set(colNum, col.key);
        matchedKeys.add(col.key);
        return;
      }
    }
    const aliasKey = resolveColumnAlias(val);
    if (aliasKey) {
      colMap.set(colNum, aliasKey);
      matchedKeys.add(aliasKey);
      return;
    }

    // Ignore known non-component headers
    if (['chapter', 'section', 'topic', 'chapter_id', 'section_id'].includes(lc)) return;
    if (colNum > 1) unmatchedHeaders.push(val);
  });

  // Warn about expected columns that were not found
  for (const col of COMPONENT_COLUMNS) {
    if (!matchedKeys.has(col.key)) {
      result.warnings.push(`Column "${col.label}" not found in Excel. ` +
        (unmatchedHeaders.length > 0
          ? `Unmatched headers: ${unmatchedHeaders.join(', ')}`
          : 'No extra headers found.'));
      result.unmatchedColumns.push(col.label);
      break; // one warning is enough
    }
  }

  // ── Step 3: Parse data rows ──────────────────────────────────────
  const rows: ParsedRow[] = [];
  const clears: ClearRow[] = [];
  let currentChapter: { id: string; module_id: string } | null = null;

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
          chapter_id: chapterId, module_id: moduleId, section_id: sectionId,
          component_type: compKey, inclusion_level: parsed.level,
          question_types: parsed.types, exam_type: examType,
        });
      } else if (!cellVal || cellVal === '—' || cellVal === '-') {
        clears.push({
          chapter_id: chapterId, section_id: sectionId,
          component_type: compKey, exam_type: examType,
        });
      }
    }
  }

  for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawLabel = String(row.getCell(1).value ?? '').trim();
    if (!rawLabel) continue;

    // Skip repeated header rows / filler
    if (isSkippableRow(rawLabel)) { result.skippedRows++; continue; }

    const rowChapterId = chapterIdCol ? String(row.getCell(chapterIdCol).value ?? '').trim() : '';
    const rowSectionId = sectionIdCol ? String(row.getCell(sectionIdCol).value ?? '').trim() : '';

    // Determine if this is a section row
    const isSection = rawLabel.startsWith('→') || rawLabel.startsWith('→');
    const isSectionByContext = !isSection && (
      (rowSectionId && rowSectionId.length > 10) ||
      (!rowChapterId && currentChapter != null && (() => {
        const secs = sectionMap.get(currentChapter!.id) || [];
        const res = matchSection(rawLabel, secs);
        return res.score >= 0.5;
      })())
    );

    if (!isSection && !isSectionByContext) {
      // ── Chapter row ──
      const chRes = matchChapter(rawLabel, chapterCandidates, rowChapterId || undefined);
      if (!chRes.match) {
        result.unmatchedChapters.push(rawLabel);
        result.errors.push(`Row ${r}: Could not match chapter "${rawLabel}"`);
        currentChapter = null;
        result.skippedRows++;
        continue;
      }
      if (chRes.ambiguous) {
        result.warnings.push(`Row ${r}: Chapter "${rawLabel}" matched ambiguously to "${chRes.match.title}" (score ${(chRes.score * 100).toFixed(0)}%)`);
      }
      currentChapter = { id: chRes.match.id, module_id: chRes.match.module_id };
      processCells(row, chRes.match.id, chRes.match.module_id, null);
    } else {
      // ── Section row ──
      if (!currentChapter) {
        result.errors.push(`Row ${r}: Section row without preceding chapter`);
        result.skippedRows++;
        continue;
      }
      const chapterSections = sectionMap.get(currentChapter.id) || [];
      const cleanLabel = rawLabel.replace(/^[→→]\s*/, '');
      const secRes = matchSection(cleanLabel, chapterSections, rowSectionId || undefined);

      if (!secRes.match) {
        result.unmatchedSections.push(cleanLabel);
        result.errors.push(`Row ${r}: Could not match section "${cleanLabel}" in chapter`);
        result.skippedRows++;
        continue;
      }
      if (secRes.ambiguous) {
        result.warnings.push(`Row ${r}: Section "${cleanLabel}" matched ambiguously to "${secRes.match.name}" (score ${(secRes.score * 100).toFixed(0)}%)`);
      }
      processCells(row, currentChapter.id, currentChapter.module_id, secRes.match.id);
    }
  }

  // ── Step 4: Batch DB operations ──────────────────────────────────

  // Safety: if Replace All but nothing valid to insert, abort — don't wipe data
  if (replaceAll && rows.length === 0) {
    result.errors.push('No valid data rows found in file. Existing data was NOT deleted.');
    return result;
  }

  // Preload all existing configs for affected chapters
  const affectedChapterIds = [...new Set(rows.map(r => r.chapter_id))];

  if (replaceAll && affectedChapterIds.length > 0) {
    for (let i = 0; i < affectedChapterIds.length; i += 50) {
      const batch = affectedChapterIds.slice(i, i + 50);
      const { count, error } = await supabase
        .from('chapter_blueprint_config')
        .delete()
        .in('chapter_id', batch)
        .eq('exam_type', examType);
      if (error) result.errors.push(`Failed to clear existing configs: ${error.message}`);
      else result.replaced += count ?? 0;
    }
  }

  // Build existing config lookup for merge mode
  const existingMap = new Map<string, string>(); // composite key → id
  if (!replaceAll && affectedChapterIds.length > 0) {
    for (let i = 0; i < affectedChapterIds.length; i += 50) {
      const batch = affectedChapterIds.slice(i, i + 50);
      const { data: existing } = await supabase
        .from('chapter_blueprint_config')
        .select('id, chapter_id, section_id, component_type, exam_type')
        .in('chapter_id', batch)
        .eq('exam_type', examType);
      if (existing) {
        for (const e of existing) {
          const key = `${e.chapter_id}|${e.section_id ?? ''}|${e.component_type}|${e.exam_type}`;
          existingMap.set(key, e.id);
        }
      }
    }
  }

  // Batch inserts and updates
  const toInsert: any[] = [];
  const toUpdate: { id: string; inclusion_level: string; question_types: string[] }[] = [];

  for (const r of rows) {
    if (replaceAll) {
      toInsert.push({
        chapter_id: r.chapter_id, module_id: r.module_id, section_id: r.section_id,
        exam_type: r.exam_type, component_type: r.component_type,
        inclusion_level: r.inclusion_level, question_types: r.question_types,
      });
    } else {
      const key = `${r.chapter_id}|${r.section_id ?? ''}|${r.component_type}|${r.exam_type}`;
      const existingId = existingMap.get(key);
      if (existingId) {
        toUpdate.push({ id: existingId, inclusion_level: r.inclusion_level, question_types: r.question_types });
      } else {
        toInsert.push({
          chapter_id: r.chapter_id, module_id: r.module_id, section_id: r.section_id,
          exam_type: r.exam_type, component_type: r.component_type,
          inclusion_level: r.inclusion_level, question_types: r.question_types,
        });
      }
    }
  }

  // Batch insert in chunks of 200
  for (let i = 0; i < toInsert.length; i += 200) {
    const batch = toInsert.slice(i, i + 200);
    const { error } = await supabase.from('chapter_blueprint_config').insert(batch);
    if (error) result.errors.push(`Batch insert failed (rows ${i}-${i + batch.length}): ${error.message}`);
    else result.upserted += batch.length;
  }

  // Batch update — still individual calls but much fewer than before
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('chapter_blueprint_config')
      .update({ inclusion_level: u.inclusion_level, question_types: u.question_types })
      .eq('id', u.id);
    if (error) result.errors.push(`Update failed: ${error.message}`);
    else result.upserted++;
  }

  // Handle clears in merge mode
  if (!replaceAll) {
    const toDelete: string[] = [];
    for (const c of clears) {
      const key = `${c.chapter_id}|${c.section_id ?? ''}|${c.component_type}|${c.exam_type}`;
      const existingId = existingMap.get(key);
      if (existingId) toDelete.push(existingId);
    }
    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 200) {
        const batch = toDelete.slice(i, i + 200);
        const { error, count } = await supabase
          .from('chapter_blueprint_config')
          .delete()
          .in('id', batch);
        if (error) result.errors.push(`Clear failed: ${error.message}`);
        else result.cleared += count ?? batch.length;
      }
    }
  }

  return result;
}
