import { useState, useMemo } from 'react';
import {
  Network,
  Wand2,
  Eye,
  Trash2,
  CheckCircle2,
  FileEdit,
  Download,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Info,
  MinusCircle,
  FileText,
  Gauge,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useMindMaps,
  useGenerateMindMap,
  useUpdateMindMapStatus,
  useDeleteMindMap,
  MindMap,
  GenerateMindMapResponse,
  ExtractionMethod,
  ExtractionScoreEntry,
} from '@/hooks/useMindMaps';
import { useAdminDocuments } from '@/hooks/useAdminDocuments';
import { format } from 'date-fns';

interface MindMapAdminPanelProps {
  chapterId?: string;
  topicId?: string;
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return status === 'published' ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0">
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Published
    </Badge>
  ) : (
    <Badge variant="secondary" className="border-0">
      <FileEdit className="w-3 h-3 mr-1" />
      Draft
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  return source === 'legacy_html' ? (
    <Badge variant="outline" className="text-xs">Legacy HTML</Badge>
  ) : (
    <Badge variant="outline" className="text-xs border-primary/30 text-primary">Markdown</Badge>
  );
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-destructive';
  return (
    <span className={`text-xs font-mono ${color}`}>
      {label}: {score}
    </span>
  );
}

function ExtractionScoreRow({ name, entry }: { name: string; entry: ExtractionScoreEntry }) {
  const scoreColor = entry.score >= 85 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : entry.score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge className={`${scoreColor} border-0 font-mono text-[11px] px-1.5`}>{entry.score}</Badge>
      <span className="font-medium capitalize">{name.replace('_', ' ')}</span>
      <span className="text-muted-foreground">
        {(entry.breakdown.char_count / 1000).toFixed(1)}k chars · 
        hdg {(entry.breakdown.heading_score * 100).toFixed(0)}% · 
        noise {(entry.breakdown.noise_score * 100).toFixed(1)}%
      </span>
      {entry.time_ms > 0 && (
        <span className="text-muted-foreground flex items-center gap-0.5">
          <Clock className="w-3 h-3" />{entry.time_ms}ms
        </span>
      )}
    </div>
  );
}

