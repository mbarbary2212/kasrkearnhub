import { useState, useCallback } from 'react';
import {
  X,
  Edit2,
  Trash2,
  FileText,
  Image,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudyResource, InfographicContent } from '@/hooks/useStudyResources';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';
import { cn } from '@/lib/utils';
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

function getFileUrl(content: InfographicContent): string | undefined {
  return content.fileUrl || (content as any).imageUrl;
}

interface InfographicViewerProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  chapterId?: string;
  topicId?: string;
  starredIds?: Set<string>;
  onToggleStar?: (cardId: string, chapterId?: string, topicId?: string) => void;
}

export function InfographicViewer({
  resources,
  canManage = false,
  onEdit,
  chapterId,
  topicId,
  starredIds,
  onToggleStar,
}: InfographicViewerProps) {
  const [fullscreenResource, setFullscreenResource] = useState<StudyResource | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleDelete = useCallback((resource: StudyResource) => {
    requestResourceDelete('mind_map', resource.id, resource.title);
  }, []);

  const openFullscreen = useCallback((resource: StudyResource) => {
    setFullscreenResource(resource);
    setZoom(1);
  }, []);

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No infographics yet.</p>
      </div>
    );
  }

  const fullscreenContent = fullscreenResource?.content as InfographicContent | null;
  const fullscreenFileUrl = fullscreenContent ? getFileUrl(fullscreenContent) : undefined;
  const isPdf = fullscreenFileUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map(resource => {
          const content = resource.content as InfographicContent;
          const fileUrl = getFileUrl(content);
          const cardIsPdf = fileUrl?.toLowerCase().endsWith('.pdf');

          return (
            <Card key={resource.id} className="overflow-hidden group">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate flex-1">
                    {resource.title}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {/* Star button for students */}
                    {onToggleStar && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(resource.id, resource.chapter_id || undefined, resource.topic_id || undefined);
                        }}
                      >
                        <Star className={cn("w-3.5 h-3.5", starredIds?.has(resource.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                      </Button>
                    )}
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
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {cardIsPdf ? (
                  <div
                    className="flex flex-col items-center justify-center gap-2 h-32 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => openFullscreen(resource)}
                  >
                    <FileText className="w-10 h-10 text-primary" />
                    <span className="text-sm text-muted-foreground">Click to view PDF</span>
                  </div>
                ) : fileUrl ? (
                  <div className="relative">
                    <img
                      src={fileUrl}
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
                    <Image className="w-8 h-8 text-muted-foreground" />
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
          className={cn(
            "max-w-[95vw] max-h-[95vh] flex flex-col",
            isPdf ? "p-2" : "p-4"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {!isPdf && (
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between gap-4 pr-8">
                <DialogTitle className="truncate">{fullscreenResource?.title}</DialogTitle>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM))} disabled={zoom <= MIN_ZOOM}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-14 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM))} disabled={zoom >= MAX_ZOOM}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom(1)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  {fullscreenFileUrl && (
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => window.open(fullscreenFileUrl, '_blank')}>
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>
          )}
          {isPdf && (
            <>
              <DialogTitle className="sr-only">{fullscreenResource?.title}</DialogTitle>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-accent"
                onClick={() => setFullscreenResource(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          <div
            className={cn("flex-1 overflow-auto rounded-lg", isPdf ? "bg-white" : "bg-muted/30 mt-4")}
            style={{ minHeight: isPdf ? 'calc(95vh - 40px)' : '60vh' }}
          >
            {isPdf && fullscreenFileUrl ? (
              <iframe
                src={`${fullscreenFileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0 bg-white rounded"
                style={{ minHeight: 'calc(95vh - 40px)' }}
                title={fullscreenResource?.title}
              />
            ) : fullscreenFileUrl ? (
              <div className="flex items-center justify-center p-4 overflow-auto" style={{ minHeight: '60vh' }}>
                <img
                  src={fullscreenFileUrl}
                  alt={fullscreenResource?.title}
                  style={{
                    ...(zoom !== 1
                      ? {
                          transform: `scale(${zoom})`,
                          transformOrigin: 'center center',
                        }
                      : {}),
                    transition: 'transform 0.2s ease-out',
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain' as const,
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Image className="w-16 h-16 mx-auto mb-2" />
                <p>No content available</p>
              </div>
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
