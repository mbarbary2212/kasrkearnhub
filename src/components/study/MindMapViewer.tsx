import { useState, useCallback, useMemo } from 'react';
import { 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Printer,
  Folder,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { StudyResource, MindMapContent, useReorderStudyResources } from '@/hooks/useStudyResources';
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

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// Check if mind map is AI-generated (has nodes) vs image-based
function isNodeBasedMindMap(content: MindMapContent): boolean {
  return !content.imageUrl && Array.isArray(content.nodes) && content.nodes.length > 0;
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
  const isPdf = content.imageUrl?.toLowerCase().endsWith('.pdf');
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
        {isPdf ? (
          <a
            href={content.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-32 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">View PDF</span>
          </a>
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
        ) : content.imageUrl ? (
          <div className="relative">
            <img
              src={content.imageUrl}
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
}

export function MindMapViewer({ resources, canManage = false, onEdit }: MindMapViewerProps) {
  const [fullscreenResource, setFullscreenResource] = useState<StudyResource | null>(null);
  const [zoom, setZoom] = useState(1);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localResources, setLocalResources] = useState<StudyResource[]>([]);
  
  const reorderMutation = useReorderStudyResources();

  // Initialize expanded folders and local resources when resources change
  useMemo(() => {
    const folders = new Set<string>();
    resources.forEach(r => {
      folders.add(r.folder || 'Uncategorized');
    });
    setExpandedFolders(folders);
    setLocalResources(resources);
  }, [resources]);

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

  // Group resources by folder
  const groupedByFolder = useMemo(() => {
    const groups: Record<string, StudyResource[]> = {};
    localResources.forEach(r => {
      const folder = r.folder || 'Uncategorized';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(r);
    });
    // Sort: named folders first alphabetically, then Uncategorized
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [localResources]);

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
    const imageUrl = (fullscreenResource.content as MindMapContent).imageUrl;
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
            <img src="${imageUrl}" alt="${fullscreenResource.title}" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, [fullscreenResource]);

  const openFullscreen = useCallback((resource: StudyResource) => {
    setFullscreenResource(resource);
    setZoom(1);
  }, []);

  const handleDelete = useCallback((resource: StudyResource) => {
    requestResourceDelete('mind_map', resource.id, resource.title);
  }, []);

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent, folderItems: StudyResource[]) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = folderItems.findIndex(r => r.id === active.id);
    const newIndex = folderItems.findIndex(r => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder within folder
    const reorderedItems = arrayMove(folderItems, oldIndex, newIndex);
    
    // Update local state immediately for optimistic UI
    setLocalResources(prev => {
      const folder = folderItems[0]?.folder || null;
      const otherItems = prev.filter(r => (r.folder || null) !== folder);
      return [...otherItems, ...reorderedItems];
    });

    // Persist to database
    const chapterId = folderItems[0]?.chapter_id;
    if (chapterId) {
      const updates = reorderedItems.map((r, idx) => ({
        id: r.id,
        display_order: idx,
      }));

      reorderMutation.mutate(
        { resources: updates, chapterId },
        {
          onError: () => {
            toast.error('Failed to save order');
            setLocalResources(resources); // Revert on error
          },
        }
      );
    }
  }, [resources, reorderMutation]);

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No mind maps yet.</p>
      </div>
    );
  }

  // Check if we have any folders - if only one group and it's Uncategorized, show flat grid
  const hasRealFolders = groupedByFolder.length > 1 || 
    (groupedByFolder.length === 1 && groupedByFolder[0][0] !== 'Uncategorized');

  const renderGrid = (items: StudyResource[]) => {
    if (!canManage) {
      // Non-admin: no drag and drop
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(resource => (
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
        onDragEnd={(event) => handleDragEnd(event, items)}
      >
        <SortableContext items={items.map(r => r.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(resource => (
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

  return (
    <>
      {!hasRealFolders ? (
        // Flat grid (backwards compatible)
        renderGrid(groupedByFolder[0][1])
      ) : (
        // Folder sections with collapsible UI
        <div className="space-y-4">
          {groupedByFolder.map(([folder, items]) => (
            <Collapsible
              key={folder}
              open={expandedFolders.has(folder)}
              onOpenChange={() => toggleFolder(folder)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-lg transition-colors">
                {expandedFolders.has(folder) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Folder className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{folder}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 pl-6">
                  {renderGrid(items)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      <Dialog open={!!fullscreenResource} onOpenChange={() => setFullscreenResource(null)}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-4 flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle className="truncate">{fullscreenResource?.title}</DialogTitle>
              <div className="flex items-center gap-1">
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
                  className="h-8 w-8 ml-1"
                  onClick={handleFitToScreen}
                  title="Fit to screen"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={handlePrint}
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          {fullscreenResource && (() => {
            const fsContent = fullscreenResource.content as MindMapContent;
            const fsIsNodeBased = isNodeBasedMindMap(fsContent);
            
            return (
              <div 
                className="flex-1 min-h-0 mt-2 overflow-auto"
                style={{ 
                  cursor: zoom > 1 ? 'grab' : 'default'
                }}
              >
                <div 
                  className="min-w-full min-h-full flex items-center justify-center"
                  style={{
                    width: zoom > 1 ? `${zoom * 100}%` : '100%',
                    height: zoom > 1 ? `${zoom * 100}%` : '100%',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {fsIsNodeBased ? (
                    <MindMapNodeRenderer
                      centralConcept={fsContent.central_concept || fullscreenResource.title}
                      nodes={fsContent.nodes || []}
                      connections={fsContent.connections}
                      className="min-w-max"
                    />
                  ) : fsContent.imageUrl ? (
                    <img
                      src={fsContent.imageUrl}
                      alt={fullscreenResource.title}
                      className="object-contain"
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: zoom <= 1 ? '75vh' : 'none'
                      }}
                      draggable={false}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      <Network className="w-12 h-12 mx-auto mb-2" />
                      <p>No content to display</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
