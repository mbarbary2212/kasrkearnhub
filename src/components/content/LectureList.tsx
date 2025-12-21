import { useState } from 'react';
import { Play, Clock, Video, ChevronRight, Settings2, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getVideoInfo, isValidVideoUrl } from '@/lib/video';
import { LecturePlayer } from './LecturePlayer';
import { useVideoDelete } from '@/hooks/useVideoDelete';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
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

export function LectureList({
  lectures,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: LectureListProps) {
  const [openLecture, setOpenLecture] = useState<Lecture | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<Lecture | null>(null);
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useVideoDelete(
    moduleId || '',
    chapterId
  );

  const canManage = canEdit || canDelete;

  if (openLecture) {
    return (
      <LecturePlayer
        lecture={openLecture}
        onBack={() => setOpenLecture(null)}
      />
    );
  }

  if (lectures.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No lectures available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {lectures.map((lecture) => {
          const videoUrl = lecture.video_url || lecture.videoUrl || null;
          const videoInfo = getVideoInfo(videoUrl);
          const isValid = isValidVideoUrl(videoUrl);

          return (
            <button
              key={lecture.id}
              onClick={() => isValid && setOpenLecture(lecture)}
              disabled={!isValid}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Thumbnail */}
              <div className="w-16 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                {videoInfo.thumbnailUrl ? (
                  <img
                    src={videoInfo.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Video className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{lecture.title}</div>
                {lecture.duration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{lecture.duration}</span>
                  </div>
                )}
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="gap-2">
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
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

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
