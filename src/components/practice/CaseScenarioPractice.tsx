import { useState } from 'react';
import { useCaseScenarios, useDeleteCaseScenario } from '@/hooks/useCaseScenarios';
import type { CaseScenario, CaseDifficulty } from '@/types/caseScenario';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, ArrowLeft, Eye, EyeOff, ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CaseScenarioEditModal } from '@/components/admin/CaseScenarioEditModal';

interface Props {
  chapterId?: string;
  topicId?: string;
  canManage?: boolean;
}

const DIFFICULTY_COLORS: Record<CaseDifficulty, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  difficult: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function CaseScenarioPractice({ chapterId, topicId, canManage }: Props) {
  const { data: cases, isLoading } = useCaseScenarios(chapterId || topicId);
  const deleteMutation = useDeleteCaseScenario();
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [activeCase, setActiveCase] = useState<CaseScenario | null>(null);
  const [editingCase, setEditingCase] = useState<CaseScenario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CaseScenario | null>(null);

  const filtered = (cases || []).filter(
    c => difficultyFilter === 'all' || c.difficulty === difficultyFilter
  );

  if (activeCase) {
    return (
      <CasePlayer
        caseData={activeCase}
        onBack={() => setActiveCase(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!cases?.length) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No case scenarios available yet.</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Case scenario deleted');
    } catch {
      toast.error('Failed to delete');
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="difficult">Difficult</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} case{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Case list */}
      <div className="space-y-3">
        {filtered.map(c => (
          <Card
            key={c.id}
            className="hover:border-primary/50 transition-colors group"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setActiveCase(c)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn('text-xs', DIFFICULTY_COLORS[c.difficulty])}>
                    {c.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.questions?.length || 0} question{(c.questions?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  {c.topic?.name && (
                    <span className="text-xs text-muted-foreground">• {c.topic.name}</span>
                  )}
                </div>
                <p className="text-sm line-clamp-2">{c.stem}</p>
              </div>

              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingCase(c)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 ml-3 cursor-pointer" onClick={() => setActiveCase(c)} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit modal */}
      <CaseScenarioEditModal
        caseData={editingCase}
        open={!!editingCase}
        onOpenChange={(open) => { if (!open) setEditingCase(null); }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this case scenario and its questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Case Player (practice mode) ──

function CasePlayer({ caseData, onBack }: { caseData: CaseScenario; onBack: () => void }) {
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const questions = (caseData.questions || []).sort((a, b) => a.display_order - b.display_order);

  const toggleReveal = (questionId: string) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Cases
      </Button>

      {/* Case Stem */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Clinical Scenario</CardTitle>
            <Badge className={cn('text-xs', DIFFICULTY_COLORS[caseData.difficulty])}>
              {caseData.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{caseData.stem}</p>
        </CardContent>
      </Card>

      {/* Questions */}
      {questions.map((q, idx) => {
        const isRevealed = revealedAnswers.has(q.id);
        return (
          <Card key={q.id}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm font-medium pt-0.5">{q.question_text}</p>
              </div>

              {/* Student answer area */}
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Type your answer here..."
                value={userAnswers[q.id] || ''}
                onChange={e => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              />

              {/* Reveal model answer */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleReveal(q.id)}
                  className="gap-2"
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {isRevealed ? 'Hide' : 'Show'} Model Answer
                </Button>

                {isRevealed && q.model_answer && (
                  <div className="mt-3 p-3 rounded-md bg-accent/50 border border-border">
                    <p className="text-sm font-medium text-primary mb-1">
                      Model Answer
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{q.model_answer}</p>
                    {q.explanation && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Explanation</p>
                        <p className="text-sm whitespace-pre-wrap">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {questions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No questions available for this case.
        </div>
      )}
    </div>
  );
}
