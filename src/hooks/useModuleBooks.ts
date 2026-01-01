import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleBook {
  id: string;
  module_id: string;
  book_label: string;
  display_order: number;
  chapter_prefix: string;
  created_at: string | null;
}

// Get books for a module with their metadata (order, prefix)
export function useModuleBooks(moduleId?: string) {
  return useQuery({
    queryKey: ['module-books', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_books')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ModuleBook[];
    },
    enabled: !!moduleId,
  });
}

// Add a new book with metadata
export function useAddBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      bookLabel,
      chapterPrefix = 'Ch'
    }: { 
      moduleId: string; 
      bookLabel: string;
      chapterPrefix?: string;
    }) => {
      // Get the next display order
      const { data: existingBooks } = await supabase
        .from('module_books')
        .select('display_order')
        .eq('module_id', moduleId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingBooks?.[0]?.display_order ?? -1) + 1;

      // Create book metadata entry - treat insert success as source of truth
      const { error: bookError } = await supabase
        .from('module_books')
        .insert({
          module_id: moduleId,
          book_label: bookLabel,
          display_order: nextOrder,
          chapter_prefix: chapterPrefix,
        });

      // Only throw if there's an actual error from the insert
      if (bookError) throw bookError;

      // Get the next order_index for chapters in this module
      const { data: lastChapter } = await supabase
        .from('module_chapters')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrderIndex = (lastChapter?.order_index ?? -1) + 1;

      // Create a placeholder chapter to establish the book
      const { error: chapterError } = await supabase
        .from('module_chapters')
        .insert({
          module_id: moduleId,
          book_label: bookLabel,
          title: `${chapterPrefix} 1`,
          chapter_number: 1,
          order_index: nextOrderIndex,
        });

      // Only throw if there's an actual error from the insert
      if (chapterError) throw chapterError;
      
      // Return success indicator (data may be null if RLS blocks select)
      return { success: true, bookLabel, moduleId };
    },
    onSuccess: async (_, variables) => {
      // Force refetch queries to update the UI immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['module-books', variables.moduleId] }),
        queryClient.refetchQueries({ queryKey: ['module-chapters', variables.moduleId] }),
      ]);
    },
  });
}

// Update book metadata (rename and/or change prefix)
export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      oldLabel, 
      newLabel,
      chapterPrefix,
    }: { 
      moduleId: string; 
      oldLabel: string; 
      newLabel?: string;
      chapterPrefix?: string;
    }) => {
      const updates: Record<string, string> = {};
      if (newLabel !== undefined) updates.book_label = newLabel;
      if (chapterPrefix !== undefined) updates.chapter_prefix = chapterPrefix;

      // Update book metadata
      const { error: bookError } = await supabase
        .from('module_books')
        .update(updates)
        .eq('module_id', moduleId)
        .eq('book_label', oldLabel);

      if (bookError) throw bookError;

      // If renaming, also update all chapters with this book label
      if (newLabel && newLabel !== oldLabel) {
        const { error: chaptersError } = await supabase
          .from('module_chapters')
          .update({ book_label: newLabel })
          .eq('module_id', moduleId)
          .eq('book_label', oldLabel);

        if (chaptersError) throw chaptersError;
      }

      return { moduleId, oldLabel, newLabel, chapterPrefix };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
    },
  });
}

// Reorder books
export function useReorderBooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      bookOrders 
    }: { 
      moduleId: string; 
      bookOrders: { bookLabel: string; displayOrder: number }[];
    }) => {
      // Update each book's display_order
      const updates = bookOrders.map(({ bookLabel, displayOrder }) =>
        supabase
          .from('module_books')
          .update({ display_order: displayOrder })
          .eq('module_id', moduleId)
          .eq('book_label', bookLabel)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      return { moduleId, bookOrders };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
    },
  });
}

// Delete a book (and all its chapters)
export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, bookLabel }: { moduleId: string; bookLabel: string }) => {
      // Delete chapters first
      const { error: chaptersError } = await supabase
        .from('module_chapters')
        .delete()
        .eq('module_id', moduleId)
        .eq('book_label', bookLabel);

      if (chaptersError) throw chaptersError;

      // Then delete book metadata
      const { error: bookError } = await supabase
        .from('module_books')
        .delete()
        .eq('module_id', moduleId)
        .eq('book_label', bookLabel);

      if (bookError) throw bookError;

      return { moduleId, bookLabel };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
    },
  });
}
