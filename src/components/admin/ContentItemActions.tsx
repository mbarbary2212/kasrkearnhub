import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateContent, useSoftDeleteContent } from '@/hooks/useContentCrud';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
import { ItemType } from '@/hooks/useItemFeedback';
import { isValidVideoUrl } from '@/lib/video';

interface ContentItemActionsProps {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  contentType: 'lecture' | 'resource' | 'mcq' | 'essay' | 'practical';
  moduleId: string;
  chapterId?: string;
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
  videoUrl,
  fileUrl,
  contentType,
  moduleId,
  chapterId,
  canEdit,
  canDelete,
  showFeedback = true,
}: ContentItemActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || '');
  const [editVideoUrl, setEditVideoUrl] = useState(videoUrl || '');
  const [editFileUrl, setEditFileUrl] = useState(fileUrl || '');

  const table = TABLE_MAP[contentType];
  const updateContent = useUpdateContent(table);
  const softDeleteContent = useSoftDeleteContent(table);

  const handleEdit = async () => {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    if ((contentType === 'lecture' || contentType === 'practical') && editVideoUrl && !isValidVideoUrl(editVideoUrl)) {
      toast.error('Invalid video URL');
      return;
    }

    try {
      const data: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      };

      if (contentType === 'lecture' || contentType === 'practical') {
        data.video_url = editVideoUrl || null;
      }
      if (contentType === 'resource') {
        data.external_url = editFileUrl || null;
      }
      if (contentType === 'essay') {
        data.question = editDescription.trim() || null;
      }

      await updateContent.mutateAsync({ id, data });
      toast.success('Updated successfully');
      setEditOpen(false);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    try {
      await softDeleteContent.mutateAsync(id);
      toast.success('Deleted successfully');
      setDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const showEditDelete = canEdit || canDelete;

  return (
    <>
      <div className="flex items-center gap-1">
        {showFeedback && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setFeedbackOpen(true);
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        {showEditDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive">
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
            {(contentType === 'lecture' || contentType === 'practical') && (
              <div>
                <Label>Video URL</Label>
                <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link" className="mt-1" />
              </div>
            )}
            {contentType === 'resource' && (
              <div>
                <Label>File/External URL</Label>
                <Input value={editFileUrl} onChange={(e) => setEditFileUrl(e.target.value)} className="mt-1" />
              </div>
            )}
            <Button onClick={handleEdit} className="w-full" disabled={updateContent.isPending}>
              {updateContent.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete {contentType}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={softDeleteContent.isPending}>
              {softDeleteContent.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <ItemFeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        moduleId={moduleId}
        chapterId={chapterId}
        itemType={ITEM_TYPE_MAP[contentType]}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}
