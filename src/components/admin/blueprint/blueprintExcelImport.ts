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
  sourceRow: number; // track source for error reporting
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

/** Composite key for deduplication */
function rowKey(r: { chapter_id: string; section_id: string | null; component_type: string; exam_type: string }) {
  return `${r.chapter_id}|${r.section_id ?? ''}|${r.component_type}|${r.exam_type}`;
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

    if (['chapter', 'section', 'topic', 'chapter_id', 'section_id'].includes(lc)) return;
    if (colNum > 1) unmatchedHeaders.push(val);
  });

  for (const col of COMPONENT_COLUMNS) {
    if (!matchedKeys.has(col.key)) {
      result.warnings.push(`Column "${col.label}" not found in Excel. ` +
        (unmatchedHeaders.length > 0
          ? `Unmatched headers: ${unmatchedHeaders.join(', ')}`
          : 'No extra headers found.'));
      result.unmatchedColumns.push(col.label);
      break;
    }
  }

  // ── Step 3: Parse data rows ──────────────────────────────────────
  const rows: ParsedRow[] = [];
  const clears: ClearRow[] = [];
  let currentChapter: { id: string; module_id: string } | null = null;
  let hasAmbiguousMatch = false;

  function processCells(
    row: ExcelJS.Row,
    rowNum: number,
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
          question_types: parsed.types, exam_type: examType, sourceRow: rowNum,
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

    if (isSkippableRow(rawLabel)) { result.skippedRows++; continue; }

    const rowChapterId = chapterIdCol ? String(row.getCell(chapterIdCol).value ?? '').trim() : '';
    const rowSectionId = sectionIdCol ? String(row.getCell(sectionIdCol).value ?? '').trim() : '';

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
        hasAmbiguousMatch = true;
        result.warnings.push(`Row ${r}: Chapter "${rawLabel}" matched ambiguously to "${chRes.match.title}" (score ${(chRes.score * 100).toFixed(0)}%)`);
      }
      currentChapter = { id: chRes.match.id, module_id: chRes.match.module_id };
      processCells(row, r, chRes.match.id, chRes.match.module_id, null);
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
        hasAmbiguousMatch = true;
        result.warnings.push(`Row ${r}: Section "${cleanLabel}" matched ambiguously to "${secRes.match.name}" (score ${(secRes.score * 100).toFixed(0)}%)`);
      }
      processCells(row, r, currentChapter.id, currentChapter.module_id, secRes.match.id);
    }
  }

  // ── Step 4: Preflight validation ─────────────────────────────────

  // 4a: Abort if no valid rows
  if (rows.length === 0) {
    result.errors.push('No valid data rows found in file. Existing data was NOT changed.');
    return result;
  }

  // 4b: Abort Replace All if ambiguous matches detected
  if (replaceAll && hasAmbiguousMatch) {
    result.errors.push(
      'Import blocked — ambiguous chapter/section matches detected. ' +
      'For Replace All, every row must match exactly one chapter/section. ' +
      'Use the downloaded template with hidden ID columns for reliable matching. ' +
      'No data was changed.'
    );
    return result;
  }

  // 4c: Detect duplicate resolved keys (same chapter+section+component+exam)
  const keyCount = new Map<string, number[]>(); // key → source rows
  for (const r of rows) {
    const k = rowKey(r);
    const existing = keyCount.get(k) || [];
    existing.push(r.sourceRow);
    keyCount.set(k, existing);
  }
  const duplicateKeys = [...keyCount.entries()].filter(([, rows]) => rows.length > 1);
  if (duplicateKeys.length > 0) {
    // Deduplicate: keep last occurrence (latest row wins)
    const seen = new Map<string, number>(); // key → index in rows[]
    const deduped: ParsedRow[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const k = rowKey(rows[i]);
      if (!seen.has(k)) {
        seen.set(k, i);
        deduped.unshift(rows[i]);
      }
    }
    const removedCount = rows.length - deduped.length;
    rows.length = 0;
    rows.push(...deduped);
    result.warnings.push(
      `${removedCount} duplicate row(s) detected and auto-merged (last value kept). ` +
      `Affected rows: ${duplicateKeys.map(([, r]) => r.join(',')).join('; ')}`
    );
  }

  // ── Step 5: Safe DB operations ───────────────────────────────────
  const affectedChapterIds = [...new Set(rows.map(r => r.chapter_id))];

  // Load existing configs for ALL affected chapters
  const existingMap = new Map<string, string>(); // composite key → id
  if (affectedChapterIds.length > 0) {
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

  // Separate into updates vs inserts
  const toInsert: any[] = [];
  const toUpdate: { id: string; inclusion_level: string; question_types: string[] }[] = [];
  const touchedExistingIds = new Set<string>(); // track which existing rows we touched

  for (const r of rows) {
    const key = rowKey(r);
    const existingId = existingMap.get(key);
    if (existingId) {
      toUpdate.push({ id: existingId, inclusion_level: r.inclusion_level, question_types: r.question_types });
      touchedExistingIds.add(existingId);
    } else {
      toInsert.push({
        chapter_id: r.chapter_id, module_id: r.module_id, section_id: r.section_id,
        exam_type: r.exam_type, component_type: r.component_type,
        inclusion_level: r.inclusion_level, question_types: r.question_types,
      });
    }
  }

  // Execute updates
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('chapter_blueprint_config')
      .update({ inclusion_level: u.inclusion_level, question_types: u.question_types })
      .eq('id', u.id);
    if (error) result.errors.push(`Update failed: ${error.message}`);
    else result.upserted++;
  }

  // Execute inserts in chunks
  for (let i = 0; i < toInsert.length; i += 200) {
    const batch = toInsert.slice(i, i + 200);
    const { error } = await supabase.from('chapter_blueprint_config').insert(batch);
    if (error) {
      result.errors.push(`Insert failed (rows ${i + 1}-${i + batch.length}): ${error.message}`);
    } else {
      result.upserted += batch.length;
    }
  }

  // Replace All: only delete stale rows AFTER successful writes
  if (replaceAll && result.upserted > 0) {
    // Stale = existing rows for affected chapters that we did NOT update
    const staleIds: string[] = [];
    for (const [key, id] of existingMap) {
      const chId = key.split('|')[0];
      if (affectedChapterIds.includes(chId) && !touchedExistingIds.has(id)) {
        staleIds.push(id);
      }
    }
    if (staleIds.length > 0) {
      for (let i = 0; i < staleIds.length; i += 200) {
        const batch = staleIds.slice(i, i + 200);
        const { error, count } = await supabase
          .from('chapter_blueprint_config')
          .delete()
          .in('id', batch);
        if (error) result.errors.push(`Cleanup of stale rows failed: ${error.message}`);
        else result.replaced += count ?? batch.length;
      }
    }
  } else if (replaceAll && result.upserted === 0) {
    // All writes failed — don't delete anything
    result.errors.push('All inserts/updates failed. Existing data was NOT deleted to prevent data loss.');
  }

  // Handle clears in merge mode
  if (!replaceAll) {
    const toDelete: string[] = [];
    for (const c of clears) {
      const key = rowKey(c);
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
