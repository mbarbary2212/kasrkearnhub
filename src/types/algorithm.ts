// Interactive Algorithm decision-tree types

export type AlgorithmNodeType = 'decision' | 'action' | 'information' | 'emergency' | 'end';

export interface AlgorithmOption {
  id: string;
  text: string;
  next_node_id: string | null;
}

export interface AlgorithmNode {
  id: string;
  type: AlgorithmNodeType;
  content: string;
  /** Only for 'decision' type */
  options?: AlgorithmOption[];
  /** For non-decision types, the next node to navigate to */
  next_node_id?: string | null;
}

export interface AlgorithmJson {
  nodes: AlgorithmNode[];
  start_node_id: string | null;
}

export interface InteractiveAlgorithm {
  id: string;
  title: string;
  module_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  algorithm_json: AlgorithmJson;
  description: string | null;
  display_order: number;
  is_deleted: boolean;
  section_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteractiveAlgorithmInsert {
  title: string;
  module_id: string;
  chapter_id?: string | null;
  topic_id?: string | null;
  algorithm_json: AlgorithmJson;
  description?: string | null;
  display_order?: number;
  section_id?: string | null;
}

// Node type display configuration
export const NODE_TYPE_CONFIG: Record<AlgorithmNodeType, { label: string; color: string; icon: string }> = {
  decision: { label: 'Decision', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', icon: '🔀' },
  action: { label: 'Action', color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700', icon: '⚡' },
  information: { label: 'Information', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700', icon: 'ℹ️' },
  emergency: { label: 'Emergency', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700', icon: '🚨' },
  end: { label: 'End', color: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700', icon: '🏁' },
};
