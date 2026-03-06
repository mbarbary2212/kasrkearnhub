/**
 * Excel read/write utilities using exceljs (replaces vulnerable xlsx/sheetjs).
 * All Excel operations should go through this module.
 */
import ExcelJS from 'exceljs';

/**
 * Read an Excel file (ArrayBuffer) and return rows as JSON objects.
 * Uses the first sheet. Column headers become keys.
 */
export async function readExcelToJson(buffer: ArrayBuffer, options?: { defval?: string }): Promise<Record<string, any>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) return [];

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '');
  });

  const rows: Record<string, any>[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const obj: Record<string, any> = {};
    let hasValue = false;
    headers.forEach((header, idx) => {
      const cell = row.getCell(idx + 1);
      const val = cell.value;
      if (val !== null && val !== undefined && val !== '') {
        hasValue = true;
        obj[header] = typeof val === 'object' && 'text' in (val as any) ? (val as any).text : val;
      } else {
        obj[header] = options?.defval ?? '';
      }
    });
    if (hasValue) rows.push(obj);
  }
  return rows;
}

/**
 * Read Excel and return raw 2D array (header + data rows).
 */
export async function readExcelToArray(buffer: ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const result: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (values.length < colNumber - 1) values.push('');
      const val = cell.value;
      values.push(val !== null && val !== undefined ? String(typeof val === 'object' && 'text' in (val as any) ? (val as any).text : val) : '');
    });
    result.push(values);
  });
  return result;
}

/**
 * Create and download an Excel file from JSON data.
 */
export async function writeJsonToExcel(data: Record<string, any>[], filename: string, sheetName = 'Sheet1') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);
  data.forEach(row => worksheet.addRow(headers.map(h => row[h] ?? '')));

  // Auto-width columns
  headers.forEach((_, i) => {
    const col = worksheet.getColumn(i + 1);
    let maxLen = 15;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * Create and download an Excel file from a 2D array (aoa = array of arrays).
 */
export async function writeArrayToExcel(sheetData: (string | number | undefined)[][], filename: string, sheetName = 'Sheet1', colWidths?: number[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  sheetData.forEach(row => worksheet.addRow(row.map(v => v ?? '')));

  // Set column widths
  if (colWidths) {
    colWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });
  } else if (sheetData.length > 0) {
    sheetData[0].forEach((_, i) => {
      const maxLen = Math.max(...sheetData.map(row => String(row[i] || '').length), 15);
      worksheet.getColumn(i + 1).width = Math.min(maxLen + 2, 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function downloadBuffer(buffer: ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
