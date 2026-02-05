import { useState, useCallback } from 'react';
import { Clock, Video, Settings2, Pencil, Trash2, MessageSquare, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getVideoInfo, isValidVideoUrl, normalizeVideoInput, isVimeoUrl } from '@/lib/video';
import { useVideoDelete } from '@/hooks/useVideoDelete';
import { useUpdateContent } from '@/hooks/useContentCrud';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
import { toast } from 'sonner';
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
import { SectionSelector, BulkSectionAssignment } from '@/components/sections';
import { LecturesAdminTable } from './LecturesAdminTable';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { useBulkDeleteContent } from '@/hooks/useContentBulkOperations';

interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  duration?: string | null;
  section_id?: string | null;
}

interface LectureListProps {
  lectures: Lecture[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

function buildAutoplayUrl(rawUrl: string | null | undefined): string | null {
  // First normalize to handle iframe codes
  const url = normalizeVideoInput(rawUrl);
  if (!url) return null;
  
  try {
    // YouTube watch -> embed with autoplay
    if (url.includes("youtube.com/watch")) {
      const u = new URL(url);
      const id = u.searchParams.get("v");
      if (id) {
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`;
      }
    }
    // YouTube shorts -> embed
    if (url.includes("youtube.com/shorts/")) {
      const id = url.split("shorts/")[1]?.split("?")[0];
      if (id) {
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`;
      }
    }
    // youtu.be links
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      if (id) {
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1`;
      }
    }
    // Already an embed URL: append autoplay params
    if (url.includes("youtube.com/embed/")) {
      const u = new URL(url);
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("mute", "1");
      u.searchParams.set("playsinline", "1");
      return u.toString();
    }
    // Google Drive
    if (url.includes("drive.google.com")) {
      return url;
    }
    return url;
  } catch {
    return url;
  }
}

export function LectureList({
  lectures,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: LectureListProps) {
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<Lecture | null>(null);
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const bulkDelete = useBulkDeleteContent('lectures');

  const handleSelectLecture = useCallback((lecture: Lecture) => {
    setSelectedLecture(lecture);
    setIsPlayerReady(false);
    setPlayerKey(prev => prev + 1);
  }, []);

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(lectures.map(l => l.id)));
  }, [lectures]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync({
        ids: Array.from(selectedIds),
        chapterId,
      });
      toast.success(`Deleted ${selectedIds.size} lectures`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to delete lectures');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useVideoDelete(
    moduleId || '',
    chapterId
  );
  const updateContent = useUpdateContent('lectures');

  const handleOpenEdit = (lecture: Lecture) => {
    setEditLecture(lecture);
    setEditTitle(lecture.title);
    setEditDescription(lecture.description || '');
    setEditVideoUrl(lecture.video_url || lecture.videoUrl || '');
    setEditDuration(lecture.duration || '');
    setEditSectionId(lecture.section_id || null);
  };

  const handleSaveEdit = async () => {
    if (!editLecture) return;
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    
    // Normalize video URL (extract from iframe if needed)
    const normalizedUrl = normalizeVideoInput(editVideoUrl);
    
    if (normalizedUrl && !isValidVideoUrl(normalizedUrl)) {
      toast.error('Invalid video URL. Use YouTube, Vimeo, or Google Drive links.');
      return;
    }

    setIsEditSaving(true);
    try {
      await updateContent.mutateAsync({
        id: editLecture.id,
        data: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          video_url: normalizedUrl || null,
          duration: editDuration.trim() || null,
          section_id: editSectionId,
        },
      });
      toast.success('Lecture updated successfully');
      setEditLecture(null);
    } catch (error) {
      toast.error('Failed to update lecture');
    } finally {
      setIsEditSaving(false);
    }
  };

  const canManage = canEdit || canDelete;

  if (lectures.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No lectures available yet.</p>
      </div>
    );
  }

  const videoUrl = selectedLecture?.video_url || selectedLecture?.videoUrl;
  const normalizedVideoUrl = normalizeVideoInput(videoUrl);
  const isVimeoVideo = isVimeoUrl(normalizedVideoUrl);
  const embedUrl = isVimeoVideo ? null : buildAutoplayUrl(videoUrl);

  // Admin Table View
  if (canManage && adminViewMode === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
        </div>
        <LecturesAdminTable
          lectures={lectures}
          chapterId={chapterId}
          moduleId={moduleId}
          onEdit={handleOpenEdit}
          onDelete={(lecture) => askDelete(lecture.id, lecture.title)}
        />
        
        {/* Edit Modal */}
        <Dialog open={!!editLecture} onOpenChange={(open) => !open && setEditLecture(null)}>
          <DialogContent className="z-[99999]">
            <DialogHeader>
              <DialogTitle>Edit Lecture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Lecture title"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (optional)</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Lecture description"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-video-url">Video URL</Label>
                <Input
                  id="edit-video-url"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  placeholder="YouTube or Google Drive link (or paste iframe code)"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports YouTube and Google Drive. Vimeo support coming soon.
                </p>
              </div>
              <div>
                <Label htmlFor="edit-duration">Duration (optional)</Label>
                <Input
                  id="edit-duration"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  placeholder="e.g., 15:30"
                  className="mt-1"
                />
              </div>
              <SectionSelector
                chapterId={chapterId}
                value={editSectionId}
                onChange={setEditSectionId}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLecture(null)} disabled={isEditSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isEditSaving}>
                {isEditSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
          <AlertDialogContent className="z-[99999]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete lecture?</AlertDialogTitle>
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
      </div>
    );
  }

  return (
    <>
      {/* Admin View Toggle */}
      {canManage && (
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          {/* Multi-select controls */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size > 0 && selectedIds.size === lectures.length}
              onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
            {selectedIds.size > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 gap-1">
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
                {chapterId && (
                  <BulkSectionAssignment
                    chapterId={chapterId}
                    selectedIds={Array.from(selectedIds)}
                    contentTable="lectures"
                    onComplete={clearSelection}
                  />
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="h-7 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
          <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
        </div>
      )}
      <div className="space-y-2">
        {lectures.map((lecture) => {
          const lectureVideoUrl = lecture.video_url || lecture.videoUrl || null;
          const videoInfo = getVideoInfo(lectureVideoUrl);
          const isValid = isValidVideoUrl(lectureVideoUrl);

          return (
            <div
              key={lecture.id}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              {/* Checkbox for multi-select (admin only) */}
              {canManage && (
                <Checkbox
                  checked={selectedIds.has(lecture.id)}
                  onCheckedChange={(checked) => toggleSelection(lecture.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${lecture.title}`}
                  className="shrink-0"
                />
              )}

              {/* Thumbnail */}
              <button
                onClick={() => isValid && handleSelectLecture(lecture)}
                disabled={!isValid}
                className="w-20 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center relative disabled:opacity-50"
              >
                {videoInfo.thumbnailUrl ? (
                  <>
                    <img
                      src={videoInfo.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center">
                        <span className="text-primary-foreground text-xs ml-0.5">▶</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <Video className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {/* Content */}
              <button
                onClick={() => isValid && handleSelectLecture(lecture)}
                disabled={!isValid}
                className="flex-1 min-w-0 text-left disabled:opacity-50"
              >
                <div className="font-semibold truncate">{lecture.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {lecture.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lecture.duration}
                    </span>
                  )}
                  <span>Tap to play</span>
                </div>
              </button>

              {/* Actions */}
              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                      <Settings2 className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">Manage</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleOpenEdit(lecture);
                        }} 
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); askDelete(lecture.id, lecture.title); }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                    {showFeedback && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setFeedbackItem(lecture); }}
                        className="gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Feedback
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-muted-foreground text-lg">▶</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Video Player Modal */}
      <Dialog 
        open={!!selectedLecture} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLecture(null);
            setIsPlayerReady(false);
            setPlayerKey(0);
          }
        }}
      >
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="pr-8">{selectedLecture?.title}</DialogTitle>
          </DialogHeader>
          <div className="w-full bg-black">
            {/* Vimeo - show unsupported message */}
            {isVimeoVideo ? (
              <div className="w-full aspect-video flex items-center justify-center bg-muted">
                <div className="text-center space-y-4 p-6 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-background flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">
                      Vimeo Not Supported
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vimeo video playback is temporarily unavailable. Please use YouTube or Google Drive links.
                    </p>
                  </div>
                </div>
              </div>
            ) : embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  key={playerKey}
                  src={embedUrl}
                  title={selectedLecture?.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => setTimeout(() => setIsPlayerReady(true), 500)}
                />
              </div>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-muted">
                <div className="text-center space-y-4 p-6 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-background flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">
                      Video Source Not Supported
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Please use YouTube or Google Drive links for video playback.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editLecture} onOpenChange={(open) => !open && setEditLecture(null)}>
        <DialogContent className="z-[99999]">
          <DialogHeader>
            <DialogTitle>Edit Lecture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Lecture title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Lecture description"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-video-url">Video URL</Label>
              <Input
                id="edit-video-url"
                value={editVideoUrl}
                onChange={(e) => setEditVideoUrl(e.target.value)}
                placeholder="YouTube or Google Drive link (or paste iframe code)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports YouTube and Google Drive. Vimeo support coming soon.
              </p>
            </div>
            <div>
              <Label htmlFor="edit-duration">Duration (optional)</Label>
              <Input
                id="edit-duration"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                placeholder="e.g., 15:30"
                className="mt-1"
              />
            </div>
            <SectionSelector
              chapterId={chapterId}
              value={editSectionId}
              onChange={setEditSectionId}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLecture(null)} disabled={isEditSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isEditSaving}>
              {isEditSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lecture?</AlertDialogTitle>
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

      {/* Feedback modal */}
      {feedbackItem && moduleId && (
        <ItemFeedbackModal
          isOpen={!!feedbackItem}
          onClose={() => setFeedbackItem(null)}
          itemType="video"
          itemId={feedbackItem.id}
          itemTitle={feedbackItem.title}
          moduleId={moduleId}
          chapterId={chapterId}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lectures?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected lectures. You can restore them later from the deleted items view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
