import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Edit2, 
  Trash2, 
  FileText, 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  RotateCcw, 
  Printer,
  Download,
  GripVertical,
  Pencil,
  Undo2,
  Eraser,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudyResource, MindMapContent, useReorderStudyResources } from '@/hooks/useStudyResources';
import { useIsMobile } from '@/hooks/use-mobile';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';
import { MindMapNodeRenderer } from './MindMapNodeRenderer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';

// Component that fetches HTML and renders via srcdoc to handle wrong content-type from storage
function HtmlIframe({ url, title }: { url: string; title: string }) {
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [useSrc, setUseSrc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(res => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) {
          // Correct content type, use src directly
          if (!cancelled) setUseSrc(true);
        } else {
          // Wrong content type, fetch and use srcdoc
          return res.text().then(html => {
            if (!cancelled) setSrcdoc(html);
          });
        }
      })
      .catch(() => {
        if (!cancelled) setUseSrc(true); // fallback to src
      });
    return () => { cancelled = true; };
  }, [url]);

  if (useSrc) {
    return (
      <iframe
        src={url}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        style={{ minHeight: 'calc(95vh - 40px)' }}
        title={title}
      />
    );
  }

  if (srcdoc) {
    return (
      <iframe
        srcDoc={srcdoc}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        style={{ minHeight: 'calc(95vh - 40px)' }}
        title={title}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full" style={{ minHeight: 'calc(95vh - 40px)' }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// Helper to get file URL from content (supports both fileUrl and legacy imageUrl)
function getContentFileUrl(content: MindMapContent): string | undefined {
  return content.fileUrl || content.imageUrl;
}

// Check if mind map is AI-generated (has nodes) vs image-based
function isNodeBasedMindMap(content: MindMapContent): boolean {
  return !getContentFileUrl(content) && Array.isArray(content.nodes) && content.nodes.length > 0;
}

// Check if content is HTML file
function isHtmlFile(content: MindMapContent): boolean {
  const url = getContentFileUrl(content);
  if (content.fileType === 'html') return true;
  if (url) {
    const lower = url.toLowerCase();
    return lower.endsWith('.html') || lower.endsWith('.htm');
  }
  return false;
}

interface MindMapCardProps {
  resource: StudyResource;
  canManage: boolean;
  onEdit?: (resource: StudyResource) => void;
  onDelete: (resource: StudyResource) => void;
  onFullscreen: (resource: StudyResource) => void;
  isDragging?: boolean;
}

function MindMapCardInner({ 
  resource, 
  canManage, 
  onEdit, 
  onDelete, 
  onFullscreen,
  isDragging,
}: MindMapCardProps) {
  const content = resource.content as MindMapContent;
  const fileUrl = getContentFileUrl(content);
  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf');
  const isHtml = isHtmlFile(content);
  const isNodeBased = isNodeBasedMindMap(content);

  return (
    <Card className={cn("overflow-hidden group", isDragging && "opacity-50")}>
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          {canManage && (
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
          )}
          <CardTitle className="text-sm font-medium truncate flex-1">
            {resource.title}
          </CardTitle>
          {canManage && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit?.(resource)}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(resource)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isHtml ? (
          <div 
            className="flex flex-col items-center justify-center gap-2 h-32 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer relative group"
            onClick={() => onFullscreen(resource)}
          >
            <Network className="w-10 h-10 text-primary" />
            <span className="text-sm font-medium">Interactive Mind Map</span>
            <span className="text-xs text-muted-foreground">Click to view</span>
          </div>
        ) : isPdf ? (
          <div 
            className="flex flex-col items-center justify-center gap-2 h-32 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer relative group"
            onClick={() => onFullscreen(resource)}
          >
            <FileText className="w-10 h-10 text-primary" />
            <span className="text-sm text-muted-foreground">Click to view</span>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen(resource);
              }}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        ) : isNodeBased ? (
          <div 
            className="relative h-32 bg-muted/50 rounded-lg overflow-hidden cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => onFullscreen(resource)}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
              <div 
                className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-medium text-center truncate max-w-full"
              >
                {content.central_concept || 'Mind Map'}
              </div>
              <div className="flex gap-1 mt-2 flex-wrap justify-center">
                {(content.nodes || []).slice(0, 3).map((node, idx) => (
                  <div 
                    key={node.id}
                    className="px-1.5 py-0.5 rounded text-white text-[10px] truncate max-w-[60px]"
                    style={{ backgroundColor: node.color || `hsl(${(idx * 60 + 217) % 360}, 70%, 50%)` }}
                  >
                    {node.label}
                  </div>
                ))}
                {(content.nodes?.length || 0) > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{content.nodes!.length - 3} more</span>
                )}
              </div>
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen(resource);
              }}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        ) : fileUrl ? (
          <div className="relative">
            <img
              src={fileUrl}
              alt={resource.title}
              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onFullscreen(resource)}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onFullscreen(resource)}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
            <Network className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {content.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {content.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SortableMindMapCard(props: MindMapCardProps & { id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MindMapCardInner {...props} isDragging={isDragging} />
    </div>
  );
}

interface MindMapViewerProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  /** Hide the empty state placeholder (e.g. when AI maps exist above) */
  hideEmptyState?: boolean;
}

export function MindMapViewer({ resources, canManage = false, onEdit, chapterId, topicId, hideEmptyState = false }: MindMapViewerProps) {
  const [fullscreenResource, setFullscreenResource] = useState<StudyResource | null>(null);
  const [zoom, setZoom] = useState(1);
  const [localResources, setLocalResources] = useState<StudyResource[]>(resources);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const isMobile = useIsMobile();
  
  const resolvedChapterId = chapterId || resources[0]?.chapter_id;
  
  const reorderMutation = useReorderStudyResources();

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sync local resources when resources prop changes
  if (resources !== localResources && JSON.stringify(resources.map(r => r.id)) !== JSON.stringify(localResources.map(r => r.id))) {
    setLocalResources(resources);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleFitToScreen = useCallback(() => {
    setZoom(1);
  }, []);

  const handlePrint = useCallback(() => {
    if (!fullscreenResource) return;
    const content = fullscreenResource.content as MindMapContent;
    const fileUrl = getContentFileUrl(content);
    const isPdfFile = fileUrl?.toLowerCase().endsWith('.pdf');
    const isHtmlFile_ = isHtmlFile(content);
    
    if (isHtmlFile_ && fileUrl) {
      // For HTML/Markmap mind maps: fetch content and open in print window
      fetch(fileUrl)
        .then(res => res.text())
        .then(html => {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            // Inject a print-friendly style and auto-print
            const printHtml = html.replace('</head>', `
              <style>
                @media print {
                  body, html { width: 100%; height: 100%; margin: 0; padding: 0; }
                  svg#mindmap { width: 100% !important; height: 100% !important; }
                }
              </style>
              </head>`);
            printWindow.document.write(printHtml);
            printWindow.document.close();
            // Wait for scripts to load and render, then print
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 2000);
          }
        })
        .catch(() => toast.error('Failed to load mind map for printing'));
    } else if (isPdfFile && fileUrl) {
      const printWindow = window.open(fileUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fullscreenResource.title}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                @media print { body { margin: 0; } img { max-width: 100%; max-height: 100%; } }
              </style>
            </head>
            <body>
              <img src="${fileUrl}" alt="${fullscreenResource.title}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  }, [fullscreenResource]);
  
  const handleDownload = useCallback(() => {
    if (!fullscreenResource) return;
    const content = fullscreenResource.content as MindMapContent;
    if (content.imageUrl) {
      window.open(content.imageUrl, '_blank');
    }
  }, [fullscreenResource]);

  const openFullscreen = useCallback((resource: StudyResource) => {
    setFullscreenResource(resource);
    setZoom(1);
    setIsDrawingMode(false);
  }, []);

  const handleDelete = useCallback((resource: StudyResource) => {
    requestResourceDelete('mind_map', resource.id, resource.title);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = localResources.findIndex(r => r.id === active.id);
    const newIndex = localResources.findIndex(r => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(localResources, oldIndex, newIndex);
    
    // Update local state immediately for optimistic UI
    setLocalResources(reorderedItems);

    // Persist to database - use chapterId prop or from first resource
    const containerId = chapterId || topicId || localResources[0]?.chapter_id || localResources[0]?.topic_id;
    if (containerId) {
      const updates = reorderedItems.map((r, idx) => ({
        id: r.id,
        display_order: idx,
      }));

      reorderMutation.mutate(
        { resources: updates, chapterId: resolvedChapterId },
        {
          onError: () => {
            toast.error('Failed to save order');
            setLocalResources(resources); // Revert on error
          },
        }
      );
    }
  }, [localResources, resources, reorderMutation, chapterId, topicId, resolvedChapterId]);

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No mind maps yet.</p>
      </div>
    );
  }

  const renderGrid = () => {
    if (!canManage) {
      // Non-admin: no drag and drop
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {localResources.map(resource => (
            <MindMapCardInner
              key={resource.id}
              resource={resource}
              canManage={false}
              onEdit={onEdit}
              onDelete={handleDelete}
              onFullscreen={openFullscreen}
            />
          ))}
        </div>
      );
    }

    // Admin: with drag and drop
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={localResources.map(r => r.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {localResources.map(resource => (
              <SortableMindMapCard
                key={resource.id}
                id={resource.id}
                resource={resource}
                canManage={canManage}
                onEdit={onEdit}
                onDelete={handleDelete}
                onFullscreen={openFullscreen}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  const fullscreenContent = fullscreenResource?.content as MindMapContent | null;
  const isNodeBased = fullscreenContent && isNodeBasedMindMap(fullscreenContent);
  const fullscreenFileUrl = fullscreenContent ? getContentFileUrl(fullscreenContent) : undefined;
  const isPdf = fullscreenFileUrl?.toLowerCase().endsWith('.pdf');
  const isHtml = fullscreenContent && isHtmlFile(fullscreenContent);

  return (
    <div className="space-y-4">
      {renderGrid()}

      {/* Fullscreen Modal */}
      <Dialog open={!!fullscreenResource} onOpenChange={() => setFullscreenResource(null)}>
        <DialogContent 
          className={cn(
            "max-w-[95vw] max-h-[95vh] flex flex-col",
            (isPdf || isHtml) ? "p-2" : "p-4"
          )}
          closeClassName={(isPdf || isHtml) ? "text-white bg-black/50 hover:bg-black/70 rounded-full p-1" : undefined}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Only show header for non-PDF and non-HTML files */}
          {!isPdf && !isHtml && (
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between gap-4 pr-8">
                <DialogTitle className="truncate">{fullscreenResource?.title}</DialogTitle>
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Zoom controls for images and node-based */}
                  <>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={handleZoomOut}
                      disabled={zoom <= MIN_ZOOM}
                      title="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground w-14 text-center tabular-nums">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={handleZoomIn}
                      disabled={zoom >= MAX_ZOOM}
                      title="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={handleFitToScreen}
                      title="Fit to screen"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </>
                  
                  {/* Drawing controls - only for images (not node-based) */}
                  {!isNodeBased && !isHtml && fullscreenFileUrl && (
                    <>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button
                        size="icon"
                        variant={isDrawingMode ? "default" : "outline"}
                        className="h-8 w-8"
                        onClick={() => setIsDrawingMode(!isDrawingMode)}
                        title={isDrawingMode ? "Exit drawing mode" : "Draw on image"}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isDrawingMode && (
                        <>
                          <input 
                            type="color" 
                            value={strokeColor} 
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="h-8 w-8 cursor-pointer border rounded bg-background"
                            title="Pen color"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => canvasRef.current?.undo()}
                            title="Undo"
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => canvasRef.current?.clearCanvas()}
                            title="Clear drawing"
                          >
                            <Eraser className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Print & Download - only for images */}
                  {!isNodeBased && (
                    <>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={handlePrint}
                        title="Print"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {!isNodeBased && !isHtml && fullscreenFileUrl && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={handleDownload}
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {!isMobile && (
                    <>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={handleFullscreenToggle}
                        title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>
          )}
          
          {/* Hidden title for PDF/HTML accessibility */}
          {(isPdf || isHtml) && (
            <DialogTitle className="sr-only">{fullscreenResource?.title}</DialogTitle>
          )}
          
          <div 
            className={cn(
              "flex-1 overflow-auto rounded-lg",
              (isPdf || isHtml) ? "bg-white" : "bg-muted/30 mt-4"
            )}
            style={{ minHeight: (isPdf || isHtml) ? 'calc(95vh - 40px)' : '60vh' }}
          >
            {fullscreenContent && (
              <>
                {isHtml && fullscreenFileUrl ? (
                  <HtmlIframe url={fullscreenFileUrl} title={fullscreenResource?.title || 'Mind Map'} />
                ) : isPdf && fullscreenFileUrl ? (
                  <iframe
                    src={`${fullscreenFileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0 bg-white rounded"
                    style={{ minHeight: 'calc(95vh - 40px)' }}
                    title={fullscreenResource?.title}
                  />
                ) : isNodeBased ? (
                  <div 
                    className="flex items-center justify-center p-4"
                    style={{ minHeight: '60vh' }}
                  >
                    <div
                      style={{ 
                        transform: `scale(${zoom})`, 
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-out',
                        width: '100%',
                        maxWidth: '1200px',
                      }}
                    >
                      <MindMapNodeRenderer
                        centralConcept={fullscreenContent.central_concept || 'Mind Map'}
                        nodes={fullscreenContent.nodes || []}
                        connections={fullscreenContent.connections}
                      />
                    </div>
                  </div>
                ) : fullscreenFileUrl ? (
                  <div 
                    className="relative p-4" 
                    style={{ minHeight: '60vh' }}
                  >
                    {isDrawingMode ? (
                      <div 
                        style={{ 
                          width: `${zoom * 100}%`,
                          maxWidth: 'none',
                          height: '70vh',
                          transition: 'width 0.2s ease-out',
                        }}
                      >
                        <ReactSketchCanvas
                          ref={canvasRef}
                          width="100%"
                          height="100%"
                          strokeWidth={3}
                          strokeColor={strokeColor}
                          backgroundImage={fullscreenFileUrl}
                          preserveBackgroundImageAspectRatio="xMidYMid meet"
                          canvasColor="transparent"
                        />
                      </div>
                    ) : (
                      <img
                        src={fullscreenFileUrl}
                        alt={fullscreenResource?.title}
                        style={{ 
                          width: `${zoom * 100}%`,
                          maxWidth: 'none',
                          height: 'auto',
                          transition: 'width 0.2s ease-out',
                          display: 'block',
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <Network className="w-16 h-16 mx-auto mb-2" />
                    <p>No content available</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {fullscreenContent?.description && !isPdf && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {fullscreenContent.description}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
