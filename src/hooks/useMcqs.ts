import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLog';
import type { Json } from '@/integrations/supabase/types';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

export interface McqChoice {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export type QuestionFormat = 'mcq' | 'sba';

export interface Mcq {
  id: string;
  module_id: string;
  chapter_id: string | null;
  section_id: string | null;
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
  question_format: QuestionFormat;
  ai_confidence: number | null;
}

export interface McqFormData {
  stem: string;
  choices: McqChoice[];
  correct_key: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  section_id?: string | null;
  question_format?: QuestionFormat;
  original_section_name?: string | null;
  original_section_number?: string | null;
  ai_confidence?: number | null;
}

// Helper to convert DB row to Mcq type
function mapDbRowToMcq(row: Record<string, unknown>): Mcq {
  return {
    id: row.id as string,
    module_id: row.module_id as string,
    chapter_id: row.chapter_id as string | null,
    section_id: row.section_id as string | null,
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
    question_format: (row.question_format as QuestionFormat) ?? 'mcq',
    ai_confidence: (row.ai_confidence as number | null) ?? null,
  };
}

// Fetch MCQs by module (with optional includeDeleted flag)
export function useModuleMcqs(moduleId?: string, includeDeleted = false, format: QuestionFormat = 'mcq') {
  return useQuery({
    queryKey: ['mcqs', 'module', moduleId, { includeDeleted, format }],
    queryFn: async () => {
      let query = supabase
        .from('mcqs')
        .select('*')
        .eq('module_id', moduleId!)
        .eq('question_format', format);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!moduleId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Lightweight count-only hook for chapter MCQs (badges)
export function useChapterMcqCount(chapterId?: string, format: QuestionFormat = 'mcq') {
  return useQuery({
    queryKey: ['mcqs', 'chapter-count', chapterId, format],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('mcqs')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .eq('question_format', format);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// SBA-specific chapter hooks
export function useChapterSbaCount(chapterId?: string) {
  return useChapterMcqCount(chapterId, 'sba');
}

// Fetch MCQs by chapter (with optional includeDeleted flag)
export function useChapterMcqs(chapterId?: string, includeDeleted = false, options?: { enabled?: boolean }, format: QuestionFormat = 'mcq') {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['mcqs', 'chapter', chapterId, { includeDeleted, format }],
    queryFn: async () => {
      let query = supabase
        .from('mcqs')
        .select('*')
        .eq('chapter_id', chapterId!)
        .eq('question_format', format);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!chapterId && enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// SBA-specific chapter hooks
export function useChapterSbas(chapterId?: string, includeDeleted = false, options?: { enabled?: boolean }) {
  return useChapterMcqs(chapterId, includeDeleted, options, 'sba');
}

// Fetch MCQs by topic (with optional includeDeleted flag)
export function useTopicMcqs(topicId?: string, includeDeleted = false, format: QuestionFormat = 'mcq') {
  return useQuery({
    queryKey: ['mcqs', 'topic', topicId, { includeDeleted, format }],
    queryFn: async () => {
      let query = supabase
        .from('mcqs')
        .select('*')
        .eq('topic_id', topicId!)
        .eq('question_format', format);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMcq);
    },
    enabled: !!topicId,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// SBA-specific topic hooks
export function useTopicSbas(topicId?: string, includeDeleted = false) {
  return useTopicMcqs(topicId, includeDeleted, 'sba');
}

// Create MCQ
export function useCreateMcq() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: McqFormData & { 
      module_id: string; 
      chapter_id?: string | null;
      topic_id?: string | null;
    }) => {
      const { data: result, error } = await supabase.from('mcqs').insert({
        module_id: data.module_id,
        chapter_id: data.chapter_id || null,
        topic_id: data.topic_id || null,
        section_id: data.section_id || null,
        stem: data.stem,
        choices: data.choices as unknown as Json,
        correct_key: data.correct_key,
        explanation: data.explanation,
        difficulty: data.difficulty,
        question_format: data.question_format || 'mcq',
        created_by: user?.id,
      }).select('id').single();

      if (error) throw error;
      return { ...data, id: result.id };
    },
    onSuccess: (result) => {
      const label = result.question_format === 'sba' ? 'SBA question' : 'MCQ';
      toast({ title: `${label} added successfully` });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.module_id] });
      if (result.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapter_id] });
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter-count', result.chapter_id] });
      }
      if (result.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topic_id] });
      }
      // Log activity
      logActivity({
        action: 'created_mcq',
        entity_type: 'mcq',
        entity_id: result.id,
        scope: { module_id: result.module_id, chapter_id: result.chapter_id, topic_id: result.topic_id },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding question', description: error.message, variant: 'destructive' });
    },
  });
}

// Update MCQ
export function useUpdateMcq() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data, moduleId, chapterId, topicId }: { 
      id: string; 
      data: McqFormData; 
      moduleId: string;
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('mcqs')
        .update({
          stem: data.stem,
          choices: data.choices as unknown as Json,
          correct_key: data.correct_key,
          explanation: data.explanation,
          difficulty: data.difficulty,
          section_id: data.section_id || null,
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
      return { id, moduleId, chapterId, topicId };
    },
    onSuccess: (result) => {
      toast({ title: 'Question updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topicId] });
      }
      // Log activity
      logActivity({
        action: 'updated_mcq',
        entity_type: 'mcq',
        entity_id: result.id,
        scope: { module_id: result.moduleId, chapter_id: result.chapterId, topic_id: result.topicId },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating question', description: error.message, variant: 'destructive' });
    },
  });
}

// Soft delete MCQ
export function useDeleteMcq() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, moduleId, chapterId, topicId }: { 
      id: string; 
      moduleId: string;
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      // Simple update without .select() to avoid JSON coercion issues
      const { error, count } = await supabase
        .from('mcqs')
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;

      // count can be null if not returned; we proceed with success if no error
      return { id, moduleId, chapterId, topicId };
    },
    onSuccess: (result) => {
      toast({ title: 'Question deleted successfully' });
      // Force refetch to confirm deletion
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topicId] });
      }
      // Log activity
      logActivity({
        action: 'deleted_mcq',
        entity_type: 'mcq',
        entity_id: result.id,
        scope: { module_id: result.moduleId, chapter_id: result.chapterId, topic_id: result.topicId },
      });
    },
    onError: (error: Error) => {
      console.error('MCQ delete error:', error);
      toast({ 
        title: 'Error deleting question', 
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
    mutationFn: async ({ id, moduleId, chapterId, topicId }: { 
      id: string; 
      moduleId: string;
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('mcqs')
        .update({ is_deleted: false, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId, topicId };
    },
    onSuccess: (result) => {
      toast({ title: 'Question restored successfully' });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topicId] });
      }
    },
    onError: (error: Error) => {
      console.error('MCQ restore error:', error);
      toast({ 
        title: 'Error restoring question', 
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
      chapterId,
      topicId,
      questionFormat,
    }: { 
      mcqs: McqFormData[]; 
      moduleId: string; 
      chapterId?: string | null;
      topicId?: string | null;
      questionFormat?: QuestionFormat;
    }) => {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to import MCQs');
      }

      // Call edge function which uses service role key
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/bulk-import-mcqs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mcqs, moduleId, chapterId, topicId, questionFormat }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import MCQs');
      }

      return { moduleId, chapterId, topicId, count: mcqs.length };
    },
    onSuccess: (result) => {
      toast({ title: `${result.count} questions imported successfully` });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topicId] });
      }
      // Log activity
      logActivity({
        action: 'bulk_upload_mcq',
        entity_type: 'mcq',
        scope: { module_id: result.moduleId, chapter_id: result.chapterId, topic_id: result.topicId },
        metadata: { count: result.count, source: 'csv_import' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing questions', description: error.message, variant: 'destructive' });
    },
  });
}

