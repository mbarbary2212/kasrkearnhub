import ExcelJS from 'exceljs';
import type { AccessRequest } from '@/hooks/useAccessRequests';

function statusLabel(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round((ms / (1000 * 60 * 60 * 24)) * 10) / 10;
}

export async function exportAccessRequestsToExcel(
  requests: AccessRequest[],
  reviewerNameMap: Record<string, string> = {},
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KalmHub';
  wb.created = new Date();

  // Sheet 1 — Access Requests
  const ws = wb.addWorksheet('Access Requests', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'Full Name', key: 'full_name', width: 28 },
    { header: 'Email', key: 'email', width: 36 },
    { header: 'Job Title', key: 'job_title', width: 22 },
    { header: 'Request Type', key: 'request_type', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Requested On', key: 'created_at', width: 20 },
    { header: 'Reviewed On', key: 'reviewed_at', width: 20 },
    { header: 'Days to Review', key: 'days_to_review', width: 16 },
    { header: 'Reviewed By', key: 'reviewed_by', width: 28 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  headerRow.alignment = { vertical: 'middle' };

  const dateFmt = 'yyyy-mm-dd hh:mm';

  for (const r of requests) {
    const row = ws.addRow({
      full_name: r.full_name,
      email: r.email,
      job_title: r.job_title ?? '',
      request_type: r.request_type,
      status: statusLabel(r.status),
      created_at: r.created_at ? new Date(r.created_at) : null,
      reviewed_at: r.reviewed_at ? new Date(r.reviewed_at) : null,
      days_to_review: daysBetween(r.created_at, r.reviewed_at),
      reviewed_by: r.reviewed_by ? (reviewerNameMap[r.reviewed_by] ?? r.reviewed_by) : '',
      notes: r.notes ?? '',
    });
    row.getCell('created_at').numFmt = dateFmt;
    row.getCell('reviewed_at').numFmt = dateFmt;
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };

  // Sheet 2 — Monthly Summary
  const summary = wb.addWorksheet('Monthly Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  summary.columns = [
    { header: 'Month', key: 'month', width: 14 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Approved', key: 'approved', width: 12 },
    { header: 'Rejected', key: 'rejected', width: 12 },
    { header: 'Pending', key: 'pending', width: 12 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  const buckets = new Map<string, { total: number; approved: number; rejected: number; pending: number }>();
  for (const r of requests) {
    if (!r.created_at) continue;
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.get(key) ?? { total: 0, approved: 0, rejected: 0, pending: 0 };
    b.total += 1;
    if (r.status === 'approved') b.approved += 1;
    else if (r.status === 'rejected') b.rejected += 1;
    else if (r.status === 'pending') b.pending += 1;
    buckets.set(key, b);
  }
  const sortedMonths = [...buckets.keys()].sort();
  for (const m of sortedMonths) {
    const b = buckets.get(m)!;
    summary.addRow({ month: m, ...b });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `KalmHub_Access_Requests_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}