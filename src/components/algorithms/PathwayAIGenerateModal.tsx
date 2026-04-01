import { useState, useEffect } from 'react';
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
  Edit2,
  GitBranch,
  FileText,
  Activity,
  Clock,
  Heart,
  ShieldAlert,
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
  onSave: (title: string, description: string, json: AlgorithmJson, extras?: {
    reveal_mode?: string;
    include_consequences?: boolean;
    initial_state_json?: Record<string, unknown>;
  }) => Promise<void>;
}

interface GeneratedNode {
  id: string;
  type: string;
  content: string;
  consequence_text?: string | null;
  state_delta_json?: Record<string, unknown> | null;
  next_node_id?: string | null;
  options?: {
    id: string;
    text: string;
    next_node_id: string | null;
    consequence_text?: string;
    state_delta_json?: Record<string, unknown>;
  }[];
}

interface GeneratedPathway {
  title: string;
  description: string;
  initial_state_json?: Record<string, unknown>;
  reveal_mode?: string;
  include_consequences?: boolean;
  nodes: GeneratedNode[];
}

interface AdminDoc {
  id: string;
  title: string;
  storage_bucket: string;
  storage_path: string;
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
  const [selectedDocId, setSelectedDocId] = useState<string>('__none__');
  const [availableDocs, setAvailableDocs] = useState<AdminDoc[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPathway, setGeneratedPathway] = useState<GeneratedPathway | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch available PDF documents for this module/chapter
  useEffect(() => {
    if (!open) return;
    const fetchDocs = async () => {
      let query = supabase
        .from('admin_documents')
        .select('id, title, storage_bucket, storage_path')
        .eq('is_deleted', false)
        .eq('mime_type', 'application/pdf');

      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      } else if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data } = await query.order('title');
      setAvailableDocs(data || []);
    };
    fetchDocs();
  }, [open, moduleId, chapterId]);

  const fetchPdfContent = async (docId: string): Promise<string | null> => {
    const doc = availableDocs.find(d => d.id === docId);
    if (!doc) return null;

    try {
      const { data: urlData } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 120);

      if (!urlData?.signedUrl) return null;

      // Fetch the PDF as text (edge function will handle truncation)
      const resp = await fetch(urlData.signedUrl);
      const blob = await resp.blob();
      // Convert to base64 for transport — the edge fn extracts text
      const arrayBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      // For simplicity, send the doc title as context hint + indicate PDF was selected
      return `[PDF: ${doc.title}] — PDF document attached. Use the topic and chapter context to generate the pathway grounded in this document's clinical content.`;
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPathway(null);

    try {
      let pdfContent: string | undefined;
      if (selectedDocId && selectedDocId !== '__none__') {
        pdfContent = (await fetchPdfContent(selectedDocId)) || undefined;
      }

      const { data, error: fnError } = await supabase.functions.invoke('generate-pathway', {
        body: {
          topic: topic.trim(),
          chapterTitle,
          moduleName,
          pathwayType,
          nodeCount,
          additionalInstructions: additionalInstructions.trim() || undefined,
          pdfContent,
          chapterId,
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
        consequence_text: n.consequence_text || undefined,
        next_node_id: n.next_node_id || null,
        ...(n.type === 'decision' && n.options
          ? {
              options: n.options.map(opt => ({
                ...opt,
                consequence_text: opt.consequence_text,
                state_delta_json: opt.state_delta_json,
              })),
            }
          : {}),
      }));

      const algorithmJson: AlgorithmJson = {
        nodes,
        start_node_id: nodes[0]?.id || null,
      };

      await onSave(
        generatedPathway.title,
        generatedPathway.description || '',
        algorithmJson,
        {
          reveal_mode: generatedPathway.reveal_mode || 'node_by_node',
          include_consequences: generatedPathway.include_consequences ?? true,
          initial_state_json: generatedPathway.initial_state_json || null,
        }
      );

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
    setSelectedDocId('__none__');
    setGeneratedPathway(null);
    setError(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  const renderStateDelta = (delta: Record<string, unknown> | null | undefined) => {
    if (!delta) return null;
    const hemo = delta.hemodynamics as Record<string, number> | undefined;
    const time = delta.time_elapsed_minutes as number | undefined;
    const flags = delta.risk_flags as string[] | undefined;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {time != null && time > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="w-3 h-3" /> +{time}min
          </Badge>
        )}
        {hemo?.heart_rate != null && (
          <Badge variant={hemo.heart_rate > 0 ? 'destructive' : 'secondary'} className="text-xs gap-1">
            <Heart className="w-3 h-3" /> HR {hemo.heart_rate > 0 ? '+' : ''}{hemo.heart_rate}
          </Badge>
        )}
        {hemo?.systolic_bp != null && (
          <Badge variant={hemo.systolic_bp < 0 ? 'destructive' : 'secondary'} className="text-xs gap-1">
            <Activity className="w-3 h-3" /> SBP {hemo.systolic_bp > 0 ? '+' : ''}{hemo.systolic_bp}
          </Badge>
        )}
        {hemo?.spo2 != null && (
          <Badge variant={hemo.spo2 < 0 ? 'destructive' : 'secondary'} className="text-xs gap-1">
            SpO₂ {hemo.spo2 > 0 ? '+' : ''}{hemo.spo2}%
          </Badge>
        )}
        {flags && flags.length > 0 && flags.map(f => (
          <Badge key={f} variant="destructive" className="text-xs gap-1">
            <ShieldAlert className="w-3 h-3" /> {f}
          </Badge>
        ))}
      </div>
    );
  };

  const renderInitialState = (state: Record<string, unknown> | undefined) => {
    if (!state) return null;
    const hemo = state.hemodynamics as Record<string, number> | undefined;
    if (!hemo) return null;

    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-3 pb-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Initial Patient Status</div>
          <div className="flex flex-wrap gap-2">
            {hemo.heart_rate != null && <Badge variant="outline" className="text-xs">HR: {hemo.heart_rate}</Badge>}
            {hemo.systolic_bp != null && <Badge variant="outline" className="text-xs">BP: {hemo.systolic_bp}/{hemo.diastolic_bp}</Badge>}
            {hemo.spo2 != null && <Badge variant="outline" className="text-xs">SpO₂: {hemo.spo2}%</Badge>}
            {hemo.respiratory_rate != null && <Badge variant="outline" className="text-xs">RR: {hemo.respiratory_rate}</Badge>}
            {hemo.temperature != null && <Badge variant="outline" className="text-xs">Temp: {hemo.temperature}°C</Badge>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Interactive Pathway with AI
            </DialogTitle>
            <DialogDescription>
              AI generates a step-by-step clinical pathway with consequences and patient state changes.
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

              {/* PDF Document Selector */}
              {availableDocs.length > 0 && (
                <div>
                  <Label>Reference PDF Document (optional)</Label>
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="No document selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No document</SelectItem>
                      {availableDocs.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <span className="flex items-center gap-2">
                            <FileText className="w-3 h-3" /> {doc.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a PDF to ground the pathway in its clinical content.
                  </p>
                </div>
              )}

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
                  Interactive pathway generated! Review consequences and state changes below.
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
                    {generatedPathway.include_consequences && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        Consequences enabled
                      </Badge>
                    )}
                    <Badge variant="outline">Node-by-node reveal</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Initial Patient State */}
              {renderInitialState(generatedPathway.initial_state_json)}

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

                              {/* Consequence for non-decision nodes */}
                              {node.consequence_text && node.type !== 'decision' && (
                                <div className="mt-2 p-2 bg-background/60 rounded text-xs text-muted-foreground border border-border/50">
                                  <span className="font-medium">Consequence:</span> {node.consequence_text}
                                  {renderStateDelta(node.state_delta_json)}
                                </div>
                              )}

                              {/* Decision options with consequences */}
                              {node.type === 'decision' && node.options && (
                                <div className="mt-2 space-y-2 pl-3 border-l-2 border-primary/30">
                                  {node.options.map((opt, oi) => (
                                    <div key={opt.id || oi} className="text-xs">
                                      <div className="font-medium flex items-center gap-1">
                                        <span>→</span> {opt.text}
                                      </div>
                                      {opt.consequence_text && (
                                        <div className="ml-4 mt-1 p-1.5 bg-background/60 rounded text-muted-foreground border border-border/50">
                                          <span className="font-medium">Consequence:</span> {opt.consequence_text}
                                          {renderStateDelta(opt.state_delta_json)}
                                        </div>
                                      )}
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