export function MindMapAdminPanel({ chapterId, topicId }: MindMapAdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<'full' | 'sections' | 'both'>('both');
  const [selectedDocId, setSelectedDocId] = useState<string>('auto');
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('auto');
  const [previewMap, setPreviewMap] = useState<MindMap | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MindMap | null>(null);
  const [lastResult, setLastResult] = useState<GenerateMindMapResponse | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const { data: maps = [], isLoading } = useMindMaps(chapterId, topicId);
  const generate = useGenerateMindMap();
  const updateStatus = useUpdateMindMapStatus();
  const deleteMutation = useDeleteMindMap();

  const { data: availableDocs = [] } = useAdminDocuments({
    chapter_id: chapterId,
  });

  const pdfDocs = useMemo(() =>
    availableDocs.filter(d => d.mime_type?.includes('pdf')),
    [availableDocs]
  );

  const handleGenerate = () => {
    const req: any = { generation_mode: generationMode };
    if (chapterId) req.chapter_id = chapterId;
    if (topicId) req.topic_id = topicId;
    if (selectedDocId && selectedDocId !== 'auto') req.document_id = selectedDocId;
    if (extractionMethod !== 'auto') req.extraction_method = extractionMethod;

    generate.mutate(req, {
      onSuccess: (data) => {
        setLastResult(data);
        setResultDialogOpen(true);
      },
    });
  };

  const handleToggleStatus = (map: MindMap) => {
    const next = map.status === 'draft' ? 'published' : 'draft';
    updateStatus.mutate({ id: map.id, status: next });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleDownloadMd = (map: MindMap) => {
    if (!map.markdown_content) return;
    const blob = new Blob([map.markdown_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fullMaps = maps.filter((m) => m.map_type === 'full');
  const sectionMaps = maps.filter((m) => m.map_type === 'section');
  const draftCount = maps.filter((m) => m.status === 'draft').length;
  const publishedCount = maps.filter((m) => m.status === 'published').length;

  const srcDoc = lastResult?.source_document;
  const scores = srcDoc?.extraction_scores;

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-dashed">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Network className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-medium">
                    AI Mind Maps
                  </CardTitle>
                  {maps.length > 0 && (
                    <div className="flex gap-1.5 ml-2">
                      {publishedCount > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-xs h-5">
                          {publishedCount} published
                        </Badge>
                      )}
                      {draftCount > 0 && (
                        <Badge variant="secondary" className="border-0 text-xs h-5">
                          {draftCount} draft{draftCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Generation controls */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={generationMode} onValueChange={(v) => setGenerationMode(v as any)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Map Only</SelectItem>
                      <SelectItem value="sections">Section Maps Only</SelectItem>
                      <SelectItem value="both">Full + Sections</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generate.isPending}
                    className="gap-1.5"
                  >
                    {generate.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    {generate.isPending ? 'Generating…' : 'Generate Mind Maps'}
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Generates Markmap mind maps from the chapter/topic PDF using Gemini.
                      Text extraction uses a tiered pipeline (Direct → PDF.js) with quality scoring.
                      New maps are always added as drafts.
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* PDF Document selector */}
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select PDF source…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect PDF</SelectItem>
                      {pdfDocs.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <span className="truncate">{doc.title}</span>
                          <span className="text-muted-foreground ml-1">({doc.file_name})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Extraction method override */}
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Select value={extractionMethod} onValueChange={(v) => setExtractionMethod(v as ExtractionMethod)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (tiered pipeline)</SelectItem>
                      <SelectItem value="direct">Force: Direct binary extraction</SelectItem>
                      <SelectItem value="pdfjs">Force: PDF.js extraction</SelectItem>
                      <SelectItem value="chapter_text">Force: Chapter stored text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pdfDocs.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No PDF documents found for this chapter. Upload one in Content PDFs first.
                  </p>
                )}
              </div>

              {/* Maps table */}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : maps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Network className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No AI mind maps generated yet. Click Generate to create maps from the PDF.
                </div>
              ) : (
                <div className="space-y-3">
                  {fullMaps.length > 0 && (
                    <MapGroup title="Full Chapter Maps" maps={fullMaps} onPreview={setPreviewMap} onToggle={handleToggleStatus} onDelete={setDeleteTarget} onDownload={handleDownloadMd} />
                  )}
                  {sectionMaps.length > 0 && (
                    <MapGroup title={`Section Maps (${sectionMaps.length})`} maps={sectionMaps} onPreview={setPreviewMap} onToggle={handleToggleStatus} onDelete={setDeleteTarget} onDownload={handleDownloadMd} />
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Preview dialog */}
      <Dialog open={!!previewMap} onOpenChange={() => setPreviewMap(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              {previewMap?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <SourceBadge source={previewMap?.source_type || ''} />
              <StatusBadge status={previewMap?.status || 'draft'} />
              {previewMap?.section_title && (
                <span className="text-xs">
                  Section: {previewMap.section_number ? `${previewMap.section_number} — ` : ''}{previewMap.section_title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {previewMap?.markdown_content && (
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-[50vh] whitespace-pre-wrap font-mono">
              {previewMap.markdown_content}
            </pre>
          )}

          {previewMap?.source_detection_metadata && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Detection metadata
              </summary>
              <pre className="mt-1 bg-muted rounded p-2 overflow-auto text-[10px]">
                {JSON.stringify(previewMap.source_detection_metadata, null, 2)}
              </pre>
            </details>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete mind map?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generation result dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generation Results</DialogTitle>
          </DialogHeader>
          {lastResult && (
            <div className="space-y-4 text-sm">
              {/* Summary counts */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {lastResult.total_generated} generated
                </div>
                {lastResult.total_failed > 0 && (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    {lastResult.total_failed} failed
                  </div>
                )}
                {(lastResult.total_skipped || 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <MinusCircle className="w-4 h-4" />
                    {lastResult.total_skipped} skipped
                  </div>
                )}
              </div>

              {/* Source document & extraction diagnostics */}
              {srcDoc && (
                <div className="p-3 bg-muted rounded-lg space-y-2.5">
                  {/* Source info */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-medium truncate">{srcDoc.name || 'Unknown'}</span>
                  </div>

                  {/* Method badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">From:</span>
                      <Badge variant="outline" className="text-[11px] px-1.5 capitalize">
                        {srcDoc.source_method.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Extracted via:</span>
                      <Badge variant="outline" className="text-[11px] px-1.5 capitalize border-primary/30 text-primary">
                        {srcDoc.extraction_method_used === 'chapter_text' ? 'Chapter text' : srcDoc.extraction_method_used === 'pdfjs' ? 'PDF.js' : srcDoc.extraction_method_used === 'direct' ? 'Direct binary' : 'Auto'}
                      </Badge>
                    </div>
                    {srcDoc.fallback_triggered && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-0 text-[11px]">
                        Fallback triggered
                      </Badge>
                    )}
                  </div>

                  {/* Selection reason */}
                  {srcDoc.selection_reason && (
                    <p className="text-[11px] text-muted-foreground italic pl-5">
                      {srcDoc.selection_reason}
                    </p>
                  )}

                  {/* Character counts */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-5">
                    <span>Selected: <span className="text-foreground font-medium">{(srcDoc.text_length / 1000).toFixed(1)}k chars</span></span>
                    <span>Headings: <span className="text-foreground">{srcDoc.heading_count}</span></span>
                    {srcDoc.chapter_pdf_text_length != null && (
                      <span>Chapter text: <span className="text-foreground">{(srcDoc.chapter_pdf_text_length / 1000).toFixed(1)}k chars</span></span>
                    )}
                  </div>

                  {/* Extraction scores comparison */}
                  {scores && Object.keys(scores).length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> Quality scores
                      </span>
                      {scores.direct && <ExtractionScoreRow name="direct" entry={scores.direct} />}
                      {scores.pdfjs && <ExtractionScoreRow name="pdfjs" entry={scores.pdfjs} />}
                      {scores.chapter_text && <ExtractionScoreRow name="chapter_text" entry={scores.chapter_text} />}
                    </div>
                  )}

                  {/* Text preview */}
                  {srcDoc.selected_text_preview && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-[11px]">
                        Text preview (first 500 chars)
                      </summary>
                      <pre className="mt-1 bg-background rounded p-2 overflow-auto max-h-32 text-[10px] whitespace-pre-wrap font-mono">
                        {srcDoc.selected_text_preview}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Detection info */}
              {lastResult.detection && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  Detection: {lastResult.detection.method} · Confidence: {Math.round(lastResult.detection.confidence * 100)}% · {lastResult.detection.sections_found} sections found
                </div>
              )}

              {/* Individual results */}
              <div className="space-y-1">
                {lastResult.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.status === 'generated' || (r.success && !r.status) ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : r.status === 'skipped' ? (
                      <MinusCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    )}
                    <span className="truncate">{r.title}</span>
                    {r.errors && r.errors.length > 0 && (
                      <span className={`truncate ${r.status === 'skipped' ? 'text-amber-600' : 'text-destructive'}`}>
                        — {r.errors[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

/* ---- Map group sub-component ---- */

function MapGroup({
  title,
  maps,
  onPreview,
  onToggle,
  onDelete,
  onDownload,
}: {
  title: string;
  maps: MindMap[];
  onPreview: (m: MindMap) => void;
  onToggle: (m: MindMap) => void;
  onDelete: (m: MindMap) => void;
  onDownload: (m: MindMap) => void;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{title}</h4>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs h-8">Title</TableHead>
              <TableHead className="text-xs h-8 w-24">Type</TableHead>
              <TableHead className="text-xs h-8 w-28">Status</TableHead>
              <TableHead className="text-xs h-8 w-28">Created</TableHead>
              <TableHead className="text-xs h-8 w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maps.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="py-1.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium line-clamp-1">{m.title}</span>
                    {m.section_title && (
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {m.section_number ? `${m.section_number} — ` : ''}{m.section_title}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5">
                  <SourceBadge source={m.source_type} />
                </TableCell>
                <TableCell className="py-1.5">
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell className="py-1.5 text-xs text-muted-foreground">
                  {format(new Date(m.created_at), 'dd MMM yy')}
                </TableCell>
                <TableCell className="py-1.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPreview(m)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onToggle(m)}
                        >
                          {m.status === 'draft' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {m.status === 'draft' ? 'Publish' : 'Unpublish'}
                      </TooltipContent>
                    </Tooltip>

                    {m.markdown_content && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDownload(m)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download .md</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => onDelete(m)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
