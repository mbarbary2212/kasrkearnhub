import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface MatchItem {
  id: string;
  text: string;
}

export interface MatchingQuestion {
  id: string;
  module_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  section_id: string | null;
  contributing_department_id: string | null;
  instruction: string;
  column_a_items: MatchItem[];
  column_b_items: MatchItem[];
  correct_matches: Record<string, string>; // column_a_id -> column_b_id
  explanation: string | null;
  show_explanation: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  display_order: number;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface MatchingQuestionFormData {
  instruction: string;
  column_a_items: MatchItem[];
  column_b_items: MatchItem[];
  correct_matches: Record<string, string>;
  explanation: string | null;
  show_explanation: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  topic_id?: string | null;
}

// Helper to convert DB row to MatchingQuestion type
function mapDbRowToMatchingQuestion(row: Record<string, unknown>): MatchingQuestion {
  return {
    id: row.id as string,
    module_id: row.module_id as string,
    chapter_id: row.chapter_id as string | null,
    topic_id: row.topic_id as string | null,
    section_id: row.section_id as string | null,
    contributing_department_id: row.contributing_department_id as string | null,
    instruction: row.instruction as string,
    column_a_items: row.column_a_items as MatchItem[],
    column_b_items: row.column_b_items as MatchItem[],
    correct_matches: row.correct_matches as Record<string, string>,
    explanation: row.explanation as string | null,
    show_explanation: row.show_explanation as boolean,
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard' | null,
    display_order: row.display_order as number,
    is_deleted: row.is_deleted as boolean,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    created_at: row.created_at as string,
  };
}

// Fetch matching questions by module
export function useModuleMatchingQuestions(moduleId?: string) {
  return useQuery({
    queryKey: ['matching-questions', 'module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matching_questions')
        .select('*')
        .eq('module_id', moduleId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMatchingQuestion);
    },
    enabled: !!moduleId,
  });
}

// Lightweight count-only hook for chapter matching questions (badges)
export function useChapterMatchingCount(chapterId?: string) {
  return useQuery({
    queryKey: ['matching-questions', 'chapter-count', chapterId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('matching_questions')
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

// Fetch matching questions by chapter (optionally include deleted)
export function useChapterMatchingQuestions(chapterId?: string, includeDeleted = false, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['matching-questions', 'chapter', chapterId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('matching_questions')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('display_order', { ascending: true });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDbRowToMatchingQuestion);
    },
    enabled: !!chapterId && enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Fetch matching questions by topic
export function useTopicMatchingQuestions(topicId?: string) {
  return useQuery({
    queryKey: ['matching-questions', 'topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matching_questions')
        .select('*')
        .eq('topic_id', topicId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapDbRowToMatchingQuestion);
    },
    enabled: !!topicId,
  });
}

// Create matching question
export function useCreateMatchingQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (data: MatchingQuestionFormData & { module_id: string; chapter_id?: string | null }) => {
      const { error } = await supabase.from('matching_questions').insert({
        module_id: data.module_id,
        chapter_id: data.chapter_id || null,
        topic_id: data.topic_id || null,
        instruction: data.instruction,
        column_a_items: data.column_a_items as unknown as Json,
        column_b_items: data.column_b_items as unknown as Json,
        correct_matches: data.correct_matches as unknown as Json,
        explanation: data.explanation,
        show_explanation: data.show_explanation,
        difficulty: data.difficulty,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Matching question added successfully' });
      queryClient.invalidateQueries({ queryKey: ['matching-questions', 'module', variables.module_id] });
      if (variables.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', variables.chapter_id] });
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter-count', variables.chapter_id] });
      }
      if (variables.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'topic', variables.topic_id] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding matching question', description: error.message, variant: 'destructive' });
    },
  });
}

// Update matching question
export function useUpdateMatchingQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, data, moduleId, chapterId, topicId }: { 
      id: string; 
      data: MatchingQuestionFormData; 
      moduleId: string;
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const { error } = await supabase
        .from('matching_questions')
        .update({
          instruction: data.instruction,
          column_a_items: data.column_a_items as unknown as Json,
          column_b_items: data.column_b_items as unknown as Json,
          correct_matches: data.correct_matches as unknown as Json,
          explanation: data.explanation,
          show_explanation: data.show_explanation,
          difficulty: data.difficulty,
          topic_id: data.topic_id || topicId || null,
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId, topicId };
    },
    onSuccess: (result) => {
      toast({ title: 'Matching question updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['matching-questions', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'topic', result.topicId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating matching question', description: error.message, variant: 'destructive' });
    },
  });
}

