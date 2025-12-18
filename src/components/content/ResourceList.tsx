import { useState } from 'react';
import { FileText, ExternalLink, Settings2, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  resource_type?: string | null;
  file_url?: string | null;
  external_url?: string | null;
}

interface ResourceListProps {
  resources: Resource[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function ResourceList({
  resources,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: ResourceListProps) {
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useContentDelete(
    'resources',
    moduleId || '',
    chapterId
  );
  const [feedbackItem, setFeedbackItem] = useState<Resource | null>(null);

  const canManage = canEdit || canDelete;

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No resources available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {resources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-md transition-shadow">
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
              <div className="flex items-center gap-2">
                {(resource.file_url || resource.external_url) && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={resource.file_url || resource.external_url || '#'} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </a>
                  </Button>
                )}
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Manage
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px] z-[50]">
                      {canEdit && (
                        <DropdownMenuItem className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit resource
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => askDelete(resource.id, resource.title)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete resource
                        </DropdownMenuItem>
                      )}
                      {showFeedback && (
                        <DropdownMenuItem
                          onClick={() => setFeedbackItem(resource)}
                          className="gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Give feedback
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
        />
      )}
    </>
  );
}
