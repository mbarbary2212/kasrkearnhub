import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAttemptDetails, type PastChapterAttempt } from '@/hooks/usePastTestResults';
import type { Json } from '@/integrations/supabase/types';

interface AttemptDetailsModalProps {
  attempt: PastChapterAttempt | null;
  open: boolean;
  onClose: () => void;
}

function renderSelectedAnswer(selected: Json, options: string[] | null): string {
  if (selected == null) return '— No answer —';
  if (typeof selected === 'string') {
    if (options && /^[a-zA-Z]$/.test(selected)) {
      const idx = selected.toLowerCase().charCodeAt(0) - 97;
      if (options[idx]) return `${selected.toUpperCase()}. ${options[idx]}`;
    }
    return selected;
  }
  if (typeof selected === 'object') {
    return JSON.stringify(selected);
  }
  return String(selected);
}

function renderCorrectAnswer(correctKey: string | null, options: string[] | null): string {
  if (!correctKey) return '—';
  if (options && /^[a-zA-Z]$/.test(correctKey)) {
    const idx = correctKey.toLowerCase().charCodeAt(0) - 97;
    if (options[idx]) return `${correctKey.toUpperCase()}. ${options[idx]}`;
  }
  return correctKey;
}

export function AttemptDetailsModal({ attempt, open, onClose }: AttemptDetailsModalProps) {
  const { data: details, isLoading } = useAttemptDetails(attempt);

  const total = attempt?.total_questions ?? 0;
  const correct = attempt?.correct_count ?? 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const date = attempt?.completed_at || attempt?.created_at;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {attempt?.chapter_title || 'Test Result'}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 pt-2">
            <Badge variant={pct >= 70 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'}>
              {correct}/{total} · {pct}%
            </Badge>
            {attempt && attempt.time_spent_seconds > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
              </Badge>
            )}
            {date && (
              <span className="text-xs text-muted-foreground self-center">
                {format(new Date(date), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !details || details.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No question details available for this attempt.
            </div>
          ) : (
            <div className="space-y-3">
              {details.map((d, idx) => {
                const isCorrect = d.is_correct === true;
                const studentAns = renderSelectedAnswer(d.selected_answer, d.options);
                const correctAns = renderCorrectAnswer(d.correct_answer_key, d.options);
                return (
                  <div
                    key={d.id}
                    className={`rounded-lg border p-4 ${
                      isCorrect
                        ? 'bg-success/5 border-success/30'
                        : 'bg-destructive/5 border-destructive/30'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      )}
                      <p className="font-medium text-sm">
                        Q{idx + 1}. {d.question_text || '(Question text unavailable)'}
                      </p>
                    </div>
                    {d.options && d.options.length > 0 && (
                      <ul className="text-xs text-muted-foreground ml-6 mb-2 space-y-0.5">
                        {d.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const isThisCorrect = d.correct_answer_key?.toLowerCase() === letter.toLowerCase();
                          return (
                            <li key={i} className={isThisCorrect ? 'text-success font-medium' : ''}>
                              {letter}. {opt}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="ml-6 space-y-1 text-xs">
                      <p>
                        <span className="font-medium text-muted-foreground">Your answer: </span>
                        <span className={isCorrect ? 'text-success' : 'text-destructive'}>
                          {studentAns}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p>
                          <span className="font-medium text-muted-foreground">Correct answer: </span>
                          <span className="text-success whitespace-pre-line">{correctAns}</span>
                        </p>
                      )}
                      {d.explanation && (
                        <p className="pt-1 text-muted-foreground italic">{d.explanation}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
