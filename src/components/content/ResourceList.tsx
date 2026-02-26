import { useState } from 'react';
import { FileText, ExternalLink, Pencil, Trash2, MessageSquare, FileIcon, Music, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useContentDelete } from '@/hooks/useContentDelete';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
import { PdfViewerModal } from '@/components/content/PdfViewerModal';
import { AudioPlayer } from '@/components/audio';

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  resource_type?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  audio_storage_path?: string | null;
  section_id?: string | null;
}

interface ResourceListProps {
  resources: Resource[];
  moduleId?: string;
  chapterId?: string;
  topicId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
  compact?: boolean;
  onEdit?: (resource: Resource) => void;
}

// Check if a URL is a PDF (by extension or resource_type)
function isPdfResource(resource: Resource): boolean {
  if (resource.resource_type === 'pdf') return true;
  const url = resource.file_url || resource.external_url || '';
  return url.toLowerCase().endsWith('.pdf');
}

// Check if resource is an audio file
function isAudioResource(resource: Resource): boolean {
  return resource.resource_type === 'audio' && !!resource.audio_storage_path;
}

export default function ResourceList({
  resources,
  moduleId,
  chapterId,
  topicId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
  compact = false,
  onEdit,
}: ResourceListProps) {
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useContentDelete(
    'resources',
    moduleId || '',
    chapterId
  );
  const [feedbackItem, setFeedbackItem] = useState<Resource | null>(null);
  const [pdfViewerResource, setPdfViewerResource] = useState<Resource | null>(null);

  const canManage = canEdit || canDelete;

  // Handle resource click - open PDF viewer or external link
  const handleResourceClick = (resource: Resource) => {
    const url = resource.file_url || resource.external_url;
    if (!url) return;

    if (isPdfResource(resource)) {
      setPdfViewerResource(resource);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (resources.length === 0) {
    return null;
  }

  // Compact list view for simpler UI
  if (compact) {
    return (
      <>
        <div className="space-y-0.5 border rounded-lg divide-y">
          {resources.map((resource) => {
            // Audio resources get special treatment
            if (isAudioResource(resource)) {
              return (
                <div key={resource.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-3 mb-2">
                    <Music className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{resource.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">Audio</span>
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canManage && (
                        <>
                          {canEdit && onEdit && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={() => onEdit(resource)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => askDelete(resource.id, resource.title)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                      {showFeedback && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => setFeedbackItem(resource)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <AudioPlayer
                    resourceId={resource.id}
                    title={resource.title}
                    moduleId={moduleId}
                    chapterId={chapterId}
                    sectionId={resource.section_id || undefined}
                  />
                </div>
              );
            }

            // Non-audio resources
            return (
              <div 
                key={resource.id} 
                className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors group ${
                  (resource.file_url || resource.external_url) ? 'cursor-pointer' : ''
                }`}
                onClick={() => handleResourceClick(resource)}
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{resource.title}</span>
                  {resource.resource_type && (
                    <span className="text-xs text-muted-foreground capitalize">{resource.resource_type}</span>
                  )}
                </div>
                <div
                  className="flex items-center gap-1.5"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(resource.file_url || resource.external_url) && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2"
                            onClick={() => handleResourceClick(resource)}
                          >
                            {isPdfResource(resource) ? (
                              <FileIcon className="w-3.5 h-3.5" />
                            ) : (
                              <ExternalLink className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isPdfResource(resource) ? 'View PDF' : 'Open Link'}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={resource.file_url || resource.external_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {canManage && (
                    <>
                      {canEdit && onEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={() => onEdit(resource)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => askDelete(resource.id, resource.title)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                  {showFeedback && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => setFeedbackItem(resource)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Feedback</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
          <AlertDialogContent className="z-[99999]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete resource?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-medium text-foreground">"{pendingItem?.title}"</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  doDelete();
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {moduleId && feedbackItem && (
          <ItemFeedbackModal
            isOpen={!!feedbackItem}
            onClose={() => setFeedbackItem(null)}
            itemType="resource"
            itemId={feedbackItem.id}
            itemTitle={feedbackItem.title}
            moduleId={moduleId}
            chapterId={chapterId}
            topicId={topicId}
          />
        )}

        {pdfViewerResource && (
          <PdfViewerModal
            open={!!pdfViewerResource}
            onOpenChange={(open) => !open && setPdfViewerResource(null)}
            pdfUrl={pdfViewerResource.file_url || pdfViewerResource.external_url || ''}
            title={pdfViewerResource.title}
          />
        )}
      </>
    );
  }

  // Full card view (original)
  return (
    <>
      <div className="space-y-3">
        {resources.map((resource) => {
          // Audio resources get special treatment with inline player
          if (isAudioResource(resource)) {
            return (
              <Card key={resource.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{resource.title}</h3>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
                      )}
                      <span className="text-xs text-muted-foreground capitalize">Audio</span>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canManage && (
                        <>
                          {canEdit && onEdit && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => onEdit(resource)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => askDelete(resource.id, resource.title)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {showFeedback && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setFeedbackItem(resource)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <AudioPlayer
                    resourceId={resource.id}
                    title={resource.title}
                    moduleId={moduleId}
                    chapterId={chapterId}
                    sectionId={resource.section_id || undefined}
                  />
                </CardContent>
              </Card>
            );
          }

          // Non-audio resources
          return (
            <Card 
              key={resource.id} 
              className={`hover:shadow-md transition-shadow ${
                (resource.file_url || resource.external_url) ? 'cursor-pointer' : ''
              }`}
              onClick={() => handleResourceClick(resource)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{resource.description}</p>
                  )}
                  <span className="text-xs text-muted-foreground capitalize">{resource.resource_type}</span>
                </div>
                <div
                  className="flex items-center gap-2"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(resource.file_url || resource.external_url) && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleResourceClick(resource)}
                      >
                        {isPdfResource(resource) ? (
                          <FileIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-1" />
                        )}
                        {isPdfResource(resource) ? 'View' : 'Open'}
                      </Button>
                      <a
                        href={resource.file_url || resource.external_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    </>
                  )}
                  {canManage && (
                    <>
                      {canEdit && onEdit && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => onEdit(resource)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => askDelete(resource.id, resource.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {showFeedback && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setFeedbackItem(resource)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">"{pendingItem?.title}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {moduleId && feedbackItem && (
        <ItemFeedbackModal
          isOpen={!!feedbackItem}
          onClose={() => setFeedbackItem(null)}
          itemType="resource"
          itemId={feedbackItem.id}
          itemTitle={feedbackItem.title}
          moduleId={moduleId}
          chapterId={chapterId}
          topicId={topicId}
        />
      )}

      {pdfViewerResource && (
        <PdfViewerModal
          open={!!pdfViewerResource}
          onOpenChange={(open) => !open && setPdfViewerResource(null)}
          pdfUrl={pdfViewerResource.file_url || pdfViewerResource.external_url || ''}
          title={pdfViewerResource.title}
        />
      )}
    </>
  );
}
