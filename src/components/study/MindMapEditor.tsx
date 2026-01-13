import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Palette, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MindMapNode } from './MindMapNodeRenderer';
import { cn } from '@/lib/utils';

// Extended content type for AI-generated or editor-created mind maps
export interface MindMapStructuredContent {
  imageUrl?: string;
  description?: string;
  central_concept?: string;
  nodes?: MindMapNode[];
}

interface MindMapEditorProps {
  content: MindMapStructuredContent;
  onChange: (content: MindMapStructuredContent) => void;
}

const COLOR_OPTIONS = [
  { value: 'hsl(var(--primary))', label: 'Primary', class: 'bg-primary' },
  { value: 'hsl(217, 91%, 60%)', label: 'Blue', class: 'bg-blue-500' },
  { value: 'hsl(262, 83%, 58%)', label: 'Purple', class: 'bg-purple-500' },
  { value: 'hsl(142, 76%, 36%)', label: 'Green', class: 'bg-green-600' },
  { value: 'hsl(38, 92%, 50%)', label: 'Orange', class: 'bg-orange-500' },
  { value: 'hsl(0, 84%, 60%)', label: 'Red', class: 'bg-red-500' },
  { value: 'hsl(180, 70%, 40%)', label: 'Teal', class: 'bg-teal-500' },
  { value: 'hsl(280, 70%, 50%)', label: 'Violet', class: 'bg-violet-500' },
];

export function MindMapEditor({ content, onChange }: MindMapEditorProps) {
  const nodes = content.nodes || [];
  const centralConcept = content.central_concept || '';
  
  const updateCentralConcept = useCallback((value: string) => {
    onChange({ ...content, central_concept: value });
  }, [content, onChange]);
  
  const addNode = useCallback(() => {
    const newId = `node_${Date.now()}`;
    const newNode: MindMapNode = {
      id: newId,
      label: '',
      parent_id: null,
      color: undefined,
    };
    onChange({ ...content, nodes: [...nodes, newNode] });
  }, [content, nodes, onChange]);
  
  const updateNode = useCallback((id: string | number, updates: Partial<MindMapNode>) => {
    const newNodes = nodes.map(node => 
      node.id === id ? { ...node, ...updates } : node
    );
    onChange({ ...content, nodes: newNodes });
  }, [content, nodes, onChange]);
  
  const removeNode = useCallback((id: string | number) => {
    // Remove node and all its children recursively
    const getDescendantIds = (nodeId: string | number): (string | number)[] => {
      const children = nodes.filter(n => n.parent_id === nodeId);
      return [nodeId, ...children.flatMap(c => getDescendantIds(c.id))];
    };
    const idsToRemove = new Set(getDescendantIds(id));
    onChange({ ...content, nodes: nodes.filter(n => !idsToRemove.has(n.id)) });
  }, [content, nodes, onChange]);
  
  // Group nodes by parent for visual hierarchy in editor
  const nodesByParent = useMemo(() => {
    const map = new Map<string | number | null, MindMapNode[]>();
    map.set(null, []);
    
    nodes.forEach(node => {
      const parentId = node.parent_id ?? null;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(node);
    });
    
    return map;
  }, [nodes]);
  
  // Get depth of a node for indentation
  const getNodeDepth = useCallback((nodeId: string | number | null): number => {
    if (nodeId === null) return 0;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    return 1 + getNodeDepth(node.parent_id ?? null);
  }, [nodes]);
  
  // Flatten nodes in tree order for display
  const orderedNodes = useMemo(() => {
    const result: { node: MindMapNode; depth: number }[] = [];
    
    const addChildren = (parentId: string | number | null, depth: number) => {
      const children = nodesByParent.get(parentId) || [];
      children.forEach(child => {
        result.push({ node: child, depth });
        addChildren(child.id, depth + 1);
      });
    };
    
    addChildren(null, 0);
    return result;
  }, [nodesByParent]);
  
  // Get available parent options for a node (exclude self and descendants)
  const getParentOptions = useCallback((nodeId: string | number) => {
    const getDescendantIds = (id: string | number): Set<string | number> => {
      const children = nodes.filter(n => n.parent_id === id);
      const ids = new Set<string | number>([id]);
      children.forEach(c => {
        getDescendantIds(c.id).forEach(cid => ids.add(cid));
      });
      return ids;
    };
    
    const excludeIds = getDescendantIds(nodeId);
    return nodes.filter(n => !excludeIds.has(n.id));
  }, [nodes]);
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Central Concept</Label>
        <Input
          value={centralConcept}
          onChange={(e) => updateCentralConcept(e.target.value)}
          placeholder="Main topic of the mind map"
          className="font-medium"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Nodes</Label>
          <Button size="sm" variant="outline" onClick={addNode}>
            <Plus className="w-3 h-3 mr-1" />
            Add Node
          </Button>
        </div>
        
        <div className="space-y-2 border rounded-lg p-3 max-h-[400px] overflow-y-auto">
          {orderedNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No nodes yet. Click "Add Node" to create your first node.
            </p>
          ) : (
            orderedNodes.map(({ node, depth }) => (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 rounded border bg-card"
                style={{ marginLeft: depth * 20 }}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                
                <Input
                  value={node.label}
                  onChange={(e) => updateNode(node.id, { label: e.target.value })}
                  placeholder="Node label"
                  className="flex-1 h-8 text-sm"
                />
                
                <Select
                  value={node.parent_id?.toString() || '__none__'}
                  onValueChange={(v) => updateNode(node.id, { 
                    parent_id: v === '__none__' ? null : v 
                  })}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Root level</span>
                    </SelectItem>
                    {getParentOptions(node.id).map(n => (
                      <SelectItem key={n.id} value={n.id.toString()}>
                        {n.label || `(Node ${n.id})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                    >
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: node.color || 'hsl(var(--primary))' }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                            node.color === color.value && "ring-2 ring-offset-2 ring-primary"
                          )}
                          style={{ backgroundColor: color.value }}
                          onClick={() => updateNode(node.id, { color: color.value })}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeNode(node.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {content.description !== undefined && (
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Input
            value={content.description || ''}
            onChange={(e) => onChange({ ...content, description: e.target.value })}
            placeholder="Brief description of this mind map"
          />
        </div>
      )}
    </div>
  );
}