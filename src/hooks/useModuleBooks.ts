import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Get unique book labels for a module
export function useModuleBooks(moduleId?: string) {
  return useQuery({
    queryKey: ['module-books', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_chapters')
        .select('book_label')
        .eq('module_id', moduleId!)
        .order('book_label');

      if (error) throw error;
      
      // Get unique book labels
      const uniqueLabels = [...new Set(data?.map(d => d.book_label).filter(Boolean))];
      return uniqueLabels as string[];
    },
    enabled: !!moduleId,
  });
}

// Add a new book (creates an initial placeholder chapter with the book label)
export function useAddBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, bookLabel }: { moduleId: string; bookLabel: string }) => {
      // Check if book label already exists
      const { data: existing } = await supabase
        .from('module_chapters')
        .select('id')
        .eq('module_id', moduleId)
        .eq('book_label', bookLabel)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('Book label already exists');
      }

      // Get the next order_index and chapter_number for this module
      const { data: lastChapter } = await supabase
        .from('module_chapters')
        .select('order_index, chapter_number')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrderIndex = (lastChapter?.order_index ?? -1) + 1;
      const nextChapterNumber = (lastChapter?.chapter_number ?? 0) + 1;

      // Create a placeholder chapter to establish the book
      const { data, error } = await supabase
        .from('module_chapters')
        .insert({
          module_id: moduleId,
          book_label: bookLabel,
          title: 'Chapter 1',
          chapter_number: nextChapterNumber,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
    },
  });
}

// Rename a book label
export function useRenameBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      oldLabel, 
      newLabel 
    }: { 
      moduleId: string; 
      oldLabel: string; 
      newLabel: string;
    }) => {
      const { error } = await supabase
        .from('module_chapters')
        .update({ book_label: newLabel })
        .eq('module_id', moduleId)
        .eq('book_label', oldLabel);

      if (error) throw error;
      return { moduleId, oldLabel, newLabel };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
    },
  });
}

// Delete a book (and all its chapters)
export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, bookLabel }: { moduleId: string; bookLabel: string }) => {
      const { error } = await supabase
        .from('module_chapters')
        .delete()
        .eq('module_id', moduleId)
        .eq('book_label', bookLabel);

      if (error) throw error;
      return { moduleId, bookLabel };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-books', variables.moduleId] });
      queryClient.invalidateQueries({ queryKey: ['module-chapters', variables.moduleId] });
    },
  });
}
