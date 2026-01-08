import { useState } from 'react';
import { Edit2, Trash2, ExternalLink, Network, ZoomIn, Maximize2 } from 'lucide-react';
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

interface MindMapViewerProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

export function MindMapViewer({ resources, canManage = false, onEdit }: MindMapViewerProps) {
  const [fullscreenResource, setFullscreenResource] = useState<StudyResource | null>(null);

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
                      onClick={() => setFullscreenResource(resource)}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFullscreenResource(resource)}
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
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle>{fullscreenResource?.title}</DialogTitle>
          </DialogHeader>
          {fullscreenResource && (
            <div className="flex items-center justify-center overflow-auto">
              <img
                src={(fullscreenResource.content as MindMapContent).imageUrl}
                alt={fullscreenResource.title}
                className="max-w-full max-h-[75vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
