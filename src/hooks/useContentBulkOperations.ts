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

// Bulk move to another chapter (optionally across modules)
export function useBulkMoveToChapter(tableName: ContentTableName) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, targetChapterId, targetModuleId, sourceChapterId }: { 
      ids: string[]; 
      targetChapterId: string;
      targetModuleId?: string;
      sourceChapterId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const updatePayload: Record<string, unknown> = {
        chapter_id: targetChapterId,
        updated_by: userData.user?.id,
      };
      if (targetModuleId) {
        updatePayload.module_id = targetModuleId;
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updatePayload as never)
        .in('id', ids);
      
      if (error) throw error;
      return { ids, targetChapterId, targetModuleId, sourceChapterId };
    },
    onSuccess: (_, variables) => {
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

// Copy columns to keep when duplicating rows (exclude id, created_at, etc.)
const COPY_EXCLUDE_COLUMNS = ['id', 'created_at', 'updated_at', 'updated_by', 'created_by'];

// Bulk copy to another chapter (duplicates rows)
export function useBulkCopyToChapter(tableName: ContentTableName) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, targetChapterId, targetModuleId }: { 
      ids: string[]; 
      targetChapterId: string;
      targetModuleId: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Fetch existing rows
      const { data: rows, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .in('id', ids);
      
      if (fetchError) throw fetchError;
      if (!rows || rows.length === 0) throw new Error('No items found to copy');

      // Build new rows with updated chapter/module and fresh metadata
      const newRows = rows.map((row: Record<string, unknown>) => {
        const copy: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!COPY_EXCLUDE_COLUMNS.includes(key)) {
            copy[key] = value;
          }
        }
        copy.chapter_id = targetChapterId;
        copy.module_id = targetModuleId;
        copy.created_by = userData.user?.id;
        // Clear section_id since target chapter has different sections
        copy.section_id = null;
        return copy;
      });

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(newRows as never[]);
      
      if (insertError) throw insertError;
      return { count: newRows.length, targetChapterId, targetModuleId };
    },
    onSuccess: (_, variables) => {
      const patterns = QUERY_INVALIDATION_MAP[tableName] || [];
      patterns.forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: [pattern, variables.targetChapterId] });
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && shouldInvalidate(q.queryKey, tableName)
        });
      });
    },
  });
}

// Bulk convert flashcard type (Classic ↔ Cloze)
export function useBulkConvertCardType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, targetType, chapterId, topicId }: {
      ids: string[];
      targetType: 'cloze' | 'normal';
      chapterId?: string;
      topicId?: string;
    }) => {
      // Fetch current content for each card
      const { data: rows, error: fetchError } = await supabase
        .from('study_resources')
        .select('id, content')
        .in('id', ids);

      if (fetchError) throw fetchError;
      if (!rows || rows.length === 0) throw new Error('No cards found');

      // Update each card's content JSON
      const updates = rows.map(row => {
        const content = row.content as Record<string, unknown>;
        const newContent = targetType === 'cloze'
          ? { ...content, card_type: 'cloze', cloze_text: (content.front as string) || '' }
          : { ...content, card_type: 'normal' };
        return supabase
          .from('study_resources')
          .update({ content: newContent } as never)
          .eq('id', row.id);
      });

      const results = await Promise.all(updates);
      const failed = results.filter(r => r.error);
      if (failed.length > 0) throw failed[0].error;

      return { count: rows.length, chapterId, topicId };
    },
    onSuccess: (_, variables) => {
      const patterns = QUERY_INVALIDATION_MAP['study_resources'];
      patterns.forEach(pattern => {
        if (variables.chapterId) {
          queryClient.invalidateQueries({ queryKey: [pattern, variables.chapterId] });
        }
        if (variables.topicId) {
          queryClient.invalidateQueries({ queryKey: [pattern, variables.topicId] });
        }
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && shouldInvalidate(q.queryKey, 'study_resources')
        });
      });
    },
  });
}