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
  chapters: { id: string; chapter_number: number; title: string }[],
  configs: ChapterBlueprintConfig[],
  moduleName: string,
) {
  const cfgMap = new Map<string, ChapterBlueprintConfig>();
  for (const c of configs) {
    cfgMap.set(configKey(c.chapter_id, c.section_id, c.component_type), c);
  }

  // Fetch section names for all chapters that have section configs
  const chapterIdsWithSections = [...new Set(configs.filter(c => c.section_id).map(c => c.chapter_id))];
  const sectionNameMap = new Map<string, { name: string; section_number: string | null }>();
  if (chapterIdsWithSections.length > 0) {
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, section_number')
      .in('chapter_id', chapterIdsWithSections);
    if (sections) {
      for (const s of sections) {
        sectionNameMap.set(s.id, { name: s.name, section_number: s.section_number });
      }
    }
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Blueprint');

  // Header
  const headers = ['Chapter', ...COMPONENT_COLUMNS.map(c => c.label)];
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = { bottom: { style: 'thin' } };
    cell.alignment = { horizontal: 'center' };
  });
  headerRow.getCell(1).alignment = { horizontal: 'left' };

  // Data rows
  for (const ch of chapters) {
    const rowData = [`Ch ${ch.chapter_number}: ${ch.title}`];
    const levels: (string | undefined)[] = [];
    for (const col of COMPONENT_COLUMNS) {
      const cfg = cfgMap.get(configKey(ch.id, null, col.key));
      const lv = cfg?.inclusion_level;
      rowData.push(lv ? levelText(lv, cfg?.question_types) : '');
      levels.push(lv);
    }
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

    // Section rows from configs
    const sectionConfigs = configs.filter(c => c.chapter_id === ch.id && c.section_id);
    const sectionIds = [...new Set(sectionConfigs.map(c => c.section_id!))];
    for (const secId of sectionIds) {
      const secInfo = sectionNameMap.get(secId);
      const secLabel = secInfo
        ? `  → ${secInfo.section_number ? secInfo.section_number + '. ' : ''}${secInfo.name}`
        : `  → Section`;
      const secRowData = [secLabel];
      const secLevels: (string | undefined)[] = [];
      for (const col of COMPONENT_COLUMNS) {
        const cfg = cfgMap.get(configKey(ch.id, secId, col.key));
        const lv = cfg?.inclusion_level;
        secRowData.push(lv ? levelText(lv, cfg?.question_types) : '');
        secLevels.push(lv);
      }
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
  for (let i = 2; i <= headers.length; i++) {
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
