import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface McqChoice {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface Mcq {
  id: string;
  module_id: string;
  chapter_id: string | null;
  stem: string;
  choices: McqChoice[];
  correct_key: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  display_order: number;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface McqFormData {
  stem: string;
  choices: McqChoice[];
  correct_key: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

// Helper to convert DB row to Mcq type
function mapDbRowToMcq(row: Record<string, unknown>): Mcq {
  return {
    id: row.id as string,
    module_id: row.module_id as string,
    chapter_id: row.chapter_id as string | null,
    stem: row.stem as string,
    choices: row.choices as McqChoice[],
    correct_key: row.correct_key as string,
    explanation: row.explanation as string | null,
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard' | null,
    display_order: row.display_order as number,
    is_deleted: row.is_deleted as boolean,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    created_at: row.created_at as string,
  };
}

// Fetch MCQs by module
export function useModuleMcqs(moduleId?: string) {
  return useQuery({
    queryKey: ['mcqs', 'module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcqs')
        .select('*')
        .eq('module_id', moduleId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!moduleId,
  });
}

// Fetch MCQs by chapter
export function useChapterMcqs(chapterId?: string) {
  return useQuery({
    queryKey: ['mcqs', 'chapter', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcqs')
        .select('*')
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!chapterId,
  });
}

// Create MCQ
export function useCreateMcq() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: McqFormData & { module_id: string; chapter_id?: string | null }) => {
      const { error } = await supabase.from('mcqs').insert({
        module_id: data.module_id,
        chapter_id: data.chapter_id || null,
        stem: data.stem,
        choices: data.choices as unknown as Json,
        correct_key: data.correct_key,
        explanation: data.explanation,
        difficulty: data.difficulty,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'MCQ added successfully' });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', variables.module_id] });
      if (variables.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', variables.chapter_id] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding MCQ', description: error.message, variant: 'destructive' });
    },
  });
}

// Update MCQ
export function useUpdateMcq() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data, moduleId, chapterId }: { 
      id: string; 
      data: McqFormData; 
      moduleId: string;
      chapterId?: string | null;
    }) => {
      const { error } = await supabase
        .from('mcqs')
        .update({
          stem: data.stem,
          choices: data.choices as unknown as Json,
          correct_key: data.correct_key,
          explanation: data.explanation,
          difficulty: data.difficulty,
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId };
    },
    onSuccess: (result) => {
      toast({ title: 'MCQ updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating MCQ', description: error.message, variant: 'destructive' });
    },
  });
}

// Soft delete MCQ
export function useDeleteMcq() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, moduleId, chapterId }: { 
      id: string; 
      moduleId: string;
      chapterId?: string | null;
    }) => {
      const { error } = await supabase
        .from('mcqs')
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId };
    },
    onSuccess: (result) => {
      toast({ title: 'MCQ deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting MCQ', description: error.message, variant: 'destructive' });
    },
  });
}
