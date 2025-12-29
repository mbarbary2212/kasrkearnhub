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

// Fetch MCQs by module (with optional includeDeleted flag)
export function useModuleMcqs(moduleId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['mcqs', 'module', moduleId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('mcqs')
        .select('*')
        .eq('module_id', moduleId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!moduleId,
  });
}

// Fetch MCQs by chapter (with optional includeDeleted flag)
export function useChapterMcqs(chapterId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['mcqs', 'chapter', chapterId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('mcqs')
        .select('*')
        .eq('chapter_id', chapterId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

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
      // Simple update without .select() to avoid JSON coercion issues
      const { error, count } = await supabase
        .from('mcqs')
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;

      // count can be null if not returned; we proceed with success if no error
      return { moduleId, chapterId };
    },
    onSuccess: (result) => {
      toast({ title: 'MCQ deleted successfully' });
      // Force refetch to confirm deletion
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      console.error('MCQ delete error:', error);
      toast({ 
        title: 'Error deleting MCQ', 
        description: error.message || 'Delete failed. You may not have permission.', 
        variant: 'destructive' 
      });
    },
  });
}

// Restore soft-deleted MCQ
export function useRestoreMcq() {
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
        .update({ is_deleted: false, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId };
    },
    onSuccess: (result) => {
      toast({ title: 'MCQ restored successfully' });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      console.error('MCQ restore error:', error);
      toast({ 
        title: 'Error restoring MCQ', 
        description: error.message || 'Restore failed. You may not have permission.', 
        variant: 'destructive' 
      });
    },
  });
}

// Bulk create MCQs from CSV - uses edge function to bypass RLS
export function useBulkCreateMcqs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      mcqs, 
      moduleId, 
      chapterId 
    }: { 
      mcqs: McqFormData[]; 
      moduleId: string; 
      chapterId?: string | null;
    }) => {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to import MCQs');
      }

      // Call edge function which uses service role key
      const response = await fetch(
        `https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/bulk-import-mcqs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mcqs, moduleId, chapterId }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import MCQs');
      }

      return { moduleId, chapterId, count: mcqs.length };
    },
    onSuccess: (result) => {
      toast({ title: `${result.count} MCQs imported successfully` });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing MCQs', description: error.message, variant: 'destructive' });
    },
  });
}

// Parse CSV text into MCQ data
export function parseMcqCsv(csvText: string): McqFormData[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  
  // Skip header row if it looks like a header
  const startIndex = lines[0]?.toLowerCase().includes('stem') ? 1 : 0;
  
  return lines.slice(startIndex).map(line => {
    // Handle quoted CSV values
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    const [stem, choiceA, choiceB, choiceC, choiceD, choiceE, correctKey, explanation, difficulty] = parts;

    return {
      stem: stem || '',
      choices: [
        { key: 'A' as const, text: choiceA || '' },
        { key: 'B' as const, text: choiceB || '' },
        { key: 'C' as const, text: choiceC || '' },
        { key: 'D' as const, text: choiceD || '' },
        { key: 'E' as const, text: choiceE || '' },
      ],
      correct_key: (correctKey || 'A').toUpperCase(),
      explanation: explanation || null,
      difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase()) 
        ? difficulty.toLowerCase() as 'easy' | 'medium' | 'hard' 
        : null),
    };
  });
}
