import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BarChart3, Users, AlertTriangle, DollarSign, Eye, CheckCircle2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeft, Stethoscope, Filter } from 'lucide-react';
import { useAICaseAttempts, useAICaseSummaryStats, useAICasesInScope, useAICaseAggregates, type AICaseFilters, type AICaseAttemptRow } from '@/hooks/useAICaseAdmin';
import { AICaseTranscriptModal } from './AICaseTranscriptModal';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';
import { useModuleChapters } from '@/hooks/useChapters';

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

interface AICasesAdminTabProps {
  modules?: { id: string; name: string; year_id?: string }[];
}

export function AICasesAdminTab({ modules }: AICasesAdminTabProps) {
  const { isSuperAdmin, isPlatformAdmin, isModuleAdmin } = useAuthContext();
  const canFlag = isSuperAdmin || isPlatformAdmin || isModuleAdmin;

  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('started_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AICaseAttemptRow | null>(null);

  const { data: cases } = useAICasesInScope();
  
  // Fetch chapters for the selected module
  const { data: chapters } = useModuleChapters(selectedModuleId !== 'all' ? selectedModuleId : undefined);

  const filters: AICaseFilters = selectedCaseId ? { caseId: selectedCaseId } : {};
  const { data: attempts, isLoading: attemptsLoading } = useAICaseAttempts(filters);

  // Aggregate stats per case from all attempts (unfiltered)
  const allFilters: AICaseFilters = {};
  const { data: allAttempts } = useAICaseAttempts(allFilters);
  const aggregates = useAICaseAggregates(allAttempts);

  // Filter cases by module, chapter, and flagged status
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    let result = cases;
    if (selectedModuleId !== 'all') {
      result = result.filter((c: any) => c.module_id === selectedModuleId);
    }
    if (selectedChapterId !== 'all') {
      result = result.filter((c: any) => c.chapter_id === selectedChapterId);
    }
    if (showFlaggedOnly) {
      const flaggedCaseIds = new Set(
        (allAttempts || []).filter(a => a.flag_for_review).map(a => a.case_id)
      );
      result = result.filter((c: any) => flaggedCaseIds.has(c.id));
    }
    return result;
  }, [cases, selectedModuleId, selectedChapterId, showFlaggedOnly, allAttempts]);

  // Case detail view
  const selectedCase = selectedCaseId ? filteredCases.find((c: any) => c.id === selectedCaseId) : null;
  const caseStats = useAICaseSummaryStats(attempts);

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

  // ===== CASE DETAIL VIEW =====
  if (selectedCaseId && selectedCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCaseId(null); setPage(0); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{(selectedCase as any).title}</h2>
            <Badge variant="outline" className="capitalize">{(selectedCase as any).level}</Badge>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Total Attempts
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{caseStats.totalAttempts}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", caseStats.avgScore >= 70 ? 'text-green-600' : caseStats.avgScore >= 50 ? 'text-amber-600' : 'text-red-600')}>
                {caseStats.avgScore}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Flagged
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{caseStats.flaggedCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">${caseStats.totalCost.toFixed(2)}</p></CardContent>
          </Card>
        </div>

        {/* Student attempts table */}
        <Card>
          <CardContent className="pt-6">
            {attemptsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading attempts...</p>
            ) : sortedAttempts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">No attempts for this case yet</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
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

  // ===== CASE LIST VIEW =====
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedModuleId} onValueChange={(v) => { setSelectedModuleId(v); setSelectedChapterId('all'); setPage(0); }}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {(modules || []).map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedModuleId !== 'all' && (
          <Select value={selectedChapterId} onValueChange={(v) => { setSelectedChapterId(v); setPage(0); }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All chapters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chapters</SelectItem>
              {(chapters || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
         )}

        <Button
          variant={showFlaggedOnly ? "destructive" : "outline"}
          size="sm"
          onClick={() => { setShowFlaggedOnly(!showFlaggedOnly); setPage(0); }}
          className="gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Flagged Only
        </Button>

        <p className="text-sm text-muted-foreground">
          {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Case cards */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">No AI cases found in the selected scope</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCases.map((c: any) => {
            const agg = aggregates.get(c.id);
            const totalAttempts = agg?.totalAttempts ?? 0;
            const avgScore = agg?.avgScore ?? 0;
            const completionRate = agg?.completionRate ?? 0;
            const flaggedCount = agg?.flaggedCount ?? 0;

            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => { setSelectedCaseId(c.id); setPage(0); }}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{c.title}</h3>
                          <Badge variant="outline" className="capitalize text-[10px] shrink-0">{c.level}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1.5" title="Total attempts">
                        <Users className="w-3.5 h-3.5" />
                        <span>{totalAttempts}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Average score">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span className={cn(
                          avgScore >= 70 ? 'text-green-600' : avgScore >= 50 ? 'text-amber-600' : totalAttempts > 0 ? 'text-red-600' : ''
                        )}>
                          {totalAttempts > 0 ? `${avgScore}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Completion rate">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{totalAttempts > 0 ? `${completionRate}%` : '—'}</span>
                      </div>
                      {flaggedCount > 0 && (
                        <div className="flex items-center gap-1.5 text-destructive" title="Flagged">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{flaggedCount}</span>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
