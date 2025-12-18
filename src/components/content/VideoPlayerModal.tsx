import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X, Play } from 'lucide-react';
import { getVideoInfo } from '@/lib/video';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  title?: string;
}

export default function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoInfo = getVideoInfo(videoUrl);

  // Reset playing state when modal closes or video changes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
    }
  }, [isOpen, videoUrl]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 bg-background border-border overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{title || 'Video Player'}</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
            aria-label="Close video"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Video container with 16:9 aspect ratio */}
          <div className="aspect-video w-full bg-muted">
            {videoInfo.embedUrl ? (
              isPlaying ? (
                <iframe
                  src={videoInfo.embedUrl}
                  title={title || 'Video'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  onClick={handlePlay}
                  className="w-full h-full relative group cursor-pointer focus:outline-none"
                  aria-label="Play video"
                >
                  {/* Thumbnail */}
                  {videoInfo.thumbnailUrl ? (
                    <img
                      src={videoInfo.thumbnailUrl}
                      alt={title || 'Video thumbnail'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">Click to play</span>
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                    <div className="w-20 h-20 rounded-full bg-primary/90 group-hover:bg-primary flex items-center justify-center transition-colors shadow-lg">
                      <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                </button>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <p>Video link is invalid or unsupported</p>
              </div>
            )}
          </div>

          {/* Title bar */}
          {title && (
            <div className="p-4 border-t border-border">
              <h3 className="font-medium text-foreground">{title}</h3>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
