import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AISetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export function useAISettings() {
  return useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      return data as AISetting[];
    },
  });
}

export function useAISetting(key: string) {
  return useQuery({
    queryKey: ['ai-settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) throw error;
      return data as AISetting;
    },
  });
}

export function useIsAIContentFactoryEnabled() {
  return useQuery({
    queryKey: ['ai-settings', 'ai_content_factory_enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('value')
        .eq('key', 'ai_content_factory_enabled')
        .single();

      if (error) {
        console.error('Error fetching AI factory status:', error);
        return true; // Default to enabled if setting not found
      }
      return data?.value === true;
    },
  });
}

export function useUpdateAISetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Cast value to Json type for Supabase
      const jsonValue = value as import('@/integrations/supabase/types').Json;
      
      // Upsert by key so save works even when the row doesn't exist yet.
      const { data, error } = await supabase
        .from('ai_settings')
        .upsert(
          {
            key,
            value: jsonValue,
            updated_by: user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) {
        console.error('[useUpdateAISetting] upsert failed', { key, error });
        throw error;
      }
      return data;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-settings', key] });
      toast.success('AI setting updated successfully');
    },
    onError: (error: unknown, variables) => {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating AI setting:', { key: variables?.key, error });
      toast.error(`Failed to save "${variables?.key}": ${msg}`);
    },
  });
}

// Helper to get typed setting value
export function getSettingValue<T>(settings: AISetting[] | undefined, key: string, defaultValue: T): T {
  if (!settings) return defaultValue;
  const setting = settings.find(s => s.key === key);
  if (!setting) return defaultValue;
  return setting.value as T;
}
