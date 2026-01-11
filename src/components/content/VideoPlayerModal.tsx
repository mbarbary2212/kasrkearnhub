import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X, Play } from 'lucide-react';
import { getVideoInfo, normalizeVideoInput, extractVimeoIdAndHash } from '@/lib/video';
import { VimeoPlayer } from '@/components/video/VimeoPlayer';
import { VideoLoadWatchdog } from '@/components/video/VideoLoadWatchdog';

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
  const [hasVideoError, setHasVideoError] = useState(false);
  
  // Normalize the video URL to handle iframe embed codes
  const normalizedUrl = normalizeVideoInput(videoUrl);
  const videoInfo = getVideoInfo(normalizedUrl);
  
  // Extract Vimeo info with privacy hash
  const vimeoInfo = extractVimeoIdAndHash(normalizedUrl);

  // Reset states when modal closes or video changes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setIsPlayerReady(false);
      setPlayerKey(0);
      setHasVideoError(false);
    }
  }, [isOpen, videoUrl]);

  const handlePlay = () => {
    setIsPlaying(true);
    setIsPlayerReady(false);
  };

  const handlePlayerReady = useCallback(() => {
    setIsPlayerReady(true);
  }, []);

  // Retry handler - force remount player with new key
  const handleRetry = useCallback(() => {
    setPlayerKey((k) => k + 1);
    setIsPlayerReady(false);
    setHasVideoError(false);
  }, []);

  // Check if this is a Vimeo video
  const isVimeo = vimeoInfo?.id && videoInfo.source === 'vimeo';
  
  // Build external URL for "Open in new tab" - include privacy hash if present
  const getExternalUrl = () => {
    if (isVimeo && vimeoInfo) {
      const baseUrl = `https://vimeo.com/${vimeoInfo.id}`;
      return vimeoInfo.hash ? `${baseUrl}/${vimeoInfo.hash}` : baseUrl;
    }
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
            {videoInfo.embedUrl ? (
              isPlaying ? (
                <VideoLoadWatchdog
                  videoKey={`${videoInfo.id}-${playerKey}`}
                  isReady={isPlayerReady}
                  timeoutMs={5000}
                  hasError={hasVideoError}
                  onRetry={handleRetry}
                >
                  {isVimeo && vimeoInfo ? (
                    <VimeoPlayer
                      key={playerKey}
                      videoId={vimeoInfo.id}
                      privacyHash={vimeoInfo.hash}
                      autoplay={true}
                      onReady={handlePlayerReady}
                      onLoadError={() => setHasVideoError(true)}
                    />
                  ) : (
                    <IframePlayer
                      key={playerKey}
                      embedUrl={videoInfo.embedUrl}
                      title={title}
                      onReady={handlePlayerReady}
                    />
                  )}
                </VideoLoadWatchdog>
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
