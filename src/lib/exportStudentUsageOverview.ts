import ExcelJS from 'exceljs';
import type { StudentUsageOverviewRow } from '@/hooks/useStudentUsageOverview';

export async function exportStudentUsageOverviewToExcel(rows: StudentUsageOverviewRow[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KalmHub';
  wb.created = new Date();

  const ws = wb.addWorksheet('Student Usage', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Full Name', key: 'full_name', width: 28 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Last Seen', key: 'last_seen', width: 20 },
    { header: 'Sessions (30d)', key: 'sessions_30d', width: 14 },
    { header: 'Active Days (30d)', key: 'active_days_30d', width: 16 },
    { header: 'Minutes (7d)', key: 'minutes_7d', width: 14 },
    { header: 'Minutes (30d)', key: 'minutes_30d', width: 14 },
    { header: 'Minutes (all-time)', key: 'minutes_all', width: 18 },
    { header: 'Hours (all-time)', key: 'hours_all', width: 16 },
    { header: 'Top Module', key: 'top_module_name', width: 26 },
    { header: 'Top Module Minutes', key: 'top_module_minutes', width: 18 },
    { header: 'MCQ Attempts (30d)', key: 'mcq_attempts_30d', width: 18 },
  ];
  const h = ws.getRow(1);
  h.font = { bold: true };
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  for (const r of rows) {
    const row = ws.addRow({
      full_name: r.full_name ?? '',
      email: r.email,
      role: r.role ?? '',
      status: r.status,
      last_seen: r.last_seen ? new Date(r.last_seen) : null,
      sessions_30d: r.sessions_30d,
      active_days_30d: r.active_days_30d,
      minutes_7d: Math.round(r.total_time_7d / 60),
      minutes_30d: Math.round(r.total_time_30d / 60),
      minutes_all: Math.round(r.total_time_all / 60),
      hours_all: Math.round((r.total_time_all / 3600) * 10) / 10,
      top_module_name: r.top_module_name ?? '',
      top_module_minutes: r.top_module_minutes,
      mcq_attempts_30d: r.mcq_attempts_30d,
    });
    row.getCell('last_seen').numFmt = 'yyyy-mm-dd hh:mm';
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `KalmHub_Student_Usage_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
