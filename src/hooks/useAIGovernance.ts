import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// AI Rules hooks
// ============================================

export interface AIRule {
  id: string;
  scope: string;
  module_id: string | null;
  chapter_id: string | null;
  content_type: string;
  instructions: string;
  version: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  notes: string | null;
}

export function useAIRules(contentType?: string) {
  return useQuery({
    queryKey: ['ai-rules', contentType],
    queryFn: async () => {
      let query = supabase
        .from('ai_rules')
        .select('*')
        .order('content_type')
        .order('version', { ascending: false });

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIRule[];
    },
  });
}

export function useActiveAIRules() {
  return useQuery({
    queryKey: ['ai-rules', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_rules')
        .select('*')
        .eq('is_active', true)
        .eq('scope', 'global')
        .order('content_type');

      if (error) throw error;
      return data as AIRule[];
    },
  });
}

export function useCreateAIRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      scope: string;
      module_id?: string | null;
      chapter_id?: string | null;
      content_type: string;
      instructions: string;
      notes?: string;
      is_active?: boolean;
    }) => {
      // Get next version number
      const { data: existing } = await supabase
        .from('ai_rules')
        .select('version')
        .eq('scope', rule.scope)
        .eq('content_type', rule.content_type)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version || 0) + 1;

      // If activating, deactivate existing active rule
      if (rule.is_active) {
        await supabase
          .from('ai_rules')
          .update({ is_active: false })
          .eq('scope', rule.scope)
          .eq('content_type', rule.content_type)
          .eq('is_active', true);
      }

      const { data, error } = await supabase
        .from('ai_rules')
        .insert({
          ...rule,
          version: nextVersion,
          is_active: rule.is_active ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rules'] });
      toast.success('AI rule saved');
    },
    onError: (error) => {
      toast.error(`Failed to save rule: ${error.message}`);
    },
  });
}

export function useActivateAIRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, scope, contentType }: { ruleId: string; scope: string; contentType: string }) => {
      // Deactivate current active rule for this scope+content_type
      await supabase
        .from('ai_rules')
        .update({ is_active: false })
        .eq('scope', scope)
        .eq('content_type', contentType)
        .eq('is_active', true);

      // Activate the selected rule
      const { error } = await supabase
        .from('ai_rules')
        .update({ is_active: true })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rules'] });
      toast.success('Rule activated');
    },
    onError: (error) => {
      toast.error(`Failed to activate rule: ${error.message}`);
    },
  });
}

// ============================================
// Platform Settings hooks
// ============================================

export interface AIPlatformSettings {
  allow_superadmin_global_ai: boolean;
  allow_admin_fallback_to_global_key: boolean;
  global_key_disabled_message: string;
}

export function useAIPlatformSettings() {
  return useQuery({
    queryKey: ['ai-platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_platform_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      return data as AIPlatformSettings;
    },
  });
}

export function useUpdateAIPlatformSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<AIPlatformSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ai_platform_settings')
        .update({ ...updates, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-platform-settings'] });
      toast.success('Platform settings updated');
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

// ============================================
// Admin API Key hooks
// ============================================

export interface AdminApiKeyStatus {
  has_key: boolean;
  key_hint: string | null;
  provider: string | null;
  created_at: string | null;
  revoked: boolean;
}

export function useAdminApiKeyStatus(enabled = true) {
  return useQuery({
    queryKey: ['admin-api-key-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-admin-api-key', {
        method: 'GET',
      });

      if (error) throw error;
      return data as AdminApiKeyStatus;
    },
    enabled,
  });
}

export function useSaveAdminApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ api_key, provider = 'gemini' }: { api_key: string; provider?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-admin-api-key', {
        body: { api_key, provider },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-key-status'] });
      toast.success('API key saved securely');
    },
    onError: (error) => {
      toast.error(`Failed to save API key: ${error.message}`);
    },
  });
}

export function useRevokeAdminApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-admin-api-key', {
        method: 'DELETE',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-key-status'] });
      toast.success('API key revoked');
    },
    onError: (error) => {
      toast.error(`Failed to revoke API key: ${error.message}`);
    },
  });
}
