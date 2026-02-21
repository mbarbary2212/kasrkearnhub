import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreateChapterData {
  moduleId: string;
  bookLabel: string;
  title: string;
  chapterNumber: number;
}

export interface UpdateChapterData {
  chapterId: string;
  moduleId: string;
  title?: string;
  chapterNumber?: number;
  bookLabel?: string;
  iconUrl?: string | null;
}

// Create a new chapter
export function useCreateChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChapterData) => {
      // Get the max order_index for this module
      const { data: existing } = await supabase
        .from('module_chapters')
        .select('order_index')
        .eq('module_id', data.moduleId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = (existing?.[0]?.order_index || 0) + 1;

      const { data: chapter, error } = await supabase
        .from('module_chapters')
        .insert({
          module_id: data.moduleId,
          book_label: data.bookLabel,
          title: data.title,
          chapter_number: data.chapterNumber,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return chapter;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters-for-book', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
    },
  });
}

// Update a chapter
export function useUpdateChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateChapterData) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.chapterNumber !== undefined) updateData.chapter_number = data.chapterNumber;
      if (data.bookLabel !== undefined) updateData.book_label = data.bookLabel;
      if (data.iconUrl !== undefined) updateData.icon_url = data.iconUrl;

      const { data: chapter, error } = await supabase
        .from('module_chapters')
        .update(updateData)
        .eq('id', data.chapterId)
        .select()
        .single();

      if (error) throw error;
      return chapter;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters-for-book', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['chapter', variables.chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
    },
  });
}

// Delete a chapter
export function useDeleteChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, moduleId }: { chapterId: string; moduleId: string }) => {
      const { error } = await supabase
        .from('module_chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;
      return { chapterId, moduleId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters-for-book', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
    },
  });
}
