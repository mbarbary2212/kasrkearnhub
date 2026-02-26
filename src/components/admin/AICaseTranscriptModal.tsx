import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Clock, MessageSquare, DollarSign, CheckCircle2, Flag, Printer } from 'lucide-react';
import { useAICaseTranscript, useFlagAttempt, type AICaseAttemptRow } from '@/hooks/useAICaseAdmin';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface AICaseTranscriptModalProps {
  attempt: AICaseAttemptRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canFlag?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function ScoreBadge({ score, completed }: { score: number; completed: boolean }) {
  if (!completed) return <Badge variant="secondary">In progress</Badge>;
  const color = score >= 70 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return <Badge className={color}>{Math.round(score)}%</Badge>;
}

export function AICaseTranscriptModal({ attempt, open, onOpenChange, canFlag }: AICaseTranscriptModalProps) {
  const { data: messages, isLoading } = useAICaseTranscript(attempt?.attempt_id ?? null);
  const flagMutation = useFlagAttempt();
  const [flagReason, setFlagReason] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);

  if (!attempt) return null;

  const handleFlag = async () => {
    if (!flagReason.trim()) { toast.error('Please provide a reason'); return; }
    try {
      await flagMutation.mutateAsync({ attemptId: attempt.attempt_id, flagReason });
      toast.success('Attempt flagged');
      setShowFlagForm(false);
      setFlagReason('');
    } catch { toast.error('Failed to flag attempt'); }
  };

  const turnsUsed = Math.ceil((attempt.message_count || 0) / 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {attempt.student_name || 'Unknown Student'}
            <ScoreBadge score={Number(attempt.score)} completed={attempt.is_completed} />
            {attempt.flag_for_review && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Flagged</Badge>}
          </SheetTitle>
          <SheetDescription className="text-left">
            {attempt.case_title} • {formatDistanceToNow(new Date(attempt.started_at), { addSuffix: true })}
          </SheetDescription>
        </SheetHeader>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b shrink-0 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(attempt.duration_seconds)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{turnsUsed} / {attempt.max_turns}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span>${Number(attempt.estimated_cost_usd).toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {attempt.is_completed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Clock className="w-3.5 h-3.5" />}
            <span>{attempt.is_completed ? 'Completed' : 'In progress'}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4">
            {/* Debrief summary */}
            {attempt.debrief_summary && (
              <div className="rounded-lg border bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 p-4">
                <h4 className="text-sm font-semibold text-teal-800 dark:text-teal-300 mb-2">AI Debrief Summary</h4>
                <p className="text-sm text-teal-700 dark:text-teal-400 whitespace-pre-wrap">{attempt.debrief_summary}</p>
              </div>
            )}

            {/* Transcript */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading transcript...</p>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg, i) => {
                  const isStudent = msg.role === 'user';
                  const isSystem = msg.role === 'system';
                  const structured = msg.structured_data as Record<string, unknown> | null;
                  const showTurnDivider = i > 0 && msg.turn_number !== (messages[i - 1]?.turn_number);

                  return (
                    <div key={msg.id}>
                      {showTurnDivider && (
                        <div className="flex items-center gap-2 py-2">
                          <Separator className="flex-1" />
                          <span className="text-[10px] text-muted-foreground font-medium">Turn {msg.turn_number}</span>
                          <Separator className="flex-1" />
                        </div>
                      )}
                      {isSystem ? (
                        <div className="rounded-lg border bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 p-3">
                          <p className="text-xs font-medium text-teal-600 dark:text-teal-400 mb-1">Patient Information</p>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ) : (
                        <div className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-lg p-3 ${
                            isStudent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}>
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {isStudent ? 'Student' : 'Clinical Examiner'}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {structured && (structured as any).type === 'debrief' && (
                              <div className="mt-2 pt-2 border-t border-current/10 text-xs opacity-80">
                                Debrief message
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages found for this attempt.</p>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t p-4 shrink-0 space-y-3">
          {showFlagForm ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Reason for flagging this attempt..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleFlag} disabled={flagMutation.isPending}>
                  <Flag className="w-3.5 h-3.5 mr-1" />Confirm Flag
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowFlagForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {canFlag && !attempt.flag_for_review && (
                <Button size="sm" variant="outline" onClick={() => setShowFlagForm(true)}>
                  <Flag className="w-3.5 h-3.5 mr-1" />Flag for Review
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" />Export
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
