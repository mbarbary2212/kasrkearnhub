import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, ListChecks, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMarkItemComplete } from '@/hooks/useChapterProgress';
import { getExpectedPoints } from '@/types/essayRubric';
import { useCaseScenarioWithQuestions, useCaseQuestionModelAnswer } from '@/hooks/useCaseScenarios';
import type { CaseScenario } from '@/hooks/useCaseScenarios';

interface CaseScenarioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: CaseScenario[];
  initialIndex: number;
  isAdmin?: boolean;
}

function QuestionAnswerBlock({
  questionId,
  questionText,
  label,
  rubricJson,
  isAdmin,
  chapterId,
  caseId,
  onAnswerRevealed,
}: {
  questionId: string;
  questionText: string;
  label: string;
  rubricJson?: unknown;
  isAdmin: boolean;
  chapterId?: string | null;
  caseId: string;
  onAnswerRevealed: (questionId: string) => void;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const { data: modelAnswer, isLoading } = useCaseQuestionModelAnswer(questionId, showAnswer);
  const expectedPoints = getExpectedPoints(rubricJson);

  const handleToggle = () => {
    const next = !showAnswer;
    setShowAnswer(next);
    if (next) onAnswerRevealed(questionId);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{label}</h4>
        {expectedPoints && (
          <Badge variant="outline" className="gap-1 text-xs">
            <ListChecks className="h-3 w-3" />
            ≈ {expectedPoints} pts
          </Badge>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap">{questionText}</p>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={handleToggle} className="gap-2">
          {showAnswer ? <><EyeOff className="h-4 w-4" />Hide Answer</> : <><Eye className="h-4 w-4" />Show Answer</>}
        </Button>
      </div>

      {showAnswer && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground italic">Loading answer...</p>
          ) : modelAnswer ? (
            <p className="text-sm whitespace-pre-wrap">{modelAnswer}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No model answer provided.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CaseScenarioDetailModal({
  open,
  onOpenChange,
  scenarios,
  initialIndex,
  isAdmin = false,
}: CaseScenarioDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const revealedQuestionsRef = useRef<Map<string, Set<string>>>(new Map());
  const completedCasesRef = useRef<Set<string>>(new Set());
  const { markComplete } = useMarkItemComplete();

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const scenario = scenarios[currentIndex];
  const { data: caseDetail } = useCaseScenarioWithQuestions(scenario?.id);

  const handleAnswerRevealed = (questionId: string) => {
    if (isAdmin || !scenario || !caseDetail) return;

    const caseId = scenario.id;
    if (!revealedQuestionsRef.current.has(caseId)) {
      revealedQuestionsRef.current.set(caseId, new Set());
    }
    const revealed = revealedQuestionsRef.current.get(caseId)!;
    revealed.add(questionId);

    // Mark case complete ONLY when ALL sub-questions are revealed
    const allQuestionIds = caseDetail.questions.map(q => q.id);
    const allRevealed = allQuestionIds.every(id => revealed.has(id));

    if (allRevealed && !completedCasesRef.current.has(caseId) && scenario.chapter_id) {
      markComplete(caseId, 'case_scenario', scenario.chapter_id);
      completedCasesRef.current.add(caseId);
    }
  };

  if (!scenario) return null;

  const questions = caseDetail?.questions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-semibold">Case {currentIndex + 1}</DialogTitle>
            <Badge variant="outline">{scenario.difficulty}</Badge>
            <Badge variant="secondary" className="text-xs">{questions.length} parts</Badge>
            {completedCasesRef.current.has(scenario.id) && (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 py-4 pb-6">
            {/* Clinical Stem */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Clinical Scenario
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{scenario.stem}</p>
              </div>
            </div>

            {/* Sub-Questions */}
            {questions.map((q, i) => (
              <QuestionAnswerBlock
                key={q.id}
                questionId={q.id}
                questionText={q.question_text}
                label={`Part ${String.fromCharCode(65 + i)}`}
                rubricJson={q.rubric_json}
                isAdmin={isAdmin}
                chapterId={scenario.chapter_id}
                caseId={scenario.id}
                onAnswerRevealed={handleAnswerRevealed}
              />
            ))}
          </div>
        </ScrollArea>

        {scenarios.length > 1 && (
          <div className="flex items-center justify-between pt-4 border-t shrink-0">
            <Button variant="outline" size="sm" onClick={() => { setCurrentIndex(i => i - 1); }} disabled={currentIndex === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" />Previous
            </Button>
            <span className="text-sm text-muted-foreground">{currentIndex + 1} of {scenarios.length}</span>
            <Button variant="outline" size="sm" onClick={() => { setCurrentIndex(i => i + 1); }} disabled={currentIndex === scenarios.length - 1}>
              Next<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
