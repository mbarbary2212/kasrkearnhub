import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Year } from '@/types/curriculum';

export function useYears() {
  return useQuery({
    queryKey: ['years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Year[];
    },
  });
}

export function useYear(yearNumber: number) {
  return useQuery({
    queryKey: ['year', yearNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('number', yearNumber)
        .maybeSingle();

      if (error) throw error;
      return data as Year | null;
    },
    enabled: !!yearNumber,
  });
}

export function useYearById(yearId: string) {
  return useQuery({
    queryKey: ['year-by-id', yearId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .eq('id', yearId)
        .maybeSingle();

      if (error) throw error;
      return data as Year | null;
    },
    enabled: !!yearId,
  });
}
