import { useState, useCallback } from 'react';
import { Edit2, Trash2, ExternalLink, Network, ZoomIn, ZoomOut, Maximize2, RotateCcw, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudyResource, MindMapContent } from '@/hooks/useStudyResources';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

interface MindMapViewerProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

export function MindMapViewer({ resources, canManage = false, onEdit }: MindMapViewerProps) {
  const [fullscreenResource, setFullscreenResource] = useState<StudyResource | null>(null);
  const [zoom, setZoom] = useState(1);

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

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No mind maps yet.</p>
      </div>
    );
  }

  const handleDelete = (resource: StudyResource) => {
    requestResourceDelete('mind_map', resource.id, resource.title);
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => {
          const content = resource.content as MindMapContent;
          const isPdf = content.imageUrl?.toLowerCase().endsWith('.pdf');

          return (
            <Card key={resource.id} className="overflow-hidden group">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate flex-1">
                    {resource.title}
                  </CardTitle>
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit?.(resource)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(resource)}>
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
                ) : content.imageUrl ? (
                  <div className="relative">
                    <img
                      src={content.imageUrl}
                      alt={resource.title}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openFullscreen(resource)}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openFullscreen(resource)}
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
        })}
      </div>

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
          {fullscreenResource && (
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
                }}
              >
                <img
                  src={(fullscreenResource.content as MindMapContent).imageUrl}
                  alt={fullscreenResource.title}
                  className="object-contain"
                  style={{ 
                    width: `${zoom * 100}%`,
                    height: 'auto',
                    maxWidth: 'none',
                    maxHeight: zoom <= 1 ? '75vh' : 'none'
                  }}
                  draggable={false}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
