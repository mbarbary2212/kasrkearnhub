import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/types/database';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useDepartmentsByYear(year: number) {
  return useQuery({
    queryKey: ['departments', 'year', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .contains('years', [year])
        .order('display_order');

      if (error) throw error;
      return data as Department[];
    },
    enabled: year >= 1 && year <= 5,
  });
}

export function useDepartment(slug: string) {
  return useQuery({
    queryKey: ['department', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as Department | null;
    },
    enabled: !!slug,
  });
}
