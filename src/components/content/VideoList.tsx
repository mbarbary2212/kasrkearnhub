import { PlayCircle } from 'lucide-react';
import VideoCard from './VideoCard';
import { useVideoDelete } from '@/hooks/useVideoDelete';
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

interface Video {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  duration?: string | null;
}

interface VideoListProps {
  videos: Video[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function VideoList({ 
  videos, 
  moduleId, 
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: VideoListProps) {
  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useVideoDelete(
    moduleId || '', 
    chapterId
  );

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No videos available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            id={video.id}
            title={video.title}
            description={video.description}
            videoUrl={video.video_url || video.videoUrl || null}
            duration={video.duration}
            moduleId={moduleId}
            chapterId={chapterId}
            canEdit={canEdit}
            canDelete={canDelete}
            showFeedback={showFeedback}
            onDelete={() => askDelete(video.id, video.title)}
          />
        ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video?</AlertDialogTitle>
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
    </>
  );
}
