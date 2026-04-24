import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useMaterialEngagement,
  useEnrolledStudentCount,
  classifyVideo,
  classifyMcq,
  STATUS_LABELS,
  type VideoEngagementRow,
  type McqEngagementRow,
  type ChapterEngagementRow,
  type EngagementStatus,
} from '@/hooks/admin/useMaterialEngagement';

interface Props {
  modules: { id: string; name: string }[];
}

function StatusPill({ status }: { status: EngagementStatus }) {
  const s = STATUS_LABELS[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', s.className)}>
      <span>{s.emoji}</span>{s.label}
    </span>
  );
}

export function MaterialEngagementTab({ modules }: Props) {
  const navigate = useNavigate();
  const [moduleId, setModuleId] = useState<string>('all');
  const [days, setDays] = useState<number>(30);

  const effectiveModule = moduleId === 'all' ? null : moduleId;
  const { data: totalStudents = 0 } = useEnrolledStudentCount(days);

  const videosQ = useMaterialEngagement<VideoEngagementRow>('videos', effectiveModule, days, totalStudents);
  const mcqsQ = useMaterialEngagement<McqEngagementRow>('mcqs', effectiveModule, days, totalStudents);
  const chaptersQ = useMaterialEngagement<ChapterEngagementRow>('chapters', effectiveModule, days, totalStudents);

  const medianMcqTime = useMemo(() => {
    const times = (mcqsQ.data || []).map(r => Number(r.avg_time_seconds)).filter(t => t > 0).sort((a, b) => a - b);
    return times.length ? times[Math.floor(times.length / 2)] : 0;
  }, [mcqsQ.data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Module</p>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Range</p>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{totalStudents}</span> active students (denominator)
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList>
          <TabsTrigger value="videos">Videos / Lectures</TabsTrigger>
          <TabsTrigger value="mcqs">MCQs</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-3">
          {videosQ.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Lecture</TableHead><TableHead>Chapter</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Avg watched</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(videosQ.data || []).slice(0, 100).map(r => {
                    const reach = totalStudents > 0 ? Math.round((r.unique_viewers / totalStudents) * 100) : 0;
                    const status = classifyVideo(r, totalStudents);
                    return (
                      <TableRow key={r.material_id} className="cursor-pointer"
                        onClick={() => r.module_id && r.chapter_id && navigate(`/module/${r.module_id}/chapter/${r.chapter_id}?section=resources&subtab=lectures`)}>
                        <TableCell className="max-w-[280px] truncate font-medium">{r.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">{r.chapter_title || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{reach}% <span className="text-[10px] text-muted-foreground">({r.unique_viewers})</span></TableCell>
                        <TableCell className="text-right tabular-nums">{Number(r.completion_rate)}%</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(r.avg_percent_watched)}%</TableCell>
                        <TableCell><StatusPill status={status} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {(videosQ.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data in this range</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="mcqs" className="mt-3">
          {mcqsQ.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Question</TableHead><TableHead>Chapter</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Avg time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(mcqsQ.data || []).slice(0, 100).map(r => {
                    const reach = totalStudents > 0 ? Math.round((r.unique_users / totalStudents) * 100) : 0;
                    const status = classifyMcq(r, totalStudents, medianMcqTime);
                    return (
                      <TableRow key={r.material_id} className="cursor-pointer"
                        onClick={() => r.module_id && r.chapter_id && navigate(`/module/${r.module_id}/chapter/${r.chapter_id}?section=practice&subtab=mcqs`)}>
                        <TableCell className="max-w-[320px] truncate text-xs">{r.stem}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-muted-foreground text-xs">{r.chapter_title || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{reach}% <span className="text-[10px] text-muted-foreground">({r.unique_users})</span></TableCell>
                        <TableCell className="text-right tabular-nums">{Number(r.accuracy)}%</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(r.avg_time_seconds)}s</TableCell>
                        <TableCell><StatusPill status={status} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {(mcqsQ.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data in this range</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="chapters" className="mt-3">
          {chaptersQ.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Chapter</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Total minutes</TableHead>
                  <TableHead className="text-right">Avg / student</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(chaptersQ.data || []).slice(0, 100).map(r => (
                    <TableRow key={r.chapter_id} className="cursor-pointer"
                      onClick={() => r.module_id && navigate(`/module/${r.module_id}/chapter/${r.chapter_id}`)}>
                      <TableCell className="max-w-[320px] truncate font-medium">{r.chapter_title}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.unique_students}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(r.total_minutes)}m</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(r.avg_minutes_per_student)}m</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}