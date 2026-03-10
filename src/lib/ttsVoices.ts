import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TTSVoice {
  id: number;
  name: string;
  elevenlabs_voice_id: string;
  gender: 'male' | 'female';
  label: string | null;
  is_active: boolean;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
}

/** Fetch all active TTS voices */
export function useTTSVoices(gender?: 'male' | 'female') {
  return useQuery({
    queryKey: ['tts-voices', gender],
    queryFn: async () => {
      let query = supabase
        .from('tts_voices' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (gender) {
        query = query.eq('gender', gender);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TTSVoice[];
    },
  });
}

/** Admin: fetch ALL voices (active + inactive) */
export function useTTSVoicesAdmin() {
  return useQuery({
    queryKey: ['tts-voices-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tts_voices' as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as unknown as TTSVoice[];
    },
  });
}
