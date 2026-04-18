import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamCredit {
  id: string;
  name: string;
  role: string;
  email: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
}

export function useTeamCredits() {
  return useQuery({
    queryKey: ['team-credits', 'active'],
    queryFn: async (): Promise<TeamCredit[]> => {
      const { data, error } = await supabase
        .from('team_credits')
        .select('id, name, role, email, photo_url, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamCredit[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllTeamCredits() {
  return useQuery({
    queryKey: ['team-credits', 'all'],
    queryFn: async (): Promise<TeamCredit[]> => {
      const { data, error } = await supabase
        .from('team_credits')
        .select('id, name, role, email, photo_url, display_order, is_active')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamCredit[];
    },
  });
}