// Soft delete matching question
export function useDeleteMatchingQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, moduleId, chapterId }: { 
      id: string; 
      moduleId: string;
      chapterId?: string | null;
    }) => {
      const { error } = await supabase
        .from('matching_questions')
        .update({ is_deleted: true, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId };
    },
    onSuccess: (result) => {
      toast({ title: 'Matching question deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['matching-questions', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', result.chapterId, false] });
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', result.chapterId, true] });
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter-count', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting matching question', description: error.message, variant: 'destructive' });
    },
  });
}

// Restore (undo soft delete) matching question
export function useRestoreMatchingQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id, moduleId, chapterId }: { 
      id: string; 
      moduleId: string;
      chapterId?: string | null;
    }) => {
      const { error } = await supabase
        .from('matching_questions')
        .update({ is_deleted: false, updated_by: user?.id })
        .eq('id', id);

      if (error) throw error;
      return { moduleId, chapterId };
    },
    onSuccess: (result) => {
      toast({ title: 'Matching question restored successfully' });
      queryClient.invalidateQueries({ queryKey: ['matching-questions', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', result.chapterId, false] });
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', result.chapterId, true] });
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter-count', result.chapterId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring matching question', description: error.message, variant: 'destructive' });
    },
  });
}

// Bulk create matching questions from CSV
export function useBulkCreateMatchingQuestions() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ 
      questions, 
      moduleId, 
      chapterId,
      topicId 
    }: { 
      questions: MatchingQuestionFormData[]; 
      moduleId: string; 
      chapterId?: string | null;
      topicId?: string | null;
    }) => {
      const records = questions.map((q, index) => ({
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        instruction: q.instruction,
        column_a_items: q.column_a_items as unknown as Json,
        column_b_items: q.column_b_items as unknown as Json,
        correct_matches: q.correct_matches as unknown as Json,
        explanation: q.explanation,
        show_explanation: q.show_explanation,
        difficulty: q.difficulty,
        display_order: index,
        created_by: user?.id,
        section_id: (q as any).section_id || null,
        original_section_name: (q as any).original_section_name || null,
        original_section_number: (q as any).original_section_number || null,
      }));

      const { error } = await supabase.from('matching_questions').insert(records);
      if (error) throw error;
      return { moduleId, chapterId, topicId, count: questions.length };
    },
    onSuccess: (result) => {
      toast({ title: `${result.count} matching questions imported successfully` });
      queryClient.invalidateQueries({ queryKey: ['matching-questions', 'module', result.moduleId] });
      if (result.chapterId) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter', result.chapterId] });
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'chapter-count', result.chapterId] });
      }
      if (result.topicId) {
        queryClient.invalidateQueries({ queryKey: ['matching-questions', 'topic', result.topicId] });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing matching questions', description: error.message, variant: 'destructive' });
    },
  });
}

// Parse CSV text into matching question data
// Expected CSV format:
// instruction,item_a_1,item_a_2,item_a_3,item_a_4,item_b_1,item_b_2,item_b_3,item_b_4,match_1,match_2,match_3,match_4,explanation,difficulty,show_explanation
// Where match_N is the index (1-based) of the item in column B that matches item_a_N
export function parseMatchingQuestionsCsv(csvText: string): MatchingQuestionFormData[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  
  // Skip header row if it looks like a header
  const startIndex = lines[0]?.toLowerCase().includes('instruction') ? 1 : 0;
  
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

    const [
      instruction,
      itemA1, itemA2, itemA3, itemA4,
      itemB1, itemB2, itemB3, itemB4,
      match1, match2, match3, match4,
      explanation,
      difficulty,
      showExplanation
    ] = parts;

    // Build column A items
    const columnAItems: MatchItem[] = [itemA1, itemA2, itemA3, itemA4]
      .filter(Boolean)
      .map((text, i) => ({ id: `a${i + 1}`, text }));

    // Build column B items
    const columnBItems: MatchItem[] = [itemB1, itemB2, itemB3, itemB4]
      .filter(Boolean)
      .map((text, i) => ({ id: `b${i + 1}`, text }));

    // Build correct matches (match_N is 1-based index into column B)
    const matchIndices = [match1, match2, match3, match4];
    const correctMatches: Record<string, string> = {};
    
    columnAItems.forEach((item, index) => {
      const matchIndex = parseInt(matchIndices[index] || '0', 10);
      if (matchIndex > 0 && matchIndex <= columnBItems.length) {
        correctMatches[item.id] = `b${matchIndex}`;
      }
    });

    // Parse show_explanation - default to true if not provided or invalid
    const showExplanationValue = showExplanation?.toLowerCase() === 'false' ? false : true;

    return {
      instruction: instruction || 'Match the items in Column A with the correct items in Column B',
      column_a_items: columnAItems,
      column_b_items: columnBItems,
      correct_matches: correctMatches,
      explanation: explanation || null,
      show_explanation: showExplanationValue,
      difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase()) 
        ? difficulty.toLowerCase() as 'easy' | 'medium' | 'hard' 
        : null),
    };
  });
}
