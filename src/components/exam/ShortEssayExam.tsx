import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Send, ListChecks, Loader2 } from 'lucide-react';
import { getExpectedPoints } from '@/types/essayRubric';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShortEssayResult } from './ShortEssayResult';
import type { GradingResult } from '@/types/essayRubric';

interface ShortEssayQuestion {
  id: string;
  title: string;
  question: string;
  rubric_json?: unknown;
  max_points?: number | null;
}

interface ShortEssayExamProps {
  questions: ShortEssayQuestion[];
  onComplete: () => void;
}

export function ShortEssayExam({ questions, onComplete }: ShortEssayExamProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, GradingResult>>({});
  const [grading, setGrading] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = questions[currentIndex];
  const expectedPoints = question ? getExpectedPoints(question.rubric_json) : null;
  const currentAnswer = answers[question?.id] || '';
  const currentResult = results[question?.id];

  const totalAnswered = Object.keys(answers).filter(k => answers[k].trim()).length;
  const totalGraded = Object.keys(results).length;

  const handleSubmit = async () => {
    if (!currentAnswer.trim()) {
      toast.error('Please write your answer first');
      return;
    }

    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grade-short-essay', {
        body: { essay_id: question.id, student_answer: currentAnswer },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(prev => ({ ...prev, [question.id]: data }));
    } catch (err: any) {
      toast.error(err?.message || 'Grading failed. Please try again.');
    } finally {
      setGrading(false);
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = () => {
    setFinished(true);
    onComplete();
  };

  // Summary view when finished
  if (finished) {
    const allResults = questions.map(q => ({
      question: q,
      result: results[q.id],
      answer: answers[q.id] || '',
    }));

    const totalScore = allResults.reduce((sum, r) => sum + (r.result?.score || 0), 0);
    const totalMax = allResults.reduce((sum, r) => sum + (r.result?.max_score || 0), 0);
    const avgPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Short Questions Results</h2>
          <p className="text-4xl font-bold text-primary">{avgPercentage}%</p>
          <p className="text-sm text-muted-foreground">{totalScore}/{totalMax} points</p>
        </div>
        {allResults.map(({ question: q, result, answer }, i) => (
          <div key={q.id} className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Q{i + 1}: {q.title}</h3>
            {result && <ShortEssayResult result={result} essayId={q.id} />}
            {!result && <p className="text-sm text-muted-foreground italic">Not submitted</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Q {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalGraded} graded
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="exam-mode" className="text-xs text-muted-foreground">Exam Mode</Label>
          <Switch
            id="exam-mode"
            checked={examMode}
            onCheckedChange={setExamMode}
            className="h-4 w-7"
          />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">{question.title}</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-foreground whitespace-pre-wrap">{question.question}</p>
        </div>

        {/* Points hint — hidden in exam mode */}
        {!examMode && expectedPoints && (
          <div className="flex justify-center">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
              <ListChecks className="h-3.5 w-3.5" />
              Cover the main key points (≈ {expectedPoints})
            </Badge>
          </div>
        )}
      </div>

      {/* Answer area */}
      {!currentResult ? (
        <div className="space-y-3">
          <Textarea
            value={currentAnswer}
            onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
            placeholder="Type your answer here..."
            rows={6}
            className="text-sm"
            disabled={grading}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={grading || !currentAnswer.trim()} className="gap-2">
              {grading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {grading ? 'Grading...' : 'Submit Answer'}
            </Button>
          </div>
        </div>
      ) : (
        <ShortEssayResult result={currentResult} essayId={question.id} />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        
        {currentIndex === questions.length - 1 ? (
          <Button variant="default" size="sm" onClick={handleFinish}>
            Finish
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={goNext}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
