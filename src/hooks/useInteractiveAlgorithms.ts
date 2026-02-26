import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InteractiveAlgorithm, InteractiveAlgorithmInsert, AlgorithmJson, AlgorithmNode } from '@/types/algorithm';

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

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  stats: {
    totalNodes: number;
    decisionNodes: number;
    terminalNodes: number;
    longestPath: number;
    unreachableNodes: string[];
  };
}

export function validateAlgorithmGraph(json: AlgorithmJson): GraphValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set(json.nodes.map(n => n.id));
  const nodeMap = new Map<string, AlgorithmNode>();
  json.nodes.forEach(n => nodeMap.set(n.id, n));

  let decisionNodes = 0;
  let terminalNodes = 0;

  // 1. Validate start node exists
  if (!json.start_node_id || !nodeIds.has(json.start_node_id)) {
    errors.push(`Start node "${json.start_node_id}" does not exist.`);
  }

  // 2. Validate each node's outgoing references
  for (const node of json.nodes) {
    if (node.type === 'decision') {
      decisionNodes++;
      if (!node.options || node.options.length === 0) {
        errors.push(`Decision node "${node.id}" has no options.`);
      } else {
        for (const opt of node.options) {
          if (opt.next_node_id && !nodeIds.has(opt.next_node_id)) {
            errors.push(`Node "${node.id}" option "${opt.text}" references missing node "${opt.next_node_id}".`);
          }
        }
      }
    } else if (node.type === 'end') {
      terminalNodes++;
    } else {
      // action / information / emergency must have a next_node_id
      if (!node.next_node_id) {
        errors.push(`Node "${node.id}" (${node.type}) has no next_node — it will cause premature termination. Set type to "end" if intentional.`);
      } else if (!nodeIds.has(node.next_node_id)) {
        errors.push(`Node "${node.id}" references missing node "${node.next_node_id}".`);
      }
    }
  }

  // 3. Check for at least one end node
  if (terminalNodes === 0) {
    errors.push('No "end" type node found. Pathway must have at least one explicit end node.');
  }

  // 4. Find unreachable nodes via BFS from start
  const reachable = new Set<string>();
  if (json.start_node_id && nodeIds.has(json.start_node_id)) {
    const queue = [json.start_node_id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const n = nodeMap.get(id);
      if (!n) continue;
      if (n.type === 'decision' && n.options) {
        for (const opt of n.options) {
          if (opt.next_node_id && nodeIds.has(opt.next_node_id)) queue.push(opt.next_node_id);
        }
      } else if (n.next_node_id && nodeIds.has(n.next_node_id)) {
        queue.push(n.next_node_id);
      }
    }
  }
  const unreachableNodes = json.nodes.filter(n => !reachable.has(n.id)).map(n => n.id);
  if (unreachableNodes.length > 0) {
    errors.push(`Unreachable nodes (disconnected from start): ${unreachableNodes.join(', ')}`);
  }

  // 5. Check at least one path from start reaches an end node
  const reachesEnd = new Set<string>();
  // reverse BFS from end nodes
  const endNodeIds = json.nodes.filter(n => n.type === 'end').map(n => n.id);
  const reverseAdj = new Map<string, string[]>();
  for (const n of json.nodes) {
    if (n.type === 'decision' && n.options) {
      for (const opt of n.options) {
        if (opt.next_node_id) {
          if (!reverseAdj.has(opt.next_node_id)) reverseAdj.set(opt.next_node_id, []);
          reverseAdj.get(opt.next_node_id)!.push(n.id);
        }
      }
    } else if (n.next_node_id) {
      if (!reverseAdj.has(n.next_node_id)) reverseAdj.set(n.next_node_id, []);
      reverseAdj.get(n.next_node_id)!.push(n.id);
    }
  }
  const revQueue = [...endNodeIds];
  while (revQueue.length > 0) {
    const id = revQueue.shift()!;
    if (reachesEnd.has(id)) continue;
    reachesEnd.add(id);
    for (const parent of (reverseAdj.get(id) || [])) {
      revQueue.push(parent);
    }
  }
  if (json.start_node_id && !reachesEnd.has(json.start_node_id) && terminalNodes > 0) {
    errors.push('No valid path exists from the start node to any end node.');
  }

  // 6. Compute longest path depth via DFS
  let longestPath = 0;
  if (json.start_node_id && nodeIds.has(json.start_node_id)) {
    const visited = new Set<string>();
    const dfs = (id: string, depth: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      longestPath = Math.max(longestPath, depth);
      const n = nodeMap.get(id);
      if (!n) return;
      if (n.type === 'decision' && n.options) {
        for (const opt of n.options) {
          if (opt.next_node_id && nodeIds.has(opt.next_node_id)) dfs(opt.next_node_id, depth + 1);
        }
      } else if (n.next_node_id && nodeIds.has(n.next_node_id)) {
        dfs(n.next_node_id, depth + 1);
      }
      visited.delete(id); // allow visiting via different paths
    };
    dfs(json.start_node_id, 1);
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      totalNodes: json.nodes.length,
      decisionNodes,
      terminalNodes,
      longestPath,
      unreachableNodes,
    },
  };
}

export function parseAlgorithmCsv(csvText: string): { title: string; json: AlgorithmJson }[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
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
  const grouped = new Map<string, Row[]>();
  type Row = { node_id: string; step_type: string; content: string; option_text: string; next_node: string };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < Math.max(titleIdx, nodeIdx, typeIdx, contentIdx) + 1) continue;
    const title = cols[titleIdx];
    if (!title) continue;
    const row: Row = {
      node_id: cols[nodeIdx],
      step_type: cols[typeIdx].toLowerCase(),
      content: cols[contentIdx] || '',
      option_text: optionIdx >= 0 && optionIdx < cols.length ? cols[optionIdx] : '',
      next_node: nextIdx >= 0 && nextIdx < cols.length ? cols[nextIdx] : '',
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
