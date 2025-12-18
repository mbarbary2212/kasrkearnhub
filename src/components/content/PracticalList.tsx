import { useState } from 'react';
import { FlaskConical, Settings2, Pencil, Trash2, MessageSquare } from 'lucide-react';
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

interface Practical {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
}

interface PracticalListProps {
  practicals: Practical[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function PracticalList({
  practicals,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: PracticalListProps) {
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useContentDelete(
    'practicals',
    moduleId || '',
    chapterId
  );
  const [feedbackItem, setFeedbackItem] = useState<Practical | null>(null);

  const canManage = canEdit || canDelete;

  if (practicals.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No practicals available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {practicals.map((practical) => (
          <Card key={practical.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">{practical.title}</h3>
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
                              Edit practical
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => askDelete(practical.id, practical.title)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete practical
                            </DropdownMenuItem>
                          )}
                          {showFeedback && (
                            <DropdownMenuItem
                              onClick={() => setFeedbackItem(practical)}
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
                  {practical.description && (
                    <p className="text-sm text-muted-foreground mt-1">{practical.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete practical?</AlertDialogTitle>
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
          itemType="practical"
          itemId={feedbackItem.id}
          itemTitle={feedbackItem.title}
          moduleId={moduleId}
          chapterId={chapterId}
        />
      )}
    </>
  );
}
