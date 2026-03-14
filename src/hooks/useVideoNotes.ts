import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VideoNote {
  id: string;
  video_id: string;
  timestamp_seconds: number;
  note_text: string;
  created_at: string;
}

export function useVideoNotes(videoId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['video-notes', videoId, user?.id],
    queryFn: async () => {
      if (!user || !videoId) return [];
      const { data, error } = await supabase
        .from('video_notes')
        .select('id, video_id, timestamp_seconds, note_text, created_at')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true });
      if (error) throw error;
      return data as VideoNote[];
    },
    enabled: !!user && !!videoId,
  });

  const addNote = useMutation({
    mutationFn: async ({ videoId, timestampSeconds, noteText }: { videoId: string; timestampSeconds: number; noteText: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('video_notes').insert({
        user_id: user.id,
        video_id: videoId,
        timestamp_seconds: timestampSeconds,
        note_text: noteText,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video-notes'] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('video_notes').delete().eq('id', noteId).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video-notes'] }),
  });

  return { notes, addNote, deleteNote };
}

/** Hook to check if user has notes for any videos in a list */
export function useVideoNotesExistence(videoIds: string[]) {
  const { user } = useAuth();

  const { data: videoIdsWithNotes = new Set<string>() } = useQuery({
    queryKey: ['video-notes-existence', user?.id, videoIds.sort().join(',')],
    queryFn: async () => {
      if (!user || videoIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from('video_notes')
        .select('video_id')
        .eq('user_id', user.id)
        .in('video_id', videoIds);
      if (error) throw error;
      return new Set(data.map((r) => r.video_id));
    },
    enabled: !!user && videoIds.length > 0,
  });

  return videoIdsWithNotes;
}
