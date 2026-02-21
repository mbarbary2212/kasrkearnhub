import { useState, type SyntheticEvent } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateContent, useSoftDeleteContent } from '@/hooks/useContentCrud';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
import { ItemType } from '@/hooks/useItemFeedback';
import { isValidVideoUrl, normalizeVideoInput } from '@/lib/video';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';
import { SectionSelector } from '@/components/sections';

interface ContentItemActionsProps {
  id: string;
  title: string;
  description?: string | null;
  modelAnswer?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  sectionId?: string | null;
  contentType: 'lecture' | 'resource' | 'mcq' | 'essay' | 'practical';
  moduleId: string;
  chapterId?: string;
  topicId?: string;
  canEdit: boolean;
  canDelete: boolean;
  showFeedback?: boolean;
}

const TABLE_MAP = {
  lecture: 'lectures',
  resource: 'resources',
  mcq: 'mcq_sets',
  essay: 'essays',
  practical: 'practicals',
} as const;

const ITEM_TYPE_MAP: Record<string, ItemType> = {
  lecture: 'video',
  resource: 'resource',
  mcq: 'mcq',
  essay: 'shortq',
  practical: 'practical',
};

export default function ContentItemActions({
  id,
  title,
  description,
  modelAnswer,
  videoUrl,
  fileUrl,
  sectionId,
  contentType,
  moduleId,
  chapterId,
  topicId,
  canEdit,
  canDelete,
  showFeedback = true,
}: ContentItemActionsProps) {
  const { isModuleAdmin, isTopicAdmin } = useAuthContext();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Helper to create permission-aware error messages
  const handlePermissionError = (error: Error | unknown, action: 'edit' | 'delete') => {
    const message = getPermissionErrorMessage(error, {
      action,
      contentType,
      isModuleAdmin,
      isTopicAdmin,
      isChapterAdmin: isTopicAdmin,
    });
    toast.error(message);
  };

  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || '');
  const [editModelAnswer, setEditModelAnswer] = useState(modelAnswer || '');
  const [editVideoUrl, setEditVideoUrl] = useState(videoUrl || '');
  const [editFileUrl, setEditFileUrl] = useState(fileUrl || '');
  const [editSectionId, setEditSectionId] = useState<string | null>(sectionId || null);

  // Sync edit state with props when dialog opens
  const handleOpenEdit = () => {
    setEditTitle(title);
    setEditDescription(description || '');
    setEditModelAnswer(modelAnswer || '');
    setEditVideoUrl(videoUrl || '');
    setEditFileUrl(fileUrl || '');
    setEditSectionId(sectionId || null);
    setEditOpen(true);
  };

  const table = TABLE_MAP[contentType];
  const updateContent = useUpdateContent(table);
  const softDeleteContent = useSoftDeleteContent(table);

  const handleEdit = async () => {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    // Normalize video URL (extract from iframe if needed)
    const normalizedVideoUrl = normalizeVideoInput(editVideoUrl);
    
    if ((contentType === 'lecture' || contentType === 'practical') && normalizedVideoUrl && !isValidVideoUrl(normalizedVideoUrl)) {
      toast.error('Invalid video URL. Use YouTube, Vimeo, or Google Drive links.');
      return;
    }

    try {
      const data: Record<string, unknown> = {
        title: editTitle.trim(),
      };

      // Essays store the prompt in `question`, not `description`
      if (contentType === 'essay') {
        data.question = editDescription.trim() || null;
        data.model_answer = editModelAnswer.trim() || null;
      } else {
        data.description = editDescription.trim() || null;
      }

      if (contentType === 'lecture' || contentType === 'practical') {
        data.video_url = normalizedVideoUrl || null;
      }
      if (contentType === 'resource') {
        data.external_url = editFileUrl || null;
      }

      data.section_id = editSectionId;

      await updateContent.mutateAsync({ id, data, moduleId, chapterId });
      toast.success('Updated successfully');
      setEditOpen(false);
    } catch (error) {
      handlePermissionError(error, 'edit');
    }
  };

  const handleDelete = async () => {
    try {
      await softDeleteContent.mutateAsync({ id, moduleId, chapterId });
      toast.success('Deleted successfully');
      setDeleteOpen(false);
    } catch (error) {
      handlePermissionError(error, 'delete');
    }
  };

  const showEditDelete = canEdit || canDelete;

  const stopParentClick = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {showFeedback && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Send Feedback"
            onPointerDown={stopParentClick}
            onClick={(e) => {
              e.stopPropagation();
              setFeedbackOpen(true);
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        {showEditDelete && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onPointerDown={stopParentClick}
                onClick={stopParentClick}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.stopPropagation();
                    handleOpenEdit();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit {contentType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{contentType === 'essay' ? 'Question' : 'Description'}</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" />
            </div>
            {contentType === 'essay' && (
              <div>
                <Label>Model Answer (optional)</Label>
                <Textarea 
                  value={editModelAnswer} 
                  onChange={(e) => setEditModelAnswer(e.target.value)} 
                  placeholder="Enter the model answer that students can reveal"
                  rows={4}
                  className="mt-1"
                />
              </div>
            )}
            {(contentType === 'lecture' || contentType === 'practical') && (
              <div>
                <Label>Video URL</Label>
                <Input 
                  value={editVideoUrl} 
                  onChange={(e) => setEditVideoUrl(e.target.value)} 
                  placeholder="YouTube, Vimeo, or Google Drive link (or paste iframe code)" 
                  className="mt-1" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can paste iframe embed codes - the URL will be extracted automatically.
                </p>
              </div>
            )}
            {contentType === 'resource' && (
              <div>
                <Label>File/External URL</Label>
                <Input value={editFileUrl} onChange={(e) => setEditFileUrl(e.target.value)} className="mt-1" />
              </div>
            )}
            <SectionSelector
              chapterId={chapterId}
              value={editSectionId}
              onChange={setEditSectionId}
            />
            <Button onClick={handleEdit} className="w-full" disabled={updateContent.isPending}>
              {updateContent.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {contentType}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleDelete();
              }}
              disabled={softDeleteContent.isPending}
            >
              {softDeleteContent.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Modal */}
      <ItemFeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        moduleId={moduleId}
        chapterId={chapterId}
        topicId={topicId}
        itemType={ITEM_TYPE_MAP[contentType]}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}
