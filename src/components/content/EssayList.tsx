import { useState } from 'react';
import { PenTool, Settings2, Pencil, Trash2, MessageSquare } from 'lucide-react';
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

interface Essay {
  id: string;
  title: string;
  question: string;
}

interface EssayListProps {
  essays: Essay[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function EssayList({
  essays,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: EssayListProps) {
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting } = useContentDelete(
    'essays',
    moduleId || '',
    chapterId
  );
  const [feedbackItem, setFeedbackItem] = useState<Essay | null>(null);

  const canManage = canEdit || canDelete;

  if (essays.length === 0) {
    return (
      <div className="text-center py-12">
        <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No short questions available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {essays.map((essay) => (
          <Card key={essay.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-medium mb-2">{essay.title}</h3>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Manage
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      {canEdit && (
                        <DropdownMenuItem className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit question
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => askDelete(essay.id)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete question
                        </DropdownMenuItem>
                      )}
                      {showFeedback && (
                        <DropdownMenuItem
                          onClick={() => setFeedbackItem(essay)}
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
              <p className="text-sm text-muted-foreground line-clamp-2">{essay.question}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the short question from this section.
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
          itemType="shortq"
          itemId={feedbackItem.id}
          itemTitle={feedbackItem.title}
          moduleId={moduleId}
          chapterId={chapterId}
        />
      )}
    </>
  );
}
