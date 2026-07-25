import ExcelJS from 'exceljs';
import type { StudentUsageDetail } from '@/hooks/useStudentUsageDetail';

function sheetName(name: string) {
  return name.replace(/[\\/*?:\[\]]/g, '').slice(0, 28) || 'Report';
}

export async function exportStudentUsageDetailToExcel(detail: StudentUsageDetail) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KalmHub';
  wb.created = new Date();

  const displayName = detail.profile?.full_name || detail.profile?.email || 'student';

  // Summary
  const summary = wb.addWorksheet('Summary');
  summary.columns = [{ header: 'Metric', key: 'k', width: 30 }, { header: 'Value', key: 'v', width: 32 }];
  summary.getRow(1).font = { bold: true };
  const s = detail.summary;
  const rows: [string, string | number | Date | null][] = [
    ['Name', displayName],
    ['Email', detail.profile?.email ?? ''],
    ['Role', detail.profile?.role ?? ''],
    ['First seen', s.first_seen ? new Date(s.first_seen) : ''],
    ['Last seen', s.last_seen ? new Date(s.last_seen) : ''],
    ['Total time all-time (hours)', Math.round((s.total_time_all / 3600) * 10) / 10],
    ['Total time 30d (minutes)', Math.round(s.total_time_30d / 60)],
    ['Total time 7d (minutes)', Math.round(s.total_time_7d / 60)],
    ['Sessions all-time', s.sessions_all],
    ['Sessions 30d', s.sessions_30d],
    ['Active days 30d', s.active_days_30d],
    ['Average session (minutes)', Math.round(s.avg_session_seconds / 60)],
    ['Longest session (minutes)', Math.round(s.longest_session_seconds / 60)],
    ['MCQ attempts 30d', s.mcq_attempts_30d],
    ['MCQ attempts all-time', s.mcq_attempts_all],
  ];
  rows.forEach(([k, v]) => summary.addRow({ k, v }));

  // Daily Activity
  const daily = wb.addWorksheet('Daily Activity', { views: [{ state: 'frozen', ySplit: 1 }] });
  daily.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Minutes', key: 'minutes', width: 12 },
    { header: 'Sessions', key: 'sessions', width: 12 },
  ];
  daily.getRow(1).font = { bold: true };
  detail.dailyMinutes.forEach((d) => daily.addRow(d));

  // Modules
  const modules = wb.addWorksheet('Modules', { views: [{ state: 'frozen', ySplit: 1 }] });
  modules.columns = [
    { header: 'Module', key: 'module_name', width: 30 },
    { header: 'Minutes 30d', key: 'minutes_30d', width: 14 },
    { header: 'Minutes All-time', key: 'minutes_all', width: 18 },
  ];
  modules.getRow(1).font = { bold: true };
  detail.perModule.forEach((m) => modules.addRow(m));

  // Chapters
  const chapters = wb.addWorksheet('Top Chapters', { views: [{ state: 'frozen', ySplit: 1 }] });
  chapters.columns = [
    { header: 'Module', key: 'module_name', width: 26 },
    { header: 'Chapter', key: 'chapter_title', width: 40 },
    { header: 'Minutes', key: 'minutes', width: 12 },
    { header: 'Last Activity', key: 'last_activity', width: 20 },
  ];
  chapters.getRow(1).font = { bold: true };
  detail.topChapters.forEach((c) => {
    const row = chapters.addRow({
      module_name: c.module_name,
      chapter_title: c.chapter_title,
      minutes: c.minutes,
      last_activity: c.last_activity ? new Date(c.last_activity) : null,
    });
    row.getCell('last_activity').numFmt = 'yyyy-mm-dd hh:mm';
  });

  // Activity split
  const split = wb.addWorksheet('Activity Split');
  split.columns = [
    { header: 'Activity', key: 'activity_type', width: 20 },
    { header: 'Minutes', key: 'minutes', width: 12 },
    { header: '% of total', key: 'pct', width: 12 },
  ];
  split.getRow(1).font = { bold: true };
  const total = detail.activitySplit.reduce((a, r) => a + r.minutes, 0) || 1;
  detail.activitySplit.forEach((r) => split.addRow({
    activity_type: r.activity_type,
    minutes: r.minutes,
    pct: Math.round((r.minutes / total) * 1000) / 10,
  }));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = sheetName(displayName).replace(/\s+/g, '_');
  a.href = url;
  a.download = `KalmHub_Usage_${safe}_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
