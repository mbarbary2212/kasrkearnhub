import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLog';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

export interface TrueFalseQuestion {
  id: string;
  module_id: string;
  chapter_id: string | null;
  section_id: string | null;
  topic_id: string | null;
  statement: string;
  correct_answer: boolean;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  display_order: number;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface TrueFalseFormData {
  statement: string;
  correct_answer: boolean;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  section_id?: string | null;
  original_section_name?: string | null;
  original_section_number?: string | null;
}

// Helper to convert DB row to TrueFalseQuestion type
function mapDbRowToTrueFalse(row: Record<string, unknown>): TrueFalseQuestion {
  return {
    id: row.id as string,
    module_id: row.module_id as string,
    chapter_id: row.chapter_id as string | null,
    section_id: row.section_id as string | null,
    topic_id: row.topic_id as string | null,
    statement: row.statement as string,
    correct_answer: row.correct_answer as boolean,
    explanation: row.explanation as string | null,
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard' | null,
    display_order: row.display_order as number,
    is_deleted: row.is_deleted as boolean,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    created_at: row.created_at as string,
  };
}

// Fetch True/False questions by module
export function useModuleTrueFalseQuestions(moduleId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['true_false', 'module', moduleId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('true_false_questions')
        .select('*')
        .eq('module_id', moduleId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToTrueFalse);
    },
    enabled: !!moduleId,
  });
}

// Lightweight count-only hook for chapter True/False questions (badges)
export function useChapterTrueFalseCount(chapterId?: string) {
  return useQuery({
    queryKey: ['true_false', 'chapter-count', chapterId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('true_false_questions')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Fetch True/False questions by chapter
export function useChapterTrueFalseQuestions(chapterId?: string, includeDeleted = false, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['true_false', 'chapter', chapterId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('true_false_questions')
        .select('*')
        .eq('chapter_id', chapterId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToTrueFalse);
    },
    enabled: !!chapterId && enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Fetch True/False questions by topic
export function useTopicTrueFalseQuestions(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['true_false', 'topic', topicId, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('true_false_questions')
        .select('*')
        .eq('topic_id', topicId!);
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToTrueFalse);
    },
    enabled: !!topicId,
  });
}

// Create True/False question
export function useCreateTrueFalseQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: TrueFalseFormData & { module_id: string; chapter_id?: string | null; topic_id?: string | null }) => {
      const { data: result, error } = await supabase.from('true_false_questions').insert({
        module_id: data.module_id,
        chapter_id: data.chapter_id || null,
        topic_id: data.topic_id || null,
        section_id: data.section_id || null,
        statement: data.statement,
        correct_answer: data.correct_answer,
        explanation: data.explanation,
        difficulty: data.difficulty,
        created_by: user?.id,
      }).select('id').single();

      if (error) throw error;
      return { ...data, id: result.id };
    },
    onSuccess: (result) => {
      toast({ title: 'True/False question added successfully' });
      queryClient.invalidateQueries({ queryKey: ['true_false', 'module', result.module_id] });
      if (result.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter', result.chapter_id] });
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter-count', result.chapter_id] });
      }
      if (result.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'topic', result.topic_id] });
      }
      logActivity({
        action: 'created_true_false',
        entity_type: 'true_false',
        entity_id: result.id,
        scope: { module_id: result.module_id, chapter_id: result.chapter_id },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding question', description: error.message, variant: 'destructive' });
    },
  });
}

// Update True/False question
export function useUpdateTrueFalseQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data, moduleId, chapterId, topicId }: { 
      id: string; 
      data: TrueFalseFormData; 
      moduleId: string;
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('true_false_questions')
        .update({
          statement: data.statement,
          correct_answer: data.correct_answer,
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
      queryClient.invalidateQueries({ queryKey: ['true_false', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'topic', result.topicId] });
      }
      logActivity({
        action: 'updated_true_false',
        entity_type: 'true_false',
        entity_id: result.id,
        scope: { module_id: result.moduleId, chapter_id: result.chapterId },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating question', description: error.message, variant: 'destructive' });
    },
  });
}

