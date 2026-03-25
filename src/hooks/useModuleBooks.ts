import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CROSS_MODULE_BOOKS } from '@/lib/crossModuleBooks';

export interface ModuleBook {
  id: string;
  module_id: string;
  book_label: string;
  description: string | null;
  display_order: number;
  chapter_prefix: string;
  created_at: string | null;
  /** True if this book is virtually mapped from another module */
  isVirtual?: boolean;
  /** The source module ID for virtual books */
  sourceModuleId?: string;
}

// Get books for a module with their metadata (order, prefix)
// Includes virtual cross-module books automatically
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
      const books = (data || []) as ModuleBook[];

      // Check for cross-module virtual books
      const crossBooks = CROSS_MODULE_BOOKS[moduleId!];
      if (crossBooks) {
        for (const [bookLabel, sourceModuleId] of Object.entries(crossBooks)) {
          // Skip if the book already exists natively
          if (books.some(b => b.book_label === bookLabel)) continue;

          // Fetch the source book metadata
          const { data: sourceBook } = await supabase
            .from('module_books')
            .select('*')
            .eq('module_id', sourceModuleId)
            .eq('book_label', bookLabel)
            .maybeSingle();

          if (sourceBook) {
            // Insert virtual book at the beginning (display_order -1 to sort first)
            books.unshift({
              ...sourceBook,
              module_id: moduleId!,
              display_order: -1,
              isVirtual: true,
              sourceModuleId,
            } as ModuleBook);
          }
        }
        // Re-sort by display_order
        books.sort((a, b) => a.display_order - b.display_order);
      }

      return books;
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
      chapterPrefix = 'Ch',
    }: {
      moduleId: string;
      bookLabel: string;
      chapterPrefix?: string;
    }) => {
      // Get the next display order
      const { data: existingBooks, error: orderError } = await supabase
        .from('module_books')
        .select('display_order')
        .eq('module_id', moduleId)
        .order('display_order', { ascending: false })
        .limit(1);

      if (orderError) throw new Error(orderError.message);

      const nextOrder = (existingBooks?.[0]?.display_order ?? -1) + 1;

      const payload = {
        module_id: moduleId,
        book_label: bookLabel,
        display_order: nextOrder,
        chapter_prefix: chapterPrefix,
      };

      // Insert department/book - treat insert success as source of truth
      const { data: insertedBook, error: bookError } = await supabase
        .from('module_books')
        .insert(payload)
        .select('*')
        .single();

      // If the insert succeeded but "returning representation" is blocked (RLS),
      // PostgREST can return PGRST116 (0 rows). That should still be treated as success.
      if (bookError && bookError.code !== 'PGRST116') {
        throw new Error(bookError.message);
      }

      // Try creating a placeholder chapter to establish the grouping.
      // This must NOT fail the whole operation because the department may already be created.
      let placeholderChapterError: string | null = null;

      const { data: lastChapter, error: lastChapterError } = await supabase
        .from('module_chapters')
        .select('order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastChapterError) {
        placeholderChapterError = lastChapterError.message;
      } else {
        const nextOrderIndex = (lastChapter?.order_index ?? -1) + 1;

        const { error: chapterError } = await supabase.from('module_chapters').insert({
          module_id: moduleId,
          book_label: bookLabel,
          title: `${chapterPrefix} 1`,
          chapter_number: 1,
          order_index: nextOrderIndex,
        });

        if (chapterError) placeholderChapterError = chapterError.message;
      }

      return {
        moduleId,
        bookLabel,
        chapterPrefix,
        displayOrder: nextOrder,
        insertedBook: insertedBook ?? null,
        placeholderChapterError,
      };
    },
    onSuccess: async (result) => {
      // Optimistically update local cache so the UI updates instantly.
      const optimistic: ModuleBook = result.insertedBook ?? {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`,
        module_id: result.moduleId,
        book_label: result.bookLabel,
        description: null,
        display_order: result.displayOrder,
        chapter_prefix: result.chapterPrefix,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ModuleBook[]>(['module-books', result.moduleId], (old) => {
        const prev = old ?? [];
        const withoutDupes = prev.filter((b) => b.book_label !== optimistic.book_label);
        return [...withoutDupes, optimistic].sort((a, b) => a.display_order - b.display_order);
      });

      const doRefetch = () =>
        Promise.all([
          queryClient.refetchQueries({ queryKey: ['module-books', result.moduleId] }),
          queryClient.refetchQueries({ queryKey: ['module-chapters', result.moduleId] }),
        ]);

      try {
        await doRefetch();
      } catch {
        toast('Department added. Syncing list…');
        try {
          await doRefetch();
        } catch {
          // UI already has the optimistic item; next navigation/refresh will reconcile.
        }
      }
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
      description,
    }: { 
      moduleId: string; 
      oldLabel: string; 
      newLabel?: string;
      chapterPrefix?: string;
      description?: string | null;
    }) => {
      const updates: Record<string, string | null> = {};
      if (newLabel !== undefined) updates.book_label = newLabel;
      if (chapterPrefix !== undefined) updates.chapter_prefix = chapterPrefix;
      if (description !== undefined) updates.description = description;

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
