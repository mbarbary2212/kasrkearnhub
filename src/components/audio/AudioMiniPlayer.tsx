import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioMiniPlayer() {
  const {
    currentAudio,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMiniPlayerVisible,
    pauseAudio,
    resumeAudio,
    seekTo,
    setVolume,
    closeMiniPlayer,
  } = useAudioPlayer();

  const { saveProgress, markComplete } = useAudioProgress(currentAudio?.id || null);
  const saveIntervalRef = useRef<number | null>(null);

  // Save progress periodically
  useEffect(() => {
    if (currentAudio && isPlaying && duration > 0) {
      saveIntervalRef.current = window.setInterval(() => {
        saveProgress(currentTime, duration);
      }, 5000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [currentAudio, isPlaying, currentTime, duration, saveProgress]);

  // Check completion
  useEffect(() => {
    if (currentAudio && duration > 0) {
      const percent = (currentTime / duration) * 100;
      if (percent >= 90) {
        markComplete(currentTime, duration);
      }
    }
  }, [currentAudio, currentTime, duration, markComplete]);

  // Save on close
  const handleClose = () => {
    if (currentAudio && duration > 0) {
      saveProgress(currentTime, duration, true);
    }
    closeMiniPlayer();
  };

  if (!isMiniPlayerVisible || !currentAudio) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
      {/* Progress bar at top */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <Button
            size="sm"
            variant="ghost"
            onClick={isPlaying ? pauseAudio : resumeAudio}
            className="h-10 w-10 p-0 flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Title and time */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{currentAudio.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>

          {/* Seek slider (visible on larger screens) */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={1}
              onValueChange={(value) => seekTo(value[0])}
              className="w-full"
            />
          </div>

          {/* Volume (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
              className="h-8 w-8 p-0"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => setVolume(value[0])}
              className="w-16"
            />
          </div>

          {/* Close */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
