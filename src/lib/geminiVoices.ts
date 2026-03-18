import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GeminiVoice {
  id: number;
  name: string;
  gender: 'male' | 'female';
  label: string | null;
  is_active: boolean;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
}

/** Fetch all active Gemini TTS voices */
export function useGeminiVoices(gender?: 'male' | 'female') {
  return useQuery({
    queryKey: ['gemini-voices', gender],
    queryFn: async () => {
      let query = supabase
        .from('tts_voices' as any)
        .select('*')
        .eq('provider', 'gemini')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (gender) {
        query = query.eq('gender', gender);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GeminiVoice[];
    },
  });
}

/** Admin: fetch ALL Gemini voices (active + inactive) */
export function useGeminiVoicesAdmin() {
  return useQuery({
    queryKey: ['gemini-voices-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tts_voices' as any)
        .select('*')
        .eq('provider', 'gemini')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as unknown as GeminiVoice[];
    },
  });
}
