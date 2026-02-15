import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ExamAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  question_type: string;
  answer_mode: string | null;
  selected_key: string | null;
  typed_text: string | null;
  typed_summary: string | null;
  handwriting_data: string | null;
  score: number | null;
  max_score: number | null;
  marking_feedback: Record<string, unknown> | null;
  marked_at: string | null;
  is_finalized: boolean;
  revision_count: number;
  created_at: string;
}

export interface RecheckRequest {
  id: string;
  attempt_id: string;
  answer_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Fetch all answers for a specific attempt
export function useExamAttemptAnswers(attemptId?: string) {
  return useQuery({
    queryKey: ['exam-attempt-answers', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ExamAttemptAnswer[];
    },
    enabled: !!attemptId,
  });
}

// Admin: Fetch all attempts for a module (joins profiles for student name)
export function useModuleExamAttempts(moduleId?: string, enabled = true) {
  return useQuery({
    queryKey: ['module-exam-attempts', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('module_id', moduleId!)
        .eq('is_completed', true)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId && enabled,
  });
}

// Fetch recheck requests for a module (admin) or user's own
export function useRecheckRequests(moduleId?: string, isAdmin = false) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['recheck-requests', moduleId, isAdmin],
    queryFn: async () => {
      // First get attempt IDs for this module
      let attemptsQuery = supabase
        .from('mock_exam_attempts')
        .select('id')
        .eq('module_id', moduleId!)
        .eq('is_completed', true);

      if (!isAdmin) {
        attemptsQuery = attemptsQuery.eq('user_id', user!.id);
      }

      const { data: attempts, error: attError } = await attemptsQuery;
      if (attError) throw attError;
      if (!attempts || attempts.length === 0) return [];

      const attemptIds = attempts.map(a => a.id);

      const { data, error } = await supabase
        .from('exam_recheck_requests')
        .select('*')
        .in('attempt_id', attemptIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RecheckRequest[];
    },
    enabled: !!moduleId && !!user?.id,
  });
}

// Student: Submit a recheck request
export function useSubmitRecheckRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      attemptId,
      answerId,
      reason,
    }: {
      attemptId: string;
      answerId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('exam_recheck_requests')
        .insert({
          attempt_id: attemptId,
          answer_id: answerId,
          user_id: user!.id,
          reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recheck-requests'] });
      toast({ title: 'Recheck request submitted', description: 'An admin will review your request.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting request', description: error.message, variant: 'destructive' });
    },
  });
}

// Admin: Resolve a recheck request
export function useResolveRecheckRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      adminResponse,
      newScore,
      answerId,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
      adminResponse: string;
      newScore?: number;
      answerId?: string;
    }) => {
      // Update the request
      const { error: reqError } = await supabase
        .from('exam_recheck_requests')
        .update({
          status,
          admin_response: adminResponse,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // If approved and new score provided, update the answer
      if (status === 'approved' && newScore !== undefined && answerId) {
        const { error: ansError } = await supabase
          .from('exam_attempt_answers')
          .update({ score: newScore, marked_at: new Date().toISOString() })
          .eq('id', answerId);

        if (ansError) throw ansError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recheck-requests'] });
      queryClient.invalidateQueries({ queryKey: ['exam-attempt-answers'] });
      toast({ title: 'Recheck request resolved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error resolving request', description: error.message, variant: 'destructive' });
    },
  });
}
