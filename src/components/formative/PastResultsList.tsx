import { useState } from 'react';
import { format } from 'date-fns';
import { History, Eye, BookOpen, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePastTestResults, type PastChapterAttempt } from '@/hooks/usePastTestResults';
import { AttemptDetailsModal } from './AttemptDetailsModal';

function formatTime(seconds: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function questionTypeLabel(t: string) {
  if (t === 'mcq') return 'MCQ';
  if (t === 'osce') return 'OSCE';
  if (t === 'true_false') return 'True/False';
  return t;
}

interface PastResultsListProps {
  moduleId?: string;
}

export function PastResultsList({ moduleId }: PastResultsListProps) {
  const { data: attempts, isLoading } = usePastTestResults(moduleId);
  const [selected, setSelected] = useState<PastChapterAttempt | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!attempts || attempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Your past test results will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Past Results
            <Badge variant="secondary" className="ml-1 text-xs">{attempts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attempts.map((a) => {
            const total = a.total_questions || 0;
            const correct = a.correct_count || 0;
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            const date = a.completed_at || a.created_at;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full text-left flex items-center justify-between gap-3 p-3 bg-muted/40 hover:bg-muted/70 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {a.chapter_title || 'Chapter'}
                      <span className="text-muted-foreground font-normal"> · {questionTypeLabel(a.question_type)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(date), 'MMM d, yyyy h:mm a')}
                      {a.module_name ? ` · ${a.module_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={pct >= 70 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'} className="gap-1">
                    {pct >= 50 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {correct}/{total} · {pct}%
                  </Badge>
                  {a.time_spent_seconds > 0 && (
                    <Badge variant="outline" className="gap-1 hidden sm:inline-flex">
                      <Clock className="w-3 h-3" />
                      {formatTime(a.time_spent_seconds)}
                    </Badge>
                  )}
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <AttemptDetailsModal
        attempt={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