// Soft delete True/False question
export function useDeleteTrueFalseQuestion() {
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
        .from('true_false_questions')
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { id, moduleId, chapterId, topicId };
    },
    onSuccess: (result) => {
      toast({ title: 'Question deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['true_false', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'topic', result.topicId] });
      }
      logActivity({
        action: 'deleted_true_false',
        entity_type: 'true_false',
        entity_id: result.id,
        scope: { module_id: result.moduleId, chapter_id: result.chapterId },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting question', description: error.message, variant: 'destructive' });
    },
  });
}

// Restore soft-deleted True/False question
export function useRestoreTrueFalseQuestion() {
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
        .from('true_false_questions')
        .update({ is_deleted: false, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId, topicId };
    },
    onSuccess: (result) => {
      toast({ title: 'Question restored successfully' });
      queryClient.invalidateQueries({ queryKey: ['true_false', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'topic', result.topicId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring question', description: error.message, variant: 'destructive' });
    },
  });
}

// Bulk create True/False questions - uses edge function to bypass RLS
export function useBulkCreateTrueFalseQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      questions, 
      moduleId, 
      chapterId,
      topicId,
    }: { 
      questions: TrueFalseFormData[]; 
      moduleId: string; 
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in to import questions');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-import-true-false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ questions, moduleId, chapterId, topicId }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import questions');
      }

      return { moduleId, chapterId, topicId, count: questions.length };
    },
    onSuccess: (result) => {
      toast({ title: `${result.count} True/False questions imported successfully` });
      queryClient.invalidateQueries({ queryKey: ['true_false', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['true_false', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['true_false', 'topic', result.topicId] });
      }
      logActivity({
        action: 'bulk_upload_true_false',
        entity_type: 'true_false',
        scope: { module_id: result.moduleId, chapter_id: result.chapterId },
        metadata: { count: result.count, source: 'csv_import' },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing questions', description: error.message, variant: 'destructive' });
    },
  });
}

// Parse CSV text into True/False data
export function parseTrueFalseCsv(csvText: string): TrueFalseFormData[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Detect header row
  const firstLineLower = lines[0].toLowerCase();
  const headerKeywords = ['statement', 'question', 'correct_answer', 'answer', 'true', 'false', 'explanation', 'difficulty'];
  const isHeader = headerKeywords.some(keyword => firstLineLower.includes(keyword));
  
  // Build header mapping if header exists
  let headerMap: Record<string, number> = {};
  if (isHeader) {
    const headerParts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < lines[0].length; i++) {
      const char = lines[0][i];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { headerParts.push(current.trim().toLowerCase()); current = ''; }
      else { current += char; }
    }
    headerParts.push(current.trim().toLowerCase());
    headerParts.forEach((h, idx) => { headerMap[h] = idx; });
  }
  
  const startIndex = isHeader ? 1 : 0;
  
  // Helper to parse boolean values
  const parseBoolean = (value: string): boolean => {
    const trimmed = (value || '').trim().toLowerCase();
    return trimmed === 'true' || trimmed === 't' || trimmed === 'yes' || trimmed === 'y' || trimmed === '1';
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

    // Use header mapping if available, otherwise positional
    const getCol = (name: string, fallbackIdx: number): string => {
      if (isHeader && headerMap[name] !== undefined) return parts[headerMap[name]]?.trim() || '';
      return parts[fallbackIdx]?.trim() || '';
    };

    const statement = getCol('statement', 0) || getCol('question', 0);
    const correctAnswer = getCol('correct_answer', 1) || getCol('answer', 1);
    const explanation = getCol('explanation', 2);
    const difficulty = getCol('difficulty', 3);
    const sectionName = getCol('section_name', 4);
    const sectionNumber = getCol('section_number', 5);

    return {
      statement: statement || '',
      correct_answer: parseBoolean(correctAnswer),
      explanation: explanation || null,
      difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase()) 
        ? difficulty.toLowerCase() as 'easy' | 'medium' | 'hard' 
        : null),
      original_section_name: sectionName || null,
      original_section_number: sectionNumber || null,
    };
  });
}
