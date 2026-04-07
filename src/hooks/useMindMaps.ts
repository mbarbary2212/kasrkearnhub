import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MindMap {
  id: string;
  chapter_id: string | null;
  topic_id: string | null;
  section_id: string | null;
  title: string;
  map_type: 'full' | 'section' | 'ultra';
  source_type: 'generated_markdown' | 'legacy_html';
  section_key: string | null;
  section_title: string | null;
  section_number: string | null;
  markdown_content: string | null;
  html_content: string | null;
  html_file_url: string | null;
  source_pdf_url: string | null;
  source_detection_metadata: Record<string, unknown> | null;
  prompt_version: string | null;
  status: 'draft' | 'published';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateMindMapRequest {
  chapter_id?: string;
  topic_id?: string;
  generation_mode: 'full' | 'sections' | 'both';
  document_id?: string;
}

export interface GenerationResultItem {
  type: string;
  title: string;
  success: boolean;
  status?: 'generated' | 'failed' | 'skipped';
  mapId?: string;
  errors?: string[];
}

export interface GenerateMindMapResponse {
  success: boolean;
  generation_mode: string;
  source_document?: {
    name: string | null;
    id: string | null;
    pdf_size: number;
    method: string;
  };
  results: GenerationResultItem[];
  total_generated: number;
  total_failed: number;
  total_skipped: number;
}

const QUERY_KEY = ['mind-maps'];

export function useMindMaps(chapterId?: string, topicId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, chapterId, topicId],
    enabled: !!(chapterId || topicId),
    queryFn: async () => {
      let query = supabase.from('mind_maps' as any).select('*');
      if (chapterId) query = query.eq('chapter_id', chapterId);
      else if (topicId) query = query.eq('topic_id', topicId);
      query = query.order('map_type').order('section_number', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as MindMap[]) || [];
    },
  });
}

/** Student-facing: only published AI-generated maps */
export function usePublishedMindMaps(chapterId?: string, topicId?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'published', chapterId, topicId],
    enabled: !!(chapterId || topicId),
    queryFn: async () => {
      let query = supabase
        .from('mind_maps' as any)
        .select('*')
        .eq('status', 'published');
      if (chapterId) query = query.eq('chapter_id', chapterId);
      else if (topicId) query = query.eq('topic_id', topicId);
      query = query
        .order('map_type')
        .order('section_number', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as MindMap[]) || [];
    },
  });
}

export function useGenerateMindMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: GenerateMindMapRequest) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mind-map`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(req),
        }
      );

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || json.error || 'Generation failed');
      return json as GenerateMindMapResponse;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, variables.chapter_id, variables.topic_id] });
      const ok = data.total_generated;
      const fail = data.total_failed;
      const skip = data.total_skipped || 0;
      if (ok > 0 && fail === 0 && skip === 0) {
        toast.success(`Generated ${ok} mind map${ok > 1 ? 's' : ''} as drafts`);
      } else if (ok > 0) {
        const parts = [`${ok} generated`];
        if (fail > 0) parts.push(`${fail} failed`);
        if (skip > 0) parts.push(`${skip} skipped`);
        toast.warning(parts.join(', '));
      } else {
        toast.error(`All ${fail + skip} generation${fail + skip > 1 ? 's' : ''} failed or skipped`);
      }
    },
    onError: (err: Error) => {
      toast.error('Mind map generation failed: ' + err.message);
    },
  });
}

export function useUpdateMindMapStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' }) => {
      const { error } = await supabase
        .from('mind_maps' as any)
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Status updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update status: ' + err.message);
    },
  });
}

export function useDeleteMindMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mind_maps' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Mind map deleted');
    },
    onError: (err: Error) => {
      toast.error('Failed to delete: ' + err.message);
    },
  });
}

export function useUpdateMindMapMarkdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, markdown_content }: { id: string; markdown_content: string }) => {
      const { error } = await supabase
        .from('mind_maps' as any)
        .update({ markdown_content, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Mind map updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to save: ' + err.message);
    },
  });
}

export function useUpdateMindMapSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, section_id }: { id: string; section_id: string | null }) => {
      const { error } = await supabase
        .from('mind_maps' as any)
        .update({ section_id } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Section updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update section: ' + err.message);
    },
  });
}