// Bulk update existing MCQs (match by stem, update ai_confidence/difficulty/explanation)
export function useBulkUpdateMcqs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      mcqs, 
      moduleId, 
      chapterId,
      topicId,
    }: { 
      mcqs: McqFormData[]; 
      moduleId: string; 
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to update MCQs');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/bulk-import-mcqs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mcqs, moduleId, chapterId, topicId, mode: 'update' }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update MCQs');
      }

      return { moduleId, chapterId, topicId, count: result.count };
    },
    onSuccess: (result) => {
      toast({ title: `${result.count} question(s) updated successfully` });
      queryClient.invalidateQueries({ queryKey: ['mcqs', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'chapter', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['mcqs', 'topic', result.topicId] });
      }
      logActivity({
        action: 'bulk_update_mcq',
        entity_type: 'mcq',
        scope: { module_id: result.moduleId, chapter_id: result.chapterId, topic_id: result.topicId },
        metadata: { count: result.count, source: 'csv_reimport' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating questions', description: error.message, variant: 'destructive' });
    },
  });
}

// Parse CSV text into MCQ data
export function parseMcqCsv(csvText: string): McqFormData[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Detect header row - check for common header keywords
  const firstLineLower = lines[0].toLowerCase();
  const headerKeywords = ['stem', 'question', 'correct_key', 'answer_key', 'choice_a', 'choicea', 'option_a', 'explanation', 'difficulty'];
  const isHeader = headerKeywords.some(keyword => firstLineLower.includes(keyword));
  
  const startIndex = isHeader ? 1 : 0;
  
  // Helper to normalize correct_key values (handle numeric like "3" -> "C")
  const normalizeCorrectKey = (value: string): string => {
    const trimmed = (value || '').trim().toUpperCase();
    
    // If already a letter A-E, return as-is
    if (/^[A-E]$/.test(trimmed)) {
      return trimmed;
    }
    
    // Convert numeric to letter (1=A, 2=B, 3=C, 4=D, 5=E)
    const numericMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
    if (numericMap[trimmed]) {
      return numericMap[trimmed];
    }
    
    // Default to A if unrecognized
    return 'A';
  };
  
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

    const [stem, choiceA, choiceB, choiceC, choiceD, choiceE, correctKey, explanation, difficulty, _sectionName, _sectionNumber, aiConfidence] = parts;

    // Build choices array and filter out empty choice E
    const allChoices = [
      { key: 'A' as const, text: choiceA || '' },
      { key: 'B' as const, text: choiceB || '' },
      { key: 'C' as const, text: choiceC || '' },
      { key: 'D' as const, text: choiceD || '' },
      { key: 'E' as const, text: choiceE || '' },
    ];
    
    // Filter: keep A-D always, keep E only if it has content
    const filteredChoices = allChoices.filter(c => 
      c.key !== 'E' || c.text.trim() !== ''
    );

    return {
      stem: stem || '',
      choices: filteredChoices,
      correct_key: normalizeCorrectKey(correctKey),
      explanation: explanation || null,
      difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase()) 
        ? difficulty.toLowerCase() as 'easy' | 'medium' | 'hard' 
        : null),
      ai_confidence: aiConfidence ? Math.min(10, Math.max(0, parseInt(aiConfidence, 10))) || null : null,
    };
  });
}
