import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAudioProgress } from '@/hooks/useAudioProgress';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  resourceId: string;
  title: string;
  moduleId?: string;
  chapterId?: string;
  sectionId?: string;
  compact?: boolean;
  onComplete?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  resourceId,
  title,
  moduleId,
  chapterId,
  sectionId,
  compact = false,
  onComplete,
}: AudioPlayerProps) {
  const { 
    currentAudio, 
    isPlaying, 
    currentTime, 
    duration, 
    isLoading,
    playbackRate,
    volume,
    playAudio, 
    pauseAudio, 
    resumeAudio,
    seekTo,
    setPlaybackRate,
    setVolume,
  } = useAudioPlayer();
  
  const { fetchProgress, saveProgress, markComplete, resetPlayCountFlag } = useAudioProgress(resourceId);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const saveIntervalRef = useRef<number | null>(null);
  const isCurrentAudio = currentAudio?.id === resourceId;

  // Fetch initial progress and resume
  useEffect(() => {
    if (isCurrentAudio && duration > 0) {
      fetchProgress().then((progress) => {
        if (progress && progress.last_position_seconds > 0 && !progress.completed) {
          // Resume from last position
          seekTo(progress.last_position_seconds);
        }
      });
    }
  }, [isCurrentAudio, duration, fetchProgress, seekTo]);

  // Save progress periodically while playing
  useEffect(() => {
    if (isCurrentAudio && isPlaying && duration > 0) {
      saveIntervalRef.current = window.setInterval(() => {
        saveProgress(currentTime, duration);
      }, 5000); // Save every 5 seconds
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [isCurrentAudio, isPlaying, currentTime, duration, saveProgress]);

  // Check for completion
  useEffect(() => {
    if (isCurrentAudio && duration > 0) {
      const percent = (currentTime / duration) * 100;
      if (percent >= 90) {
        markComplete(currentTime, duration).then((completed) => {
          if (completed && onComplete) {
            onComplete();
          }
        });
      }
    }
  }, [isCurrentAudio, currentTime, duration, markComplete, onComplete]);

  // Save progress when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (isCurrentAudio && duration > 0) {
        saveProgress(currentTime, duration, true);
      }
    };
  }, [isCurrentAudio, currentTime, duration, saveProgress]);

  const handlePlayPause = useCallback(() => {
    if (isCurrentAudio) {
      if (isPlaying) {
        pauseAudio();
      } else {
        resumeAudio();
      }
    } else {
      resetPlayCountFlag();
      playAudio({ id: resourceId, title, moduleId, chapterId, sectionId });
    }
  }, [isCurrentAudio, isPlaying, pauseAudio, resumeAudio, playAudio, resourceId, title, moduleId, chapterId, sectionId, resetPlayCountFlag]);

  const handleSeek = useCallback((value: number[]) => {
    if (isCurrentAudio) {
      seekTo(value[0]);
    }
  }, [isCurrentAudio, seekTo]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, [setVolume]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolume || 0.5);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, previousVolume, setVolume]);

  const handleRestart = useCallback(() => {
    if (isCurrentAudio) {
      seekTo(0);
    }
  }, [isCurrentAudio, seekTo]);

  const displayCurrentTime = isCurrentAudio ? currentTime : 0;
  const displayDuration = isCurrentAudio ? duration : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePlayPause}
          disabled={isLoading && !isCurrentAudio}
          className="h-8 w-8 p-0"
        >
          {isLoading && !isCurrentAudio ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : isCurrentAudio && isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm truncate flex-1">{title}</h4>
        <span className="text-xs text-muted-foreground ml-2">
          {formatTime(displayCurrentTime)} / {formatTime(displayDuration)}
        </span>
      </div>

      {/* Progress bar */}
      <Slider
        value={[displayCurrentTime]}
        min={0}
        max={displayDuration || 100}
        step={1}
        onValueChange={handleSeek}
        disabled={!isCurrentAudio}
        className="w-full"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            disabled={isLoading && !isCurrentAudio}
            className="h-9 w-9 p-0"
          >
            {isLoading && !isCurrentAudio ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : isCurrentAudio && isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Restart */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRestart}
            disabled={!isCurrentAudio}
            className="h-9 w-9 p-0"
            title="Restart"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="h-9 w-9 p-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>

        {/* Playback speed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-8">
              {playbackRate}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PLAYBACK_RATES.map((rate) => (
              <DropdownMenuItem
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={cn(rate === playbackRate && 'bg-accent')}
              >
                {rate}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
