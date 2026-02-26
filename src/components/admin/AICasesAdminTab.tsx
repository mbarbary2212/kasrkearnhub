import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { BarChart3, Users, AlertTriangle, DollarSign, Search, CalendarIcon, RotateCcw, Eye, CheckCircle2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useAICaseAttempts, useAICaseSummaryStats, useAICasesInScope, type AICaseFilters, type AICaseAttemptRow } from '@/hooks/useAICaseAdmin';
import { AICaseTranscriptModal } from './AICaseTranscriptModal';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

const PAGE_SIZE = 10;

function ScoreBadge({ score, completed }: { score: number; completed: boolean }) {
  if (!completed) return <Badge variant="secondary">—</Badge>;
  const color = score >= 70 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return <Badge className={color}>{Math.round(score)}%</Badge>;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'In progress';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

type SortKey = 'score' | 'duration_seconds' | 'started_at';

export function AICasesAdminTab() {
  const { isSuperAdmin, isPlatformAdmin, isModuleAdmin } = useAuthContext();
  const canFlag = isSuperAdmin || isPlatformAdmin || isModuleAdmin;

  const [filters, setFilters] = useState<AICaseFilters>({});
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('started_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AICaseAttemptRow | null>(null);

  const { data: attempts, isLoading } = useAICaseAttempts(filters);
  const stats = useAICaseSummaryStats(attempts);
  const { data: cases } = useAICasesInScope();

  const sortedAttempts = useMemo(() => {
    if (!attempts) return [];
    return [...attempts].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'score') { av = Number(a.score); bv = Number(b.score); }
      else if (sortKey === 'duration_seconds') { av = a.duration_seconds ?? 0; bv = b.duration_seconds ?? 0; }
      else { av = new Date(a.started_at).getTime(); bv = new Date(b.started_at).getTime(); }
      return sortAsc ? av - bv : bv - av;
    });
  }, [attempts, sortKey, sortAsc]);

  const pagedAttempts = sortedAttempts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedAttempts.length / PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const resetFilters = () => { setFilters({}); setPage(0); };

  const updateFilter = <K extends keyof AICaseFilters>(key: K, value: AICaseFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const scoreColor = stats.avgScore >= 70 ? 'text-green-600' : stats.avgScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.totalAttempts}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Average Score
            </CardTitle>
          </CardHeader>
          <CardContent><p className={cn("text-2xl font-bold", scoreColor)}>{stats.avgScore}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Flagged Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold flex items-center gap-2">
              {stats.flaggedCount}
              {stats.flaggedCount > 0 && <Badge variant="destructive" className="text-xs">{stats.flaggedCount}</Badge>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Case</Label>
              <Select value={filters.caseId || 'all'} onValueChange={(v) => updateFilter('caseId', v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All cases" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cases</SelectItem>
                  {(cases || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Difficulty</Label>
              <Select value={filters.difficulty || 'all'} onValueChange={(v) => updateFilter('difficulty', v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Score</Label>
              <Input type="number" className="w-[80px]" placeholder="0" value={filters.minScore ?? ''} onChange={(e) => updateFilter('minScore', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Score</Label>
              <Input type="number" className="w-[80px]" placeholder="100" value={filters.maxScore ?? ''} onChange={(e) => updateFilter('maxScore', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={filters.flaggedOnly || false} onCheckedChange={(v) => updateFilter('flaggedOnly', v || undefined)} id="flagged-only" />
              <Label htmlFor="flagged-only" className="text-xs">Flagged only</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal", !filters.dateFrom && "text-muted-foreground")} size="sm">
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                    {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filters.dateFrom} onSelect={(d) => updateFilter('dateFrom', d || undefined)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] justify-start text-left font-normal", !filters.dateTo && "text-muted-foreground")} size="sm">
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                    {filters.dateTo ? format(filters.dateTo, 'PP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filters.dateTo} onSelect={(d) => updateFilter('dateTo', d || undefined)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8 w-[180px]" placeholder="Name or email..." value={filters.search || ''} onChange={(e) => updateFilter('search', e.target.value || undefined)} />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="pt-5">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading attempts...</p>
          ) : sortedAttempts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              {Object.values(filters).some(Boolean) ? (
                <>
                  <p className="text-muted-foreground">No results match your filters</p>
                  <Button variant="outline" size="sm" onClick={resetFilters}><RotateCcw className="w-3.5 h-3.5 mr-1" />Reset Filters</Button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">No students have attempted AI cases yet</p>
                </>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('score')}>
                      <span className="flex items-center gap-1">Score <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('duration_seconds')}>
                      <span className="flex items-center gap-1">Time <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead>Turns</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Flagged</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('started_at')}>
                      <span className="flex items-center gap-1">Started <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAttempts.map((a) => {
                    const turnsUsed = Math.ceil((a.message_count || 0) / 2);
                    return (
                      <TableRow
                        key={a.attempt_id}
                        className={cn("cursor-pointer", a.flag_for_review && "border-l-4 border-l-destructive bg-destructive/5")}
                        onClick={() => setSelectedAttempt(a)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{a.student_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{a.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{a.case_title}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{a.case_difficulty}</Badge>
                          </div>
                        </TableCell>
                        <TableCell><ScoreBadge score={Number(a.score)} completed={a.is_completed} /></TableCell>
                        <TableCell className="text-sm">{formatDuration(a.duration_seconds)}</TableCell>
                        <TableCell className="text-sm">{turnsUsed} / {a.max_turns}</TableCell>
                        <TableCell className="text-sm">${Number(a.estimated_cost_usd).toFixed(4)}</TableCell>
                        <TableCell>
                          {a.flag_for_review && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground" title={format(new Date(a.started_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(a.started_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAttempt(a); }}>
                            <Eye className="w-3.5 h-3.5 mr-1" />View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedAttempts.length)} of {sortedAttempts.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AICaseTranscriptModal
        attempt={selectedAttempt}
        open={!!selectedAttempt}
        onOpenChange={(open) => { if (!open) setSelectedAttempt(null); }}
        canFlag={canFlag}
      />
    </div>
  );
}
