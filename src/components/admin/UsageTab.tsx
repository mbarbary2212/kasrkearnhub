import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Download, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { useStudentUsageOverview, StudentUsageOverviewRow } from '@/hooks/useStudentUsageOverview';
import { exportStudentUsageOverviewToExcel } from '@/lib/exportStudentUsageOverview';
import { StudentUsageReportDialog } from './StudentUsageReportDialog';
import { formatDuration } from '@/lib/formatDuration';
import { toast } from 'sonner';

type SortKey = 'name' | 'last_seen' | 'sessions_30d' | 'active_days_30d' | 'total_time_30d' | 'total_time_all';

export function UsageTab() {
  const { data, isLoading } = useStudentUsageOverview();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'staff'>('student');
  const [sortKey, setSortKey] = useState<SortKey>('total_time_30d');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = (data ?? []).filter((r) => {
      if (roleFilter === 'student' && r.role !== 'student') return false;
      if (roleFilter === 'staff' && r.role === 'student') return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.full_name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = (a.full_name ?? '').localeCompare(b.full_name ?? ''); break;
        case 'last_seen': cmp = new Date(a.last_seen ?? 0).getTime() - new Date(b.last_seen ?? 0).getTime(); break;
        case 'sessions_30d': cmp = a.sessions_30d - b.sessions_30d; break;
        case 'active_days_30d': cmp = a.active_days_30d - b.active_days_30d; break;
        case 'total_time_30d': cmp = a.total_time_30d - b.total_time_30d; break;
        case 'total_time_all': cmp = a.total_time_all - b.total_time_all; break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [data, search, roleFilter, sortKey, sortOrder]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortOrder('desc'); }
  };

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
        {label}
        {sortKey === k && (sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  const handleExport = async () => {
    try {
      await exportStudentUsageOverviewToExcel(rows as StudentUsageOverviewRow[]);
      toast.success('Overview downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Usage Reports
          </h2>
          <p className="text-muted-foreground">
            Time on app, sessions, and most-used modules per student. Click a row for a full report.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle>All users</CardTitle>
              <CardDescription>Aggregated from session and study-time tracking.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="pl-8 w-64" />
              </div>
              <div className="flex rounded-md border">
                {(['student', 'staff', 'all'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setRoleFilter(v)}
                    className={`px-3 py-1.5 text-sm capitalize ${roleFilter === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Button onClick={handleExport} disabled={!rows.length} className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No users match the filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead k="name" label="Name" />
                    <TableHead>Role</TableHead>
                    <SortHead k="last_seen" label="Last seen" />
                    <SortHead k="sessions_30d" label="Sessions 30d" className="text-right" />
                    <SortHead k="active_days_30d" label="Active days 30d" className="text-right" />
                    <SortHead k="total_time_30d" label="Time 30d" className="text-right" />
                    <SortHead k="total_time_all" label="Total time" className="text-right" />
                    <TableHead>Top module</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id} className="cursor-pointer" onClick={() => setSelectedUserId(r.user_id)}>
                      <TableCell>
                        <div className="font-medium">{r.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>
                        {r.role ? <Badge variant="secondary" className="capitalize">{r.role}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.last_seen ? format(new Date(r.last_seen), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">{r.sessions_30d}</TableCell>
                      <TableCell className="text-right">{r.active_days_30d}</TableCell>
                      <TableCell className="text-right">{formatDuration(r.total_time_30d)}</TableCell>
                      <TableCell className="text-right">{formatDuration(r.total_time_all)}</TableCell>
                      <TableCell>
                        {r.top_module_name ? (
                          <div>
                            <div className="text-sm">{r.top_module_name}</div>
                            <div className="text-xs text-muted-foreground">{r.top_module_minutes}m</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(r.user_id)}>
                          View report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StudentUsageReportDialog
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(v) => { if (!v) setSelectedUserId(null); }}
      />
    </div>
  );
}
