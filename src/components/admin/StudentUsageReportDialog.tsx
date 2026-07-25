import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useStudentUsageDetail } from '@/hooks/useStudentUsageDetail';
import { formatDuration } from '@/lib/formatDuration';
import { exportStudentUsageDetailToExcel } from '@/lib/exportStudentUsageDetail';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Props {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ACTIVITY_COLORS: Record<string, string> = {
  reading: '#3b82f6',
  watching: '#10b981',
  practicing: '#f59e0b',
  cases: '#8b5cf6',
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xl font-bold mt-0.5">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function StudentUsageReportDialog({ userId, open, onOpenChange }: Props) {
  const { data, isLoading } = useStudentUsageDetail(open ? userId : null);

  const handleExport = async () => {
    if (!data) return;
    try {
      await exportStudentUsageDetailToExcel(data);
      toast.success('Report downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  const s = data?.summary;
  const name = data?.profile?.full_name || data?.profile?.email || 'Student';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            Usage report — {name}
            {data?.profile?.role && <Badge variant="secondary" className="capitalize">{data.profile.role}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading || !data ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total time (all)" value={formatDuration(s!.total_time_all)} />
                <StatCard label="Time 30d" value={formatDuration(s!.total_time_30d)} sub={`${s!.total_time_7d ? formatDuration(s!.total_time_7d) : '0m'} in 7d`} />
                <StatCard label="Sessions 30d" value={String(s!.sessions_30d)} sub={`${s!.sessions_all} all-time`} />
                <StatCard label="Active days 30d" value={String(s!.active_days_30d)} sub={`Avg ${formatDuration(s!.avg_session_seconds)} / session`} />
                <StatCard label="Longest session" value={formatDuration(s!.longest_session_seconds)} />
                <StatCard label="MCQ attempts 30d" value={String(s!.mcq_attempts_30d)} sub={`${s!.mcq_attempts_all} all-time`} />
                <StatCard label="First seen" value={s!.first_seen ? format(new Date(s!.first_seen), 'MMM d, yyyy') : '—'} />
                <StatCard label="Last seen" value={s!.last_seen ? format(new Date(s!.last_seen), 'MMM d, yyyy') : '—'} />
              </div>

              {/* Daily chart */}
              <div>
                <div className="text-sm font-semibold mb-2">Daily minutes (last 30 days)</div>
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <LineChart data={data.dailyMinutes} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ReTooltip />
                      <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Modules + Activity split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-semibold mb-2">Time per module</div>
                  {data.perModule.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No module activity recorded.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module</TableHead>
                          <TableHead className="text-right">30d</TableHead>
                          <TableHead className="text-right">All</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.perModule.map((m) => (
                          <TableRow key={m.module_id}>
                            <TableCell className="font-medium">{m.module_name}</TableCell>
                            <TableCell className="text-right">{m.minutes_30d}m</TableCell>
                            <TableCell className="text-right">{m.minutes_all}m</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Activity split</div>
                  {data.activitySplit.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No activity data.</div>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={data.activitySplit} dataKey="minutes" nameKey="activity_type" innerRadius={40} outerRadius={70} paddingAngle={2}>
                            {data.activitySplit.map((entry, i) => (
                              <Cell key={i} fill={ACTIVITY_COLORS[entry.activity_type] ?? '#94a3b8'} />
                            ))}
                          </Pie>
                          <ReTooltip formatter={(v: any) => `${v} min`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Top chapters */}
              <div>
                <div className="text-sm font-semibold mb-2">Top chapters</div>
                {data.topChapters.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No chapter activity recorded.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Chapter</TableHead>
                        <TableHead className="text-right">Minutes</TableHead>
                        <TableHead>Last activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topChapters.map((c) => (
                        <TableRow key={c.chapter_id}>
                          <TableCell className="text-muted-foreground">{c.module_name}</TableCell>
                          <TableCell className="font-medium">{c.chapter_title}</TableCell>
                          <TableCell className="text-right">{c.minutes}m</TableCell>
                          <TableCell className="text-muted-foreground">
                            {c.last_activity ? format(new Date(c.last_activity), 'MMM d, yyyy') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleExport} disabled={!data} className="gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
