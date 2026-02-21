import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';

export interface OsceQuestion {
  id: string;
  module_id: string;
  chapter_id: string | null;
  section_id: string | null;
  image_url: string | null;
  history_text: string;
  statement_1: string;
  statement_2: string;
  statement_3: string;
  statement_4: string;
  statement_5: string;
  answer_1: boolean;
  answer_2: boolean;
  answer_3: boolean;
  answer_4: boolean;
  answer_5: boolean;
  explanation_1: string | null;
  explanation_2: string | null;
  explanation_3: string | null;
  explanation_4: string | null;
  explanation_5: string | null;
  display_order: number;
  is_deleted: boolean;
  legacy_archived: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OsceQuestionInsert {
  module_id: string;
  chapter_id?: string | null;
  image_url?: string | null;
  history_text: string;
  statement_1: string;
  statement_2: string;
  statement_3: string;
  statement_4: string;
  statement_5: string;
  answer_1: boolean;
  answer_2: boolean;
  answer_3: boolean;
  answer_4: boolean;
  answer_5: boolean;
  explanation_1?: string | null;
  explanation_2?: string | null;
  explanation_3?: string | null;
  explanation_4?: string | null;
  explanation_5?: string | null;
  display_order?: number;
  created_by?: string | null;
}

// Lightweight count-only hook for chapter OSCE questions (badges)
export function useChapterOsceCount(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-osce-count', chapterId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('osce_questions')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .eq('legacy_archived', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Fetch OSCE questions for a chapter
export function useChapterOsceQuestions(chapterId?: string, includeDeleted = false, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ['chapter-osce-questions', chapterId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('osce_questions')
        .select('*')
        .eq('chapter_id', chapterId!)
        .eq('legacy_archived', false)
        .order('display_order', { ascending: true });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OsceQuestion[];
    },
    enabled: !!chapterId && enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// Fetch OSCE questions for a topic
export function useTopicOsceQuestions(topicId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['topic-osce-questions', topicId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('osce_questions')
        .select('*')
        .eq('topic_id', topicId!)
        .eq('legacy_archived', false)
        .order('display_order', { ascending: true });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OsceQuestion[];
    },
    enabled: !!topicId,
  });
}

// Fetch OSCE questions for a module
export function useModuleOsceQuestions(moduleId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['module-osce-questions', moduleId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('osce_questions')
        .select('*')
        .eq('module_id', moduleId!)
        .eq('legacy_archived', false)
        .order('display_order', { ascending: true });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OsceQuestion[];
    },
    enabled: !!moduleId,
  });
}

// Create OSCE question
export function useCreateOsceQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (question: OsceQuestionInsert) => {
      const { data, error } = await supabase
        .from('osce_questions')
        .insert(question)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-questions', data.chapter_id] });
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-count', data.chapter_id] });
      queryClient.invalidateQueries({ queryKey: ['module-osce-questions', data.module_id] });
      toast.success('OSCE question added successfully');
      logActivity({
        action: 'created_osce',
        entity_type: 'osce',
        entity_id: data.id,
        scope: { module_id: data.module_id, chapter_id: data.chapter_id },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add OSCE question');
    },
  });
}

// Update OSCE question
export function useUpdateOsceQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OsceQuestion> & { id: string }) => {
      const { data, error } = await supabase
        .from('osce_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-questions', data.chapter_id] });
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-count', data.chapter_id] });
      queryClient.invalidateQueries({ queryKey: ['module-osce-questions', data.module_id] });
      toast.success('OSCE question updated successfully');
      logActivity({
        action: 'updated_osce',
        entity_type: 'osce',
        entity_id: data.id,
        scope: { module_id: data.module_id, chapter_id: data.chapter_id },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update OSCE question');
    },
  });
}

// Soft delete OSCE question
export function useDeleteOsceQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, chapterId, moduleId }: { id: string; chapterId?: string; moduleId: string }) => {
      const { error } = await supabase
        .from('osce_questions')
        .update({ is_deleted: true })
        .eq('id', id);
      
      if (error) throw error;
      return { id, chapterId, moduleId };
    },
    onSuccess: ({ id, chapterId, moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-questions', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-count', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-osce-questions', moduleId] });
      toast.success('OSCE question deleted');
      logActivity({
        action: 'deleted_osce',
        entity_type: 'osce',
        entity_id: id,
        scope: { module_id: moduleId, chapter_id: chapterId },
        metadata: { source: 'admin_delete' },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete OSCE question');
    },
  });
}

// Restore OSCE question
export function useRestoreOsceQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, chapterId, moduleId }: { id: string; chapterId?: string; moduleId: string }) => {
      const { error } = await supabase
        .from('osce_questions')
        .update({ is_deleted: false })
        .eq('id', id);
      
      if (error) throw error;
      return { chapterId, moduleId };
    },
    onSuccess: ({ chapterId, moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-questions', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-osce-count', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-osce-questions', moduleId] });
      toast.success('OSCE question restored');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore OSCE question');
    },
  });
}

// Archive legacy OSCE questions (super admin only)
export function useArchiveLegacyOsce() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('archive_legacy_osce_questions');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals'] });
      queryClient.invalidateQueries({ queryKey: ['module-practicals'] });
      toast.success(`Archived ${count} legacy OSCE questions`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive legacy OSCE questions');
    },
  });
}

// Upload OSCE image to storage
export async function uploadOsceImage(
  file: File,
  moduleId: string,
  chapterId?: string | null
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${moduleId}/${chapterId || 'general'}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('osce-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('osce-images')
    .getPublicUrl(filePath);

  return publicUrl;
}
