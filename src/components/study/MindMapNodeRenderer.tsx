import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface MindMapNode {
  id: string | number;
  label: string;
  parent_id?: string | number | null;
  color?: string;
}

export interface MindMapConnection {
  from: string | number;
  to: string | number;
  label?: string;
}

interface MindMapNodeRendererProps {
  centralConcept: string;
  nodes: MindMapNode[];
  connections?: MindMapConnection[];
  className?: string;
}

interface TreeNode extends MindMapNode {
  children: TreeNode[];
  depth: number;
}

// Build tree structure from flat nodes
function buildTree(nodes: MindMapNode[], centralConcept: string): TreeNode {
  const nodeMap = new Map<string | number, TreeNode>();
  
  // Find root nodes (no parent_id or parent_id is null)
  const rootNodes = nodes.filter(n => n.parent_id == null);
  
  // Create tree nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [], depth: 0 });
  });
  
  // Link children to parents
  nodes.forEach(node => {
    if (node.parent_id != null && nodeMap.has(node.parent_id)) {
      const parent = nodeMap.get(node.parent_id)!;
      const child = nodeMap.get(node.id)!;
      child.depth = parent.depth + 1;
      parent.children.push(child);
    }
  });
  
  // Create virtual root for central concept
  const root: TreeNode = {
    id: '__root__',
    label: centralConcept,
    color: 'hsl(var(--primary))',
    children: rootNodes.map(n => {
      const tn = nodeMap.get(n.id)!;
      tn.depth = 1;
      // Recursively set depth for children
      const setDepth = (node: TreeNode, depth: number) => {
        node.depth = depth;
        node.children.forEach(c => setDepth(c, depth + 1));
      };
      setDepth(tn, 1);
      return tn;
    }),
    depth: 0,
  };
  
  return root;
}

// Color palette for nodes without explicit color
const NODE_COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(180, 70%, 40%)',
];

function NodeCard({ node, depth }: { node: TreeNode; depth: number }) {
  const bgColor = node.color || NODE_COLORS[depth % NODE_COLORS.length];
  const isRoot = node.id === '__root__';
  
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "px-3 py-2 rounded-lg text-white font-medium text-sm text-center shadow-md transition-transform hover:scale-105",
          isRoot && "px-4 py-3 text-base font-bold"
        )}
        style={{ 
          backgroundColor: bgColor,
          maxWidth: isRoot ? '250px' : '200px',
        }}
      >
        {node.label}
      </div>
      
      {node.children.length > 0 && (
        <>
          {/* Connector line down */}
          <div className="w-0.5 h-4 bg-border" />
          
          {/* Horizontal line for multiple children */}
          {node.children.length > 1 && (
            <div 
              className="h-0.5 bg-border"
              style={{ width: `${Math.min(node.children.length * 120, 600)}px` }}
            />
          )}
          
          {/* Children container */}
          <div className="flex gap-2 items-start">
            {node.children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Connector line down to child */}
                <div className="w-0.5 h-4 bg-border" />
                <NodeCard node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function MindMapNodeRenderer({
  centralConcept,
  nodes,
  connections,
  className,
}: MindMapNodeRendererProps) {
  const tree = useMemo(() => buildTree(nodes, centralConcept), [nodes, centralConcept]);
  
  if (!nodes.length) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No mind map nodes to display
      </div>
    );
  }
  
  return (
    <div className={cn("overflow-auto p-6", className)}>
      <div className="min-w-max flex justify-center">
        <NodeCard node={tree} depth={0} />
      </div>
    </div>
  );
}