import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  Check,
  Eye,
  Edit2,
  GitBranch,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlgorithmJson, AlgorithmNode, NODE_TYPE_CONFIG } from '@/types/algorithm';

interface PathwayAIGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleName?: string;
  chapterId?: string;
  chapterTitle?: string;
  onPathwayCreated?: () => void;
  onSave: (title: string, description: string, json: AlgorithmJson) => Promise<void>;
}

interface GeneratedPathway {
  title: string;
  description: string;
  nodes: {
    id: string;
    type: string;
    content: string;
    next_node_id?: string | null;
    options?: { id: string; text: string; next_node_id: string | null }[];
  }[];
}

export function PathwayAIGenerateModal({
  open,
  onOpenChange,
  moduleId,
  moduleName,
  chapterId,
  chapterTitle,
  onPathwayCreated,
  onSave,
}: PathwayAIGenerateModalProps) {
  const [topic, setTopic] = useState('');
  const [pathwayType, setPathwayType] = useState('assessment');
  const [nodeCount, setNodeCount] = useState(7);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPathway, setGeneratedPathway] = useState<GeneratedPathway | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPathway(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-pathway', {
        body: {
          topic: topic.trim(),
          chapterTitle,
          moduleName,
          pathwayType,
          nodeCount,
          additionalInstructions: additionalInstructions.trim() || undefined,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.generatedPathway) {
        setGeneratedPathway(data.generatedPathway);
        toast.success('Pathway generated! Review and approve below.');
      } else {
        throw new Error('No pathway data in response');
      }
    } catch (err) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate pathway';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndCreate = async () => {
    if (!generatedPathway) return;

    setIsCreating(true);
    try {
      const nodes: AlgorithmNode[] = generatedPathway.nodes.map((n) => ({
        id: n.id,
        type: n.type as AlgorithmNode['type'],
        content: n.content,
        next_node_id: n.next_node_id || null,
        ...(n.type === 'decision' && n.options ? { options: n.options } : {}),
      }));

      const algorithmJson: AlgorithmJson = {
        nodes,
        start_node_id: nodes[0]?.id || null,
      };

      await onSave(generatedPathway.title, generatedPathway.description || '', algorithmJson);
      
      toast.success(`Pathway "${generatedPathway.title}" created!`);
      resetModal();
      onOpenChange(false);
      onPathwayCreated?.();
    } catch (err) {
      console.error('Create error:', err);
      toast.error('Failed to create pathway');
    } finally {
      setIsCreating(false);
    }
  };

  const resetModal = () => {
    setTopic('');
    setPathwayType('assessment');
    setNodeCount(7);
    setAdditionalInstructions('');
    setGeneratedPathway(null);
    setError(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Pathway with AI
            </DialogTitle>
            <DialogDescription>
              AI will generate a draft clinical decision pathway for your review.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {!generatedPathway ? (
            <div className="space-y-4 pr-4 pb-4">
              {(moduleName || chapterTitle) && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">Generating for: </span>
                  {moduleName && <Badge variant="outline" className="mr-1">{moduleName}</Badge>}
                  {chapterTitle && <Badge variant="secondary">{chapterTitle}</Badge>}
                </div>
              )}

              <div>
                <Label htmlFor="pathway-topic">Topic / Clinical Scenario *</Label>
                <Input
                  id="pathway-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Chest Pain Assessment, Acute Appendicitis Management"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pathway Type</Label>
                  <Select value={pathwayType} onValueChange={setPathwayType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="diagnosis">Diagnostic</SelectItem>
                      <SelectItem value="emergency">Emergency Protocol</SelectItem>
                      <SelectItem value="triage">Triage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Number of Steps: {nodeCount}</Label>
                  <input
                    type="range"
                    min={4}
                    max={12}
                    value={nodeCount}
                    onChange={(e) => setNodeCount(Number(e.target.value))}
                    className="w-full mt-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>4 (Simple)</span>
                    <span>12 (Complex)</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="pathway-instructions">Additional Instructions (optional)</Label>
                <Textarea
                  id="pathway-instructions"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g., Focus on surgical decision-making, include imaging decisions..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm text-destructive">{error}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pr-4 pb-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Pathway generated! Review below and click "Approve & Create" to save.
                </span>
              </div>

              {/* Pathway Header */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    {generatedPathway.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {generatedPathway.description && (
                    <p className="text-sm text-muted-foreground">{generatedPathway.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{generatedPathway.nodes.length} steps</Badge>
                    <Badge variant="outline">
                      {generatedPathway.nodes.filter(n => n.type === 'decision').length} decisions
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Nodes Preview */}
              <div>
                <h4 className="font-medium mb-3">Steps Preview</h4>
                <div className="space-y-2">
                  {generatedPathway.nodes.map((node, index) => {
                    const config = NODE_TYPE_CONFIG[node.type as keyof typeof NODE_TYPE_CONFIG];
                    return (
                      <Card key={node.id} className={`${config?.color || 'bg-muted'}`}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {config?.icon || '•'} {index + 1}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">{config?.label || node.type}</span>
                                {index === 0 && <Badge className="bg-primary text-primary-foreground text-xs">START</Badge>}
                              </div>
                              <p className="text-sm">{node.content}</p>
                              {node.type === 'decision' && node.options && (
                                <div className="mt-2 space-y-1 pl-3 border-l-2 border-primary/30">
                                  {node.options.map((opt, oi) => (
                                    <div key={opt.id || oi} className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span className="font-medium">→</span> {opt.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 flex justify-between gap-2 px-6 py-4 border-t bg-background z-10">
          {!generatedPathway ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
                {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Pathway'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setGeneratedPathway(null)} disabled={isCreating}>
                <Edit2 className="w-4 h-4 mr-1" /> Regenerate
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleClose(false)} disabled={isCreating}>
                  Discard
                </Button>
                <Button
                  onClick={handleApproveAndCreate}
                  disabled={isCreating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Check className="w-4 h-4 mr-1" />
                  Approve & Create
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
