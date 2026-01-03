import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface MockExamSettings {
  id: string;
  module_id: string;
  question_count: number;
  seconds_per_question: number;
  created_at: string;
  updated_at: string;
}

export interface MockExamGlobalSettings {
  id: string;
  default_question_count: number;
  default_seconds_per_question: number;
}

export interface MockExamAttempt {
  id: string;
  user_id: string;
  module_id: string;
  question_ids: string[];
  user_answers: Record<string, string>;
  score: number;
  total_questions: number;
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number | null;
  is_completed: boolean;
  created_at: string;
}

// Fetch module-specific exam settings
export function useMockExamSettings(moduleId?: string) {
  return useQuery({
    queryKey: ['mock-exam-settings', moduleId],
    queryFn: async () => {
      // First try module-specific settings
      const { data: moduleSettings, error: moduleError } = await supabase
        .from('mock_exam_settings')
        .select('*')
        .eq('module_id', moduleId!)
        .maybeSingle();

      if (moduleError) throw moduleError;
      
      if (moduleSettings) {
        return moduleSettings as MockExamSettings;
      }

      // Fallback to global settings
      const { data: globalSettings, error: globalError } = await supabase
        .from('mock_exam_global_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (globalError) throw globalError;

      // Return a mock settings object with global defaults
      return {
        id: 'global',
        module_id: moduleId!,
        question_count: globalSettings?.default_question_count ?? 50,
        seconds_per_question: globalSettings?.default_seconds_per_question ?? 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as MockExamSettings;
    },
    enabled: !!moduleId,
  });
}

// Fetch user's previous attempts for a module
export function useMockExamAttempts(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['mock-exam-attempts', moduleId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select('*')
        .eq('module_id', moduleId!)
        .eq('user_id', user!.id)
        .eq('is_completed', true)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        question_ids: row.question_ids || [],
        user_answers: (row.user_answers as Record<string, string>) || {},
      })) as MockExamAttempt[];
    },
    enabled: !!moduleId && !!user?.id,
  });
}

// Create a new exam attempt
export function useCreateMockExamAttempt() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ moduleId, questionIds }: { moduleId: string; questionIds: string[] }) => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .insert({
          user_id: user!.id,
          module_id: moduleId,
          question_ids: questionIds,
          total_questions: questionIds.length,
          user_answers: {},
          score: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      toast({ title: 'Error starting exam', description: error.message, variant: 'destructive' });
    },
  });
}

// Submit exam attempt
export function useSubmitMockExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      attemptId, 
      userAnswers, 
      score,
      durationSeconds,
      moduleId,
    }: { 
      attemptId: string; 
      userAnswers: Record<string, string>; 
      score: number;
      durationSeconds: number;
      moduleId: string;
    }) => {
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .update({
          user_answers: userAnswers as unknown as Json,
          score,
          submitted_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          is_completed: true,
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mock-exam-attempts', variables.moduleId] });
      toast({ title: 'Exam submitted successfully!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting exam', description: error.message, variant: 'destructive' });
    },
  });
}

// Admin: Update module exam settings
export function useUpdateMockExamSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      questionCount, 
      secondsPerQuestion 
    }: { 
      moduleId: string; 
      questionCount: number; 
      secondsPerQuestion: number;
    }) => {
      const { data, error } = await supabase
        .from('mock_exam_settings')
        .upsert({
          module_id: moduleId,
          question_count: questionCount,
          seconds_per_question: secondsPerQuestion,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'module_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mock-exam-settings', variables.moduleId] });
      toast({ title: 'Exam settings updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating settings', description: error.message, variant: 'destructive' });
    },
  });
}

// Utility: Format duration as MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
