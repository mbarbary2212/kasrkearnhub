import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InteractiveAlgorithm, InteractiveAlgorithmInsert, AlgorithmJson } from '@/types/algorithm';

export function useChapterAlgorithms(chapterId?: string) {
  return useQuery({
    queryKey: ['interactive-algorithms', 'chapter', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactive_algorithms' as any)
        .select('*')
        .eq('chapter_id', chapterId!)
        .eq('is_deleted', false)
        .order('display_order');
      if (error) throw error;
      return (data as unknown as InteractiveAlgorithm[]) ?? [];
    },
    enabled: !!chapterId,
  });
}

export function useTopicAlgorithms(topicId?: string) {
  return useQuery({
    queryKey: ['interactive-algorithms', 'topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactive_algorithms' as any)
        .select('*')
        .eq('topic_id', topicId!)
        .eq('is_deleted', false)
        .order('display_order');
      if (error) throw error;
      return (data as unknown as InteractiveAlgorithm[]) ?? [];
    },
    enabled: !!topicId,
  });
}

export function useCreateInteractiveAlgorithm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alg: InteractiveAlgorithmInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('interactive_algorithms' as any)
        .insert({
          ...alg,
          created_by: userData.user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InteractiveAlgorithm;
    },
    onSuccess: (data) => {
      if (data.chapter_id) qc.invalidateQueries({ queryKey: ['interactive-algorithms', 'chapter', data.chapter_id] });
      if (data.topic_id) qc.invalidateQueries({ queryKey: ['interactive-algorithms', 'topic', data.topic_id] });
    },
  });
}

export function useUpdateInteractiveAlgorithm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InteractiveAlgorithm> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('interactive_algorithms' as any)
        .update({ ...updates, updated_by: userData.user?.id } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InteractiveAlgorithm;
    },
    onSuccess: (data) => {
      if (data.chapter_id) qc.invalidateQueries({ queryKey: ['interactive-algorithms', 'chapter', data.chapter_id] });
      if (data.topic_id) qc.invalidateQueries({ queryKey: ['interactive-algorithms', 'topic', data.topic_id] });
    },
  });
}

export function useDeleteInteractiveAlgorithm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, chapterId, topicId }: { id: string; chapterId?: string; topicId?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('interactive_algorithms' as any)
        .update({ is_deleted: true, updated_by: userData.user?.id } as any)
        .eq('id', id);
      if (error) throw error;
      return { id, chapterId, topicId };
    },
    onSuccess: (data) => {
      if (data.chapterId) qc.invalidateQueries({ queryKey: ['interactive-algorithms', 'chapter', data.chapterId] });
      if (data.topicId) qc.invalidateQueries({ queryKey: ['interactive-algorithms', 'topic', data.topicId] });
    },
  });
}

// Parse CSV rows into AlgorithmJson grouped by title
export function parseAlgorithmCsv(csvText: string): { title: string; json: AlgorithmJson }[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const titleIdx = Math.max(header.indexOf('pathway_title'), header.indexOf('algorithm_title'));
  const nodeIdx = header.indexOf('node_id');
  const typeIdx = header.indexOf('step_type');
  const contentIdx = header.indexOf('content');
  const optionIdx = header.indexOf('option_text');
  const nextIdx = header.indexOf('next_node');

  if ([titleIdx, nodeIdx, typeIdx, contentIdx].some(i => i === -1)) {
    throw new Error('CSV must have columns: pathway_title, node_id, step_type, content, option_text, next_node');
  }

  // Group rows by algorithm title
  const grouped = new Map<string, typeof rows>();
  type Row = { node_id: string; step_type: string; content: string; option_text: string; next_node: string };
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < header.length) continue;
    const title = cols[titleIdx];
    const row = {
      node_id: cols[nodeIdx],
      step_type: cols[typeIdx].toLowerCase(),
      content: cols[contentIdx],
      option_text: cols[optionIdx] || '',
      next_node: cols[nextIdx] || '',
    };
    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title)!.push(row);
  }

  const results: { title: string; json: AlgorithmJson }[] = [];

  for (const [title, algRows] of grouped) {
    // Build nodes from rows — group options per node_id for decision nodes
    const nodeMap = new Map<string, { type: string; content: string; options: { text: string; next: string }[]; next: string }>();
    
    for (const row of algRows) {
      if (!nodeMap.has(row.node_id)) {
        nodeMap.set(row.node_id, { type: row.step_type, content: row.content, options: [], next: row.next_node });
      }
      if (row.option_text) {
        nodeMap.get(row.node_id)!.options.push({ text: row.option_text, next: row.next_node });
      }
    }

    const nodes = Array.from(nodeMap.entries()).map(([id, n]) => ({
      id,
      type: n.type as any,
      content: n.content,
      ...(n.type === 'decision'
        ? { options: n.options.map((o, idx) => ({ id: `${id}_opt_${idx}`, text: o.text, next_node_id: o.next || null })) }
        : { next_node_id: n.next || null }),
    }));

    const firstNodeId = algRows[0]?.node_id || null;
    results.push({ title, json: { nodes, start_node_id: firstNodeId } });
  }

  return results;
}
