import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Content tables that support bulk operations
export type ContentTableName = 
  | 'lectures'
  | 'resources'
  | 'study_resources'
  | 'mcqs'
  | 'essays'
  | 'osce_questions'
  | 'matching_questions'
  | 'virtual_patient_cases'
  | 'true_false_questions';

// Query key patterns to invalidate for each table
const QUERY_INVALIDATION_MAP: Record<ContentTableName, string[]> = {
  lectures: ['chapter-lectures', 'module-lectures'],
  resources: ['chapter-resources', 'module-resources'],
  study_resources: ['study-resources', 'study-resource-folders'],
  mcqs: ['mcqs'],
  essays: ['chapter-essays'],
  osce_questions: ['chapter-osce-questions'],
  matching_questions: ['matching-questions'],
  virtual_patient_cases: ['clinical-cases', 'virtual-patient-cases'],
  true_false_questions: ['true_false'],
};

function shouldInvalidate(queryKey: unknown[], tableName: ContentTableName): boolean {
  const patterns = QUERY_INVALIDATION_MAP[tableName] || [];
  const firstKey = queryKey[0];
  return patterns.some(pattern => 
    typeof firstKey === 'string' && firstKey.includes(pattern.replace('chapter-', '').replace('module-', ''))
  );
}

// Generic bulk delete hook for all content types
export function useBulkDeleteContent(tableName: ContentTableName) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, chapterId, topicId }: { 
      ids: string[]; 
      chapterId?: string;
      topicId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          is_deleted: true, 
          updated_by: userData.user?.id 
        } as never)
        .in('id', ids);
      
      if (error) throw error;
      return { ids, chapterId, topicId };
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on table name
      const patterns = QUERY_INVALIDATION_MAP[tableName] || [];
      patterns.forEach(pattern => {
        if (variables.chapterId) {
          queryClient.invalidateQueries({ queryKey: [pattern, variables.chapterId] });
        }
        if (variables.topicId) {
          queryClient.invalidateQueries({ queryKey: [pattern, variables.topicId] });
        }
        // Also use predicate-based invalidation for flexibility
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && shouldInvalidate(q.queryKey, tableName)
        });
      });
    },
  });
}

// Bulk update section assignment
export function useBulkUpdateSection(tableName: ContentTableName) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, sectionId }: { 
      ids: string[]; 
      sectionId: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          section_id: sectionId,
          updated_by: userData.user?.id 
        } as never)
        .in('id', ids);
      
      if (error) throw error;
      return { ids, sectionId };
    },
    onSuccess: () => {
      // Invalidate all queries for this table type
      const patterns = QUERY_INVALIDATION_MAP[tableName] || [];
      patterns.forEach(pattern => {
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === pattern
        });
      });
    },
  });
}

// Bulk move to another chapter
export function useBulkMoveToChapter(tableName: ContentTableName) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, targetChapterId, sourceChapterId }: { 
      ids: string[]; 
      targetChapterId: string;
      sourceChapterId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from(tableName)
        .update({ 
          chapter_id: targetChapterId,
          updated_by: userData.user?.id 
        } as never)
        .in('id', ids);
      
      if (error) throw error;
      return { ids, targetChapterId, sourceChapterId };
    },
    onSuccess: (_, variables) => {
      // Invalidate queries for both source and target chapters
      const patterns = QUERY_INVALIDATION_MAP[tableName] || [];
      patterns.forEach(pattern => {
        if (variables.sourceChapterId) {
          queryClient.invalidateQueries({ queryKey: [pattern, variables.sourceChapterId] });
        }
        queryClient.invalidateQueries({ queryKey: [pattern, variables.targetChapterId] });
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && shouldInvalidate(q.queryKey, tableName)
        });
      });
    },
  });
}