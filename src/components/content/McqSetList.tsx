import { useState } from 'react';
import { HelpCircle, Clock, Settings2, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface McqSet {
  id: string;
  title: string;
  description?: string | null;
  time_limit_minutes?: number | null;
}

interface McqSetListProps {
  mcqSets: McqSet[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function McqSetList({
  mcqSets,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: McqSetListProps) {
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting } = useContentDelete(
    'mcq_sets',
    moduleId || '',
    chapterId
  );
  const [feedbackItem, setFeedbackItem] = useState<McqSet | null>(null);

  const canManage = canEdit || canDelete;

  if (mcqSets.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No MCQs available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mcqSets.map((mcqSet) => (
          <Card key={mcqSet.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg flex-1">{mcqSet.title}</CardTitle>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Manage
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      {canEdit && (
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit MCQ set
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); askDelete(mcqSet.id); }}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete MCQ set
                        </DropdownMenuItem>
                      )}
                      {showFeedback && (
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setFeedbackItem(mcqSet); }}
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
              {mcqSet.description && (
                <CardDescription>{mcqSet.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {mcqSet.time_limit_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{mcqSet.time_limit_minutes} min</span>
                  </div>
                )}
              </div>
              <Button className="w-full mt-3" size="sm">
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this MCQ set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the MCQ set and all its questions from this section.
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
          itemType="mcq"
          itemId={feedbackItem.id}
          itemTitle={feedbackItem.title}
          moduleId={moduleId}
          chapterId={chapterId}
        />
      )}
    </>
  );
}
