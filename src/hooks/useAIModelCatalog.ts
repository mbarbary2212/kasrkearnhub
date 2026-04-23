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

/**
 * Set a model as the default for its provider. Clears `is_default` on every
 * other model of the same provider in a single round-trip pair.
 */
export function useSetDefaultAIModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, provider }: { id: string; provider: AIProvider }) => {
      // Clear current default(s) for this provider
      const { error: clearErr } = await supabase
        .from('ai_model_catalog')
        .update({ is_default: false })
        .eq('provider', provider)
        .eq('is_default', true);
      if (clearErr) throw clearErr;
      // Set the new default
      const { error: setErr } = await supabase
        .from('ai_model_catalog')
        .update({ is_default: true, is_active: true })
        .eq('id', id);
      if (setErr) throw setErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-model-catalog'] });
      toast.success('Default model updated');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to set default: ${msg}`);
    },
  });
}

/**
 * Replace one catalog model with another:
 *  - Rewrites every `ai_settings` value that equals the old model_id (string keys)
 *    or contains the old model_id inside the `content_type_model_overrides` map.
 *  - Deactivates the old model (kept in DB for audit) and ensures the new one is active.
 *  - If the old model was default, transfers `is_default` to the new model.
 */
const SCALAR_MODEL_SETTING_KEYS = [
  'lovable_model',
  'gemini_model',
  'anthropic_model',
  'interactive_case_model',
  'interactive_case_marking_model',
  'case_authoring_model',
  'marking_model',
] as const;

export function useReplaceAIModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      oldModel,
      newModel,
    }: {
      oldModel: AIModelCatalogEntry;
      newModel: AIModelCatalogEntry;
    }) => {
      // 1) Pull all ai_settings rows we care about in one query.
      const allKeys = [...SCALAR_MODEL_SETTING_KEYS, 'content_type_model_overrides'];
      const { data: rows, error: fetchErr } = await supabase
        .from('ai_settings')
        .select('key, value')
        .in('key', allKeys);
      if (fetchErr) throw fetchErr;

      let migratedCount = 0;

      // 2) Rewrite scalar string-valued settings.
      for (const row of rows ?? []) {
        if (row.key === 'content_type_model_overrides') continue;
        // value is jsonb — could be a JSON string "model-id" or plain string.
        const v = row.value;
        const current = typeof v === 'string' ? v : (v as { value?: string })?.value ?? null;
        if (current === oldModel.model_id) {
          const { error } = await supabase
            .from('ai_settings')
            .update({ value: newModel.model_id as unknown as never })
            .eq('key', row.key);
          if (error) throw error;
          migratedCount++;
        }
      }

      // 3) Rewrite the content_type_model_overrides JSON map.
      const overrideRow = rows?.find((r) => r.key === 'content_type_model_overrides');
      if (overrideRow && overrideRow.value && typeof overrideRow.value === 'object') {
        const map = overrideRow.value as Record<string, string>;
        let changed = false;
        const next: Record<string, string> = {};
        for (const [k, val] of Object.entries(map)) {
          if (val === oldModel.model_id) {
            next[k] = newModel.model_id;
            changed = true;
            migratedCount++;
          } else {
            next[k] = val;
          }
        }
        if (changed) {
          const { error } = await supabase
            .from('ai_settings')
            .update({ value: next as unknown as never })
            .eq('key', 'content_type_model_overrides');
          if (error) throw error;
        }
      }

      // 4) Make sure the new model is active.
      if (!newModel.is_active) {
        const { error } = await supabase
          .from('ai_model_catalog')
          .update({ is_active: true })
          .eq('id', newModel.id);
        if (error) throw error;
      }

      // 5) Transfer default flag if old was default.
      if (oldModel.is_default) {
        await supabase
          .from('ai_model_catalog')
          .update({ is_default: false })
          .eq('provider', oldModel.provider)
          .eq('is_default', true);
        const { error } = await supabase
          .from('ai_model_catalog')
          .update({ is_default: true })
          .eq('id', newModel.id);
        if (error) throw error;
      }

      // 6) Deactivate the old model.
      const { error: deactErr } = await supabase
        .from('ai_model_catalog')
        .update({ is_active: false, is_default: false })
        .eq('id', oldModel.id);
      if (deactErr) throw deactErr;

      return { migratedCount };
    },
    onSuccess: ({ migratedCount }) => {
      qc.invalidateQueries({ queryKey: ['ai-model-catalog'] });
      qc.invalidateQueries({ queryKey: ['ai-settings'] });
      toast.success(
        migratedCount > 0
          ? `Model replaced — ${migratedCount} setting${migratedCount === 1 ? '' : 's'} migrated`
          : 'Model replaced — no active references found'
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to replace model: ${msg}`);
    },
  });
}
