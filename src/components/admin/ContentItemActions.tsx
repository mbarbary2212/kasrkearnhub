import { useState, type SyntheticEvent, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, MessageSquare, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateContent, useSoftDeleteContent } from '@/hooks/useContentCrud';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
import EssayRubricEditor, { parseRubricJson, buildRubricJson } from '@/components/admin/EssayRubricEditor';
import { ItemType } from '@/hooks/useItemFeedback';
import { isValidVideoUrl, normalizeVideoInput } from '@/lib/video';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';
import { SectionSelector } from '@/components/sections';
import { MoveToChapterModal } from '@/components/admin/MoveToChapterModal';
interface ContentItemActionsProps {
  id: string;
  title: string;
  description?: string | null;
  modelAnswer?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  sectionId?: string | null;
  rating?: number | null;
  maxPoints?: number | null;
  questionType?: string | null;
  rubricJson?: unknown | null;
  keywords?: string[] | null;
  difficultyLevel?: string | null;
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
  rating,
  maxPoints,
  questionType,
  rubricJson,
  keywords,
  difficultyLevel,
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
  const [moveOpen, setMoveOpen] = useState(false);

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
  const [editRating, setEditRating] = useState<number>(rating ?? 10);
  const [editMaxPoints, setEditMaxPoints] = useState<number>(maxPoints ?? rating ?? 10);
  const [editKeywords, setEditKeywords] = useState<string>(keywords?.join(', ') ?? '');
  const [editDifficulty, setEditDifficulty] = useState<string>(difficultyLevel || '');
  const [rubricData, setRubricData] = useState(() => parseRubricJson(rubricJson));

  const handleRubricChange = useCallback((partial: Partial<typeof rubricData>) => {
    setRubricData(prev => ({ ...prev, ...partial }));
  }, []);

  // Sync edit state with props when dialog opens
  const handleOpenEdit = () => {
    setEditTitle(title);
    setEditDescription(description || '');
    setEditModelAnswer(modelAnswer || '');
    setEditVideoUrl(videoUrl || '');
    setEditFileUrl(fileUrl || '');
    setEditSectionId(sectionId || null);
    setEditRating(rating ?? 10);
    setEditMaxPoints(maxPoints ?? rating ?? 10);
    setEditKeywords(keywords?.join(', ') ?? '');
    setEditDifficulty(difficultyLevel || '');
    setRubricData(parseRubricJson(rubricJson));
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
      toast.error('Invalid video URL. Use YouTube or Google Drive links.');
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
        data.rating = editRating;
        data.max_points = editMaxPoints;
        const kw = editKeywords.split(',').map(k => k.trim()).filter(Boolean);
        data.keywords = kw.length > 0 ? kw : null;
        data.difficulty_level = editDifficulty || null;
        // Build rubric_json from visual editor — always structured v1
        const rubricObj = buildRubricJson(rubricData);
        const requiredConcepts = rubricObj.required_concepts as Array<{ label: string }>;
        const optionalConcepts = rubricObj.optional_concepts as Array<{ label: string }>;
        const hasRubric = requiredConcepts.length > 0 || optionalConcepts.length > 0;
        if (!hasRubric) {
          toast.error('Short Questions require a structured rubric. Add at least one required concept.');
          return;
        }
        if (rubricObj.rubric_version !== 1) {
          toast.error('Rubric must be structured v1 format.');
          return;
        }
        data.rubric_json = rubricObj;
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
              {canEdit && chapterId && moduleId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.stopPropagation();
                      setMoveOpen(true);
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Move / Copy
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit {contentType}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pt-2 pr-1">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{contentType === 'essay' ? 'Question' : 'Description'}</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" />
            </div>
            {contentType === 'essay' && (
              <>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rating (max mark)</Label>
                    <Select value={String(editRating)} onValueChange={(v) => setEditRating(Number(v))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 5).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Points</Label>
                    <Select value={String(editMaxPoints)} onValueChange={(v) => setEditMaxPoints(Number(v))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 5).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    value={editKeywords}
                    onChange={(e) => setEditKeywords(e.target.value)}
                    placeholder="e.g. hyponatremia, sodium, management"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={editDifficulty || '_none'} onValueChange={(v) => setEditDifficulty(v === '_none' ? '' : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Not set</SelectItem>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <EssayRubricEditor
                  rubricData={rubricData}
                  onRubricChange={handleRubricChange}
                  question={editDescription}
                  modelAnswer={editModelAnswer}
                  keywords={editKeywords}
                />
              </>
            )}
            {(contentType === 'lecture' || contentType === 'practical') && (
              <div>
                <Label>Video URL</Label>
                <Input 
                  value={editVideoUrl} 
                  onChange={(e) => setEditVideoUrl(e.target.value)} 
                  placeholder="YouTube or Google Drive link (or paste iframe code)" 
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
          </div>
          <div className="shrink-0 pt-4 border-t">
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

      {/* Move to Chapter Modal */}
      {chapterId && moduleId && (
        <MoveToChapterModal
          open={moveOpen}
          onOpenChange={setMoveOpen}
          moduleId={moduleId}
          currentChapterId={chapterId}
          contentTable={TABLE_MAP[contentType] as any}
          itemIds={[id]}
          onComplete={() => setMoveOpen(false)}
        />
      )}
    </>
  );
}
