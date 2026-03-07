import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExaminerAvatar {
  id: number;
  name: string;
  image_url: string;
}

/** Fetch all active examiner avatars from the database */
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
      return data as ExaminerAvatar[];
    },
  });
}

/** Fetch a single examiner avatar by ID */
export function useExaminerAvatarById(avatarId?: number) {
  return useQuery({
    queryKey: ['examiner-avatar', avatarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('examiner_avatars')
        .select('id, name, image_url')
        .eq('id', avatarId!)
        .single();

      if (error) throw error;
      return data as ExaminerAvatar;
    },
    enabled: !!avatarId,
  });
}
