import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlgorithmNode,
  AlgorithmNodeType,
  AlgorithmOption,
  AlgorithmJson,
  InteractiveAlgorithm,
  NODE_TYPE_CONFIG,
} from '@/types/algorithm';

interface AlgorithmBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, json: AlgorithmJson) => void;
  initial?: InteractiveAlgorithm | null;
  saving?: boolean;
}

function generateId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function AlgorithmBuilderModal({ open, onClose, onSave, initial, saving }: AlgorithmBuilderModalProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [nodes, setNodes] = useState<AlgorithmNode[]>(() => {
    if (initial?.algorithm_json?.nodes?.length) return initial.algorithm_json.nodes;
    const startId = generateId();
    return [{ id: startId, type: 'information', content: '', next_node_id: null }];
  });
  const [startNodeId, setStartNodeId] = useState<string>(
    initial?.algorithm_json?.start_node_id || nodes[0]?.id || ''
  );

  const addNode = () => {
    const newNode: AlgorithmNode = { id: generateId(), type: 'information', content: '', next_node_id: null };
    setNodes(prev => [...prev, newNode]);
  };

  const removeNode = (id: string) => {
    if (nodes.length <= 1) return;
    setNodes(prev => prev.filter(n => n.id !== id));
    if (startNodeId === id) setStartNodeId(nodes.find(n => n.id !== id)?.id || '');
  };

  const updateNode = (id: string, updates: Partial<AlgorithmNode>) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== id) return n;
        const updated = { ...n, ...updates };
        // When changing to decision, ensure options array exists
        if (updates.type === 'decision' && !updated.options?.length) {
          updated.options = [{ id: `${id}_opt_0`, text: '', next_node_id: null }];
        }
        // When changing away from decision, remove options
        if (updates.type && updates.type !== 'decision') {
          delete updated.options;
        }
        return updated;
      })
    );
  };

  const addOption = (nodeId: string) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId) return n;
        const options = [...(n.options || []), { id: `${nodeId}_opt_${(n.options?.length || 0)}`, text: '', next_node_id: null }];
        return { ...n, options };
      })
    );
  };

  const updateOption = (nodeId: string, optIdx: number, updates: Partial<AlgorithmOption>) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId || !n.options) return n;
        const options = n.options.map((o, i) => (i === optIdx ? { ...o, ...updates } : o));
        return { ...n, options };
      })
    );
  };

  const removeOption = (nodeId: string, optIdx: number) => {
    setNodes(prev =>
      prev.map(n => {
        if (n.id !== nodeId || !n.options) return n;
        return { ...n, options: n.options.filter((_, i) => i !== optIdx) };
      })
    );
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (nodes.length === 0) { toast.error('At least one step is required'); return; }
    if (nodes.some(n => !n.content.trim())) { toast.error('All steps must have content'); return; }
    
    const json: AlgorithmJson = { nodes, start_node_id: startNodeId || nodes[0]?.id || null };
    onSave(title.trim(), description.trim(), json);
  };

  const nodeLabel = (id: string) => {
    const idx = nodes.findIndex(n => n.id === id);
    const n = nodes[idx];
    if (!n) return id;
    return `Step ${idx + 1}: ${n.content.slice(0, 30) || '(empty)'}`;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Algorithm' : 'Create Algorithm'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <Label>Algorithm Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chest Pain Assessment" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={2} />
              </div>
            </div>

            {/* Start Node */}
            <div>
              <Label>Starting Step</Label>
              <Select value={startNodeId} onValueChange={setStartNodeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {nodes.map((n, i) => (
                    <SelectItem key={n.id} value={n.id}>Step {i + 1}: {n.content.slice(0, 40) || '(empty)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Steps ({nodes.length})</Label>
                <Button size="sm" variant="outline" onClick={addNode}>
                  <Plus className="w-3 h-3 mr-1" /> Add Step
                </Button>
              </div>

              {nodes.map((node, idx) => (
                <div
                  key={node.id}
                  className={`border rounded-lg p-4 space-y-3 ${NODE_TYPE_CONFIG[node.type].color}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Step {idx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {NODE_TYPE_CONFIG[node.type].icon} {NODE_TYPE_CONFIG[node.type].label}
                      </Badge>
                      {startNodeId === node.id && (
                        <Badge className="bg-primary text-primary-foreground text-xs">START</Badge>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeNode(node.id)} disabled={nodes.length <= 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Type selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Step Type</Label>
                      <Select value={node.type} onValueChange={v => updateNode(node.id, { type: v as AlgorithmNodeType })}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(NODE_TYPE_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {node.type !== 'decision' && node.type !== 'end' && (
                      <div>
                        <Label className="text-xs">Next Step</Label>
                        <Select value={node.next_node_id || '__none__'} onValueChange={v => updateNode(node.id, { next_node_id: v === '__none__' ? null : v })}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="(end)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None (end) —</SelectItem>
                            {nodes.filter(n => n.id !== node.id).map((n, i) => (
                              <SelectItem key={n.id} value={n.id}>{nodeLabel(n.id)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <Label className="text-xs">
                      {node.type === 'decision' ? 'Decision Question' : 'Content'}
                    </Label>
                    <Textarea
                      value={node.content}
                      onChange={e => updateNode(node.id, { content: e.target.value })}
                      placeholder={node.type === 'decision' ? 'What is the patient presenting with?' : 'Step content...'}
                      rows={2}
                      className="bg-background"
                    />
                  </div>

                  {/* Decision Options */}
                  {node.type === 'decision' && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                      <Label className="text-xs font-semibold">Options</Label>
                      {(node.options || []).map((opt, optIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <Input
                            value={opt.text}
                            onChange={e => updateOption(node.id, optIdx, { text: e.target.value })}
                            placeholder={`Option ${optIdx + 1}`}
                            className="bg-background flex-1"
                          />
                          <Select value={opt.next_node_id || '__none__'} onValueChange={v => updateOption(node.id, optIdx, { next_node_id: v === '__none__' ? null : v })}>
                            <SelectTrigger className="bg-background w-[180px]"><SelectValue placeholder="→ Next" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {nodes.filter(n => n.id !== node.id).map(n => (
                                <SelectItem key={n.id} value={n.id}>{nodeLabel(n.id)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" onClick={() => removeOption(node.id, optIdx)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => addOption(node.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : initial ? 'Update Algorithm' : 'Create Algorithm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
