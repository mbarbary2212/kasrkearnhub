import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import examiner1 from '@/assets/examiner-1.png';
import examiner2 from '@/assets/examiner-2.png';
import examiner3 from '@/assets/examiner-3.png';
import examiner4 from '@/assets/examiner-4.png';

export const EXAMINER_AVATARS = [
  { id: 1, name: 'Dr. Sarah', image: examiner1 },
  { id: 2, name: 'Dr. Laylah', image: examiner2 },
  { id: 3, name: 'Dr. Omar', image: examiner3 },
  { id: 4, name: 'Dr. Hani', image: examiner4 },
] as const;

export function getExaminerAvatar(avatarId: number = 1) {
  return EXAMINER_AVATARS.find(a => a.id === avatarId) ?? EXAMINER_AVATARS[0];
}

/** Dynamic hook to fetch active examiner avatars from the database */
export function useExaminerAvatars() {
  return useQuery({
    queryKey: ['examiner-avatars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('examiner_avatars')
        .select('id, name, image_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as { id: number; name: string; image_url: string }[];
    },
  });
}
