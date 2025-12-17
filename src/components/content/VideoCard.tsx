import { useState } from 'react';
import { Play, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { extractYouTubeId, getYouTubeThumbnail, isValidYouTubeUrl } from '@/lib/youtube';
import VideoPlayerModal from './VideoPlayerModal';

interface VideoCardProps {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string | null;
  duration?: string | null;
}

export default function VideoCard({ id, title, description, videoUrl, duration }: VideoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const videoId = extractYouTubeId(videoUrl);
  const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'hq') : null;
  const isValid = isValidYouTubeUrl(videoUrl);

  const handleClick = () => {
    if (isValid) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <Card 
        className={`overflow-hidden transition-shadow ${isValid ? 'cursor-pointer hover:shadow-lg' : ''}`}
        onClick={handleClick}
      >
        {/* Thumbnail with play overlay */}
        <div className="relative aspect-video bg-muted">
          {thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
                {/* Play button overlay */}
                <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg">
                  <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">Video link is invalid or unsupported</p>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium line-clamp-2">{title}</CardTitle>
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
