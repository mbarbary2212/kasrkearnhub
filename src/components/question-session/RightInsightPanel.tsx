import { BookOpen } from 'lucide-react';
import { ExplanationCard } from './ExplanationCard';
import { ConfidenceCard } from './ConfidenceCard';
import { QuestionStatsCard } from './QuestionStatsCard';
import { PerformanceStatsCard } from './PerformanceStatsCard';
import { ActionsCard } from './ActionsCard';
import { MaterialReactionRow } from '@/components/shared/MaterialReactionRow';
import type { Mcq } from '@/hooks/useMcqs';
import type { OsceQuestion } from '@/hooks/useOsceQuestions';

interface RightInsightPanelProps {
  isSubmitted: boolean;
  isCorrect: boolean | null;
  wasSkipped: boolean;
  questionId: string;
  questionType: 'mcq' | 'sba' | 'osce';
  question: Mcq | OsceQuestion;
  chapterId?: string;
  moduleId: string;
  chapterAccuracy: { correct: number; total: number; percentage: number } | null;
  onRepeat: () => void;
}

export function RightInsightPanel({
  isSubmitted,
  isCorrect,
  wasSkipped,
  questionId,
  questionType,
  question,
  chapterId,
  moduleId,
  chapterAccuracy,
  onRepeat,
}: RightInsightPanelProps) {
  if (!isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-muted/30">
        <div className="text-center space-y-3 max-w-xs">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Submit your answer to view explanation, statistics, and peer response data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-3 md:p-4 space-y-3 bg-muted/20">
      <ExplanationCard
        questionType={questionType}
        question={question}
        isCorrect={isCorrect}
      />

      <ConfidenceCard questionId={questionId} />

      <QuestionStatsCard
        questionId={questionId}
        questionType={questionType}
        isCorrect={isCorrect}
        wasSkipped={wasSkipped}
        question={question}
      />

      <PerformanceStatsCard
        isCorrect={isCorrect}
        wasSkipped={wasSkipped}
        chapterId={chapterId}
        moduleId={moduleId}
        chapterAccuracy={chapterAccuracy}
      />

      <ActionsCard onRepeat={onRepeat} />

      <MaterialReactionRow
        materialType={questionType}
        materialId={questionId}
        chapterId={chapterId}
        className="justify-center pt-1"
      />
    </div>
  );
}
