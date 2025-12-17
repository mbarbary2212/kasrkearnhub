import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch lectures for a module
export function useModuleLectures(moduleId?: string) {
  return useQuery({
    queryKey: ['module-lectures', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch resources for a module
export function useModuleResources(moduleId?: string) {
  return useQuery({
    queryKey: ['module-resources', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch MCQ sets for a module
export function useModuleMcqSets(moduleId?: string) {
  return useQuery({
    queryKey: ['module-mcq-sets', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcq_sets')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch essays for a module
export function useModuleEssays(moduleId?: string) {
  return useQuery({
    queryKey: ['module-essays', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch practicals for a module
export function useModulePracticals(moduleId?: string) {
  return useQuery({
    queryKey: ['module-practicals', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practicals')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch clinical cases for a module
export function useModuleClinicalCases(moduleId?: string) {
  return useQuery({
    queryKey: ['module-clinical-cases', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_cases')
        .select('*')
        .eq('module_id', moduleId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}
