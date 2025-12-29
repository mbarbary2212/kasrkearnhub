import { useState } from 'react';
import { Clock, Video, Settings2, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { getVideoInfo, isValidVideoUrl, normalizeVideoInput } from '@/lib/video';
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

interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  duration?: string | null;
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
    // Vimeo - handle both regular and player URLs
    if (url.includes("vimeo.com/") || url.includes("player.vimeo.com/")) {
      const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1`;
      }
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
  const [isEditSaving, setIsEditSaving] = useState(false);

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
  const embedUrl = buildAutoplayUrl(videoUrl);

  return (
    <>
      <div className="space-y-2">
        {lectures.map((lecture) => {
          const lectureVideoUrl = lecture.video_url || lecture.videoUrl || null;
          const videoInfo = getVideoInfo(lectureVideoUrl);
          const isValid = isValidVideoUrl(lectureVideoUrl);

          return (
            <button
              key={lecture.id}
              onClick={() => isValid && setSelectedLecture(lecture)}
              disabled={!isValid}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Thumbnail */}
              <div className="w-20 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center relative">
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
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
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
              </div>

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
            </button>
          );
        })}
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!selectedLecture} onOpenChange={(open) => !open && setSelectedLecture(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="pr-8">{selectedLecture?.title}</DialogTitle>
          </DialogHeader>
          <div className="w-full aspect-video bg-black">
            {embedUrl && (
              <iframe
                src={embedUrl}
                title={selectedLecture?.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
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
                placeholder="YouTube, Vimeo, or Google Drive link (or paste iframe code)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports YouTube, Vimeo, and Google Drive. You can paste iframe embed codes too.
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
    </>
  );
}
