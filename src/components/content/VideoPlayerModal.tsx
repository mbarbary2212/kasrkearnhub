import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X, Play } from 'lucide-react';
import { getVideoInfo, normalizeVideoInput } from '@/lib/video';
import { VimeoPlayer } from '@/components/video/VimeoPlayer';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  title?: string;
}

export default function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  // Normalize the video URL to handle iframe embed codes
  const normalizedUrl = normalizeVideoInput(videoUrl);
  const videoInfo = getVideoInfo(normalizedUrl);

  // Reset playing state when modal closes or video changes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
    }
  }, [isOpen, videoUrl]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  // Check if this is a Vimeo video
  const isVimeo = videoInfo.source === 'vimeo' && videoInfo.id;

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
          <div className="w-full bg-muted">
            {videoInfo.embedUrl ? (
              isPlaying ? (
                isVimeo ? (
                  <VimeoPlayer
                    videoId={videoInfo.id!}
                    autoplay={true}
                  />
                ) : (
                <div className="aspect-video w-full">
                    <iframe
                      src={`${videoInfo.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
                      title={title || 'Video'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                )
              ) : (
                <button
                  onClick={handlePlay}
                  className="w-full aspect-video relative group cursor-pointer focus:outline-none"
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
              <div className="w-full aspect-video flex items-center justify-center text-muted-foreground">
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
