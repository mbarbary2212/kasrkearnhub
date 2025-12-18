import { useState } from 'react';
import { Play, Clock, AlertCircle, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getVideoInfo, isValidVideoUrl } from '@/lib/video';
import VideoPlayerModal from './VideoPlayerModal';
import ContentItemActions from '@/components/admin/ContentItemActions';

interface VideoCardProps {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string | null;
  duration?: string | null;
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function VideoCard({ 
  id, 
  title, 
  description, 
  videoUrl, 
  duration,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: VideoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const videoInfo = getVideoInfo(videoUrl);
  const isValid = isValidVideoUrl(videoUrl);

  const handleClick = () => {
    if (isValid) {
      setIsModalOpen(true);
    }
  };

  const handleThumbnailError = () => {
    setThumbnailError(true);
  };

  // Show thumbnail if available and no error, otherwise show placeholder
  const showThumbnail = videoInfo.thumbnailUrl && !thumbnailError;

  const showActions = moduleId && (canEdit || canDelete || showFeedback);

  return (
    <>
      <Card 
        className={`overflow-hidden transition-shadow ${isValid ? 'cursor-pointer hover:shadow-lg' : ''}`}
        onClick={handleClick}
      >
        {/* Thumbnail with play overlay */}
        <div className="relative aspect-video bg-muted">
          {isValid ? (
            <>
              {showThumbnail ? (
                <img
                  src={videoInfo.thumbnailUrl!}
                  alt={title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={handleThumbnailError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Video className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
                {/* Play button overlay */}
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg">
                  <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
              {/* Source badge */}
              {videoInfo.source === 'googledrive' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-background/80 rounded text-xs text-muted-foreground">
                  Google Drive
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Video link is invalid or unsupported</p>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium line-clamp-2 flex-1">{title}</CardTitle>
            {showActions && (
              <ContentItemActions
                id={id}
                title={title}
                description={description}
                videoUrl={videoUrl}
                contentType="lecture"
                moduleId={moduleId!}
                chapterId={chapterId}
                canEdit={canEdit}
                canDelete={canDelete}
                showFeedback={showFeedback}
              />
            )}
          </div>
          {duration && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{duration}</span>
            </div>
          )}
        </CardHeader>

        {description && (
          <CardContent className="pt-0">
            <CardDescription className="line-clamp-2">{description}</CardDescription>
          </CardContent>
        )}
      </Card>

      <VideoPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoUrl={videoUrl}
        title={title}
      />
    </>
  );
}
