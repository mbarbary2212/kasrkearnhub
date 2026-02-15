import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExamAttemptAnswers, useRecheckRequests } from '@/hooks/useExamResults';
import { MockExamResults } from '@/components/exam/MockExamResults';
import { EssayResultsSection } from '@/components/exam/EssayResultsSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { formatDuration } from '@/hooks/useMockExam';
import { Mcq } from '@/hooks/useMcqs';
import { ModuleChapter } from '@/hooks/useChapters';

export default function ExamResultsPage() {
  const { moduleId, attemptId } = useParams<{ moduleId: string; attemptId: string }>();
  const navigate = useNavigate();

  // Fetch the attempt
  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['exam-attempt', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select('*')
        .eq('id', attemptId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!attemptId,
  });

  // Fetch answers
  const { data: answers, isLoading: answersLoading } = useExamAttemptAnswers(attemptId);

  // Fetch module info
  const { data: module } = useQuery({
    queryKey: ['module-name', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('name')
        .eq('id', moduleId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  // Fetch chapters
  const { data: chapters } = useQuery({
    queryKey: ['module-chapters-results', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('*')
        .eq('module_id', moduleId!)
        .order('chapter_number');
      if (error) throw error;
      return data as ModuleChapter[];
    },
    enabled: !!moduleId,
  });

  // Fetch MCQ questions for this attempt
  const mcqQuestionIds = answers?.filter(a => a.question_type === 'mcq').map(a => a.question_id) || [];
  const { data: mcqs } = useQuery({
    queryKey: ['mcq-questions-results', mcqQuestionIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcqs')
        .select('*')
        .in('id', mcqQuestionIds);
      if (error) throw error;
      return (data || []).map(q => ({
        ...q,
        choices: Array.isArray(q.choices) ? q.choices : [],
      })) as unknown as Mcq[];
    },
    enabled: mcqQuestionIds.length > 0,
  });

  // Fetch essays for this attempt
  const essayQuestionIds = answers?.filter(a => a.question_type === 'essay').map(a => a.question_id) || [];
  const { data: essays } = useQuery({
    queryKey: ['essay-questions-results', essayQuestionIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, title, question, model_answer, keywords')
        .in('id', essayQuestionIds);
      if (error) throw error;
      return data || [];
    },
    enabled: essayQuestionIds.length > 0,
  });

  const { data: recheckRequests } = useRecheckRequests(moduleId);

  const isLoading = attemptLoading || answersLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!attempt || !answers) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto p-4 text-center">
          <p className="text-muted-foreground">Attempt not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Module
          </Button>
        </div>
      </MainLayout>
    );
  }

  const userAnswers = (attempt.user_answers as Record<string, string>) || {};
  const mcqAnswers = answers.filter(a => a.question_type === 'mcq');
  const essayAnswers = answers.filter(a => a.question_type === 'essay');

  // Calculate MCQ score
  const mcqScore = mcqs ? mcqs.filter(q => userAnswers[q.id] === q.correct_key).length : 0;

  // Calculate essay total score
  const essayTotalScore = essayAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
  const essayMaxScore = essayAnswers.reduce((sum, a) => sum + (a.max_score || 0), 0);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <MockExamResults
          moduleId={moduleId!}
          moduleName={module?.name || 'Module'}
          questions={mcqs || []}
          userAnswers={userAnswers}
          score={mcqScore}
          totalQuestions={mcqAnswers.length}
          durationSeconds={attempt.duration_seconds || 0}
          chapters={chapters || []}
          essayScore={essayTotalScore}
          essayMaxScore={essayMaxScore}
        />

        <EssayResultsSection
          essays={essays || []}
          essayAnswers={essayAnswers}
          attemptId={attemptId!}
          recheckRequests={recheckRequests || []}
        />
      </div>
    </MainLayout>
  );
}
