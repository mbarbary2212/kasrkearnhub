import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X, Play, AlertCircle } from 'lucide-react';
import { getVideoInfo, normalizeVideoInput } from '@/lib/video';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  title?: string;
}

export default function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  
  // Normalize the video URL to handle iframe embed codes
  const normalizedUrl = normalizeVideoInput(videoUrl);
  const videoInfo = getVideoInfo(normalizedUrl);
  
  // Check if this is a Vimeo URL (unsupported for now)
  const isVimeo = isVimeoUrl(normalizedUrl);

  // Reset states when modal closes or video changes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setIsPlayerReady(false);
      setPlayerKey(0);
    }
  }, [isOpen, videoUrl]);

  const handlePlay = () => {
    setIsPlaying(true);
    setIsPlayerReady(false);
  };

  const handlePlayerReady = useCallback(() => {
    setIsPlayerReady(true);
  }, []);

  // Build external URL for "Open in new tab"
  const getExternalUrl = () => {
    if (videoInfo.source === 'youtube' && videoInfo.id) {
      return `https://www.youtube.com/watch?v=${videoInfo.id}`;
    }
    return normalizedUrl || undefined;
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
          <div className="w-full bg-muted">
            {/* Vimeo - show unsupported message */}
            {isVimeo ? (
              <div className="w-full aspect-video flex items-center justify-center">
                <div className="text-center space-y-4 p-6 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
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
            ) : videoInfo.embedUrl ? (
              isPlaying ? (
                <IframePlayer
                  key={playerKey}
                  embedUrl={videoInfo.embedUrl}
                  title={title}
                  onReady={handlePlayerReady}
                />
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
              <div className="w-full aspect-video flex items-center justify-center">
                <div className="text-center space-y-4 p-6 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
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

/**
 * Iframe player wrapper with load detection
 */
interface IframePlayerProps {
  embedUrl: string;
  title?: string;
  onReady?: () => void;
}

function IframePlayer({ embedUrl, title, onReady }: IframePlayerProps) {
  const handleLoad = useCallback(() => {
    // Delay slightly to ensure iframe content is actually ready
    setTimeout(() => {
      onReady?.();
    }, 500);
  }, [onReady]);

  return (
    <div className="aspect-video w-full">
      <iframe
        src={`${embedUrl}?autoplay=1&rel=0&modestbranding=1`}
        title={title || 'Video'}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={handleLoad}
      />
    </div>
  );
}
