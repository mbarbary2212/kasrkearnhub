import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MindMapPrompt {
  id: string;
  name: string;
  prompt_type: 'full' | 'section' | 'ultra';
  system_prompt: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['mind-map-prompts'];

export function useMindMapPrompts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mind_map_prompts' as any)
        .select('*')
        .order('prompt_type')
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data as unknown as MindMapPrompt[]) || [];
    },
  });
}

export function useDefaultPrompt(type: 'full' | 'section' | 'ultra') {
  return useQuery({
    queryKey: [...QUERY_KEY, 'default', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mind_map_prompts' as any)
        .select('*')
        .eq('prompt_type', type)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MindMapPrompt | null;
    },
  });
}

export function useUpsertMindMapPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prompt: Partial<MindMapPrompt> & { name: string; prompt_type: string; system_prompt: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      if (prompt.id) {
        const { data, error } = await supabase
          .from('mind_map_prompts' as any)
          .update({
            name: prompt.name,
            prompt_type: prompt.prompt_type,
            system_prompt: prompt.system_prompt,
            is_default: prompt.is_default ?? false,
          })
          .eq('id', prompt.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('mind_map_prompts' as any)
          .insert({
            name: prompt.name,
            prompt_type: prompt.prompt_type,
            system_prompt: prompt.system_prompt,
            is_default: prompt.is_default ?? false,
            created_by: userData.user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Prompt saved');
    },
    onError: (err: Error) => {
      toast.error('Failed to save prompt: ' + err.message);
    },
  });
}

export function useDeleteMindMapPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mind_map_prompts' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Prompt deleted');
    },
    onError: (err: Error) => {
      toast.error('Failed to delete prompt: ' + err.message);
    },
  });
}

export function useSetDefaultPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, prompt_type }: { id: string; prompt_type: string }) => {
      // Unset current defaults for this type
      await supabase
        .from('mind_map_prompts' as any)
        .update({ is_default: false })
        .eq('prompt_type', prompt_type)
        .eq('is_default', true);
      // Set new default
      const { error } = await supabase
        .from('mind_map_prompts' as any)
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Default prompt updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to set default: ' + err.message);
    },
  });
}
