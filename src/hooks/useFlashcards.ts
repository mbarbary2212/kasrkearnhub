import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Flashcard {
  id: string;
  chapter_id: string;
  module_id: string;
  front: string;
  back: string;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  is_deleted: boolean;
}

export interface FlashcardInsert {
  chapter_id: string;
  module_id: string;
  front: string;
  back: string;
  display_order?: number;
  created_by?: string;
}

// Fetch flashcards for a chapter
export function useChapterFlashcards(chapterId?: string) {
  return useQuery({
    queryKey: ['chapter-flashcards', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Flashcard[];
    },
    enabled: !!chapterId,
  });
}

// Fetch disclaimer setting
export function useFlashcardDisclaimer() {
  return useQuery({
    queryKey: ['flashcard-disclaimer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flashcard_settings')
        .select('value')
        .eq('key', 'disclaimer')
        .single();

      if (error) throw error;
      return data?.value || '';
    },
  });
}

// Create a single flashcard
export function useCreateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flashcard: FlashcardInsert) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          ...flashcard,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-flashcards', variables.chapter_id] });
      toast.success('Flashcard created successfully');
    },
    onError: (error) => {
      console.error('Failed to create flashcard:', error);
      toast.error('Failed to create flashcard');
    },
  });
}

// Create multiple flashcards (bulk)
export function useBulkCreateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flashcards, chapterId, moduleId }: { 
      flashcards: { front: string; back: string }[];
      chapterId: string;
      moduleId: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const flashcardsToInsert = flashcards.map((f, index) => ({
        chapter_id: chapterId,
        module_id: moduleId,
        front: f.front,
        back: f.back,
        display_order: index,
        created_by: user?.user?.id,
      }));

      const { data, error } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-flashcards', variables.chapterId] });
      toast.success(`${variables.flashcards.length} flashcards imported successfully`);
    },
    onError: (error) => {
      console.error('Failed to import flashcards:', error);
      toast.error('Failed to import flashcards');
    },
  });
}

// Update a flashcard
export function useUpdateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, front, back, chapterId }: { 
      id: string; 
      front: string; 
      back: string;
      chapterId: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('flashcards')
        .update({
          front,
          back,
          updated_by: user?.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-flashcards', variables.chapterId] });
      toast.success('Flashcard updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update flashcard:', error);
      toast.error('Failed to update flashcard');
    },
  });
}

// Soft delete a flashcard
export function useDeleteFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chapterId }: { id: string; chapterId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('flashcards')
        .update({
          is_deleted: true,
          updated_by: user?.user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-flashcards', variables.chapterId] });
      toast.success('Flashcard deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete flashcard:', error);
      toast.error('Failed to delete flashcard');
    },
  });
}

// Update disclaimer (Super Admin only)
export function useUpdateDisclaimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('flashcard_settings')
        .update({
          value,
          updated_by: user?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'disclaimer');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-disclaimer'] });
      toast.success('Disclaimer updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update disclaimer:', error);
      toast.error('Failed to update disclaimer');
    },
  });
}
