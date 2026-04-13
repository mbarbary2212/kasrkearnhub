import ExcelJS from 'exceljs';
import {
  COMPONENT_COLUMNS,
  configKey,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprintConfig';
import { supabase } from '@/integrations/supabase/client';

function levelText(level: string, questionTypes?: string[]) {
  let text = '';
  switch (level) {
    case 'high': text = 'High'; break;
    case 'average': text = 'Average'; break;
    case 'low': text = 'Low'; break;
    default: return '';
  }
  if (questionTypes && questionTypes.length > 0) {
    text += ` (${questionTypes.join(', ')})`;
  }
  return text;
}

function levelFill(level: string): ExcelJS.Fill | undefined {
  switch (level) {
    case 'high':
      return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCDDDD' } };
    case 'average':
      return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };
    case 'low':
      return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F9ED' } };
    default:
      return undefined;
  }
}

export async function exportBlueprintToExcel(
  chapters: { id: string; chapter_number: number; title: string; module_id: string }[],
  configs: ChapterBlueprintConfig[],
  moduleName: string,
) {
  const cfgMap = new Map<string, ChapterBlueprintConfig>();
  for (const c of configs) {
    cfgMap.set(configKey(c.chapter_id, c.section_id, c.component_type), c);
  }

  // Fetch ALL sections for all chapters
  const chapterIds = chapters.map(ch => ch.id);
  const sectionsByChapter = new Map<string, { id: string; name: string; section_number: string | null }[]>();
  if (chapterIds.length > 0) {
    const { data: sections, error } = await supabase
      .from('sections')
      .select('id, name, section_number, chapter_id, display_order')
      .in('chapter_id', chapterIds)
      .order('display_order', { ascending: true })
      .limit(5000);
    if (error) {
      console.error('Blueprint export: failed to fetch sections', error);
    }
    if (sections) {
      for (const s of sections) {
        const list = sectionsByChapter.get(s.chapter_id) || [];
        list.push({ id: s.id, name: s.name, section_number: s.section_number });
        sectionsByChapter.set(s.chapter_id, list);
      }
    }
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Blueprint');

  // Headers — include hidden ID columns for safe re-import
  const headers = ['Chapter', ...COMPONENT_COLUMNS.map(c => c.label), 'chapter_id', 'section_id'];
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell, colNum) => {
    if (colNum <= COMPONENT_COLUMNS.length + 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = { bottom: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    }
  });
  headerRow.getCell(1).alignment = { horizontal: 'left' };

  // Hide the ID columns
  const chapterIdColIdx = COMPONENT_COLUMNS.length + 2;
  const sectionIdColIdx = COMPONENT_COLUMNS.length + 3;
  ws.getColumn(chapterIdColIdx).hidden = true;
  ws.getColumn(sectionIdColIdx).hidden = true;

  // Data rows
  for (const ch of chapters) {
    const rowData: (string)[] = [`Ch ${ch.chapter_number}: ${ch.title}`];
    const levels: (string | undefined)[] = [];
    for (const col of COMPONENT_COLUMNS) {
      const cfg = cfgMap.get(configKey(ch.id, null, col.key));
      const lv = cfg?.inclusion_level;
      rowData.push(lv ? levelText(lv, cfg?.question_types) : '');
      levels.push(lv);
    }
    rowData.push(ch.id); // chapter_id
    rowData.push('');     // section_id (null for chapter rows)

    const row = ws.addRow(rowData);
    row.getCell(1).font = { bold: true };

    levels.forEach((lv, i) => {
      if (lv) {
        const cell = row.getCell(i + 2);
        const fill = levelFill(lv);
        if (fill) cell.fill = fill;
        cell.alignment = { horizontal: 'center' };
      }
    });

    // Section rows
    const chapterSections = sectionsByChapter.get(ch.id) || [];
    for (const sec of chapterSections) {
      const secLabel = `  → ${sec.section_number ? sec.section_number + '. ' : ''}${sec.name}`;
      const secRowData: string[] = [secLabel];
      const secLevels: (string | undefined)[] = [];
      for (const col of COMPONENT_COLUMNS) {
        const cfg = cfgMap.get(configKey(ch.id, sec.id, col.key));
        const lv = cfg?.inclusion_level;
        secRowData.push(lv ? levelText(lv, cfg?.question_types) : '');
        secLevels.push(lv);
      }
      secRowData.push(ch.id); // chapter_id
      secRowData.push(sec.id); // section_id

      const secRow = ws.addRow(secRowData);
      secRow.getCell(1).font = { italic: true };
      secLevels.forEach((lv, i) => {
        if (lv) {
          const cell = secRow.getCell(i + 2);
          const fill = levelFill(lv);
          if (fill) cell.fill = fill;
          cell.alignment = { horizontal: 'center' };
        }
      });
    }
  }

  // Column widths
  ws.getColumn(1).width = 40;
  for (let i = 2; i <= COMPONENT_COLUMNS.length + 1; i++) {
    ws.getColumn(i).width = 14;
  }

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}_Blueprint.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
