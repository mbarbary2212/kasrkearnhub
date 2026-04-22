import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AIProvider = 'lovable' | 'gemini' | 'anthropic' | 'groq';

export interface AIModelCatalogEntry {
  id: string;
  provider: AIProvider;
  model_id: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useAIModelCatalog(provider?: AIProvider, opts?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['ai-model-catalog', provider ?? 'all', opts?.activeOnly ?? false],
    queryFn: async () => {
      let q = supabase
        .from('ai_model_catalog')
        .select('*')
        .order('provider')
        .order('sort_order')
        .order('label');
      if (provider) q = q.eq('provider', provider);
      if (opts?.activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data as AIModelCatalogEntry[];
    },
  });
}

export function useUpsertAIModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      provider: AIProvider;
      model_id: string;
      label: string;
      is_active?: boolean;
      is_default?: boolean;
      sort_order?: number;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...input,
        is_active: input.is_active ?? true,
        is_default: input.is_default ?? false,
        sort_order: input.sort_order ?? 100,
        created_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('ai_model_catalog')
        .upsert(payload, { onConflict: 'provider,model_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-model-catalog'] });
      toast.success('Model saved');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to save model: ${msg}`);
    },
  });
}

export function useUpdateAIModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AIModelCatalogEntry> }) => {
      const { data, error } = await supabase
        .from('ai_model_catalog')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-model-catalog'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update model: ${msg}`);
    },
  });
}

export function useDeleteAIModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_model_catalog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-model-catalog'] });
      toast.success('Model removed');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to delete model: ${msg}`);
    },
  });
}
