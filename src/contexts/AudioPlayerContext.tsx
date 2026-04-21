import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

interface AudioResource {
  id: string;
  title: string;
  moduleId?: string;
  chapterId?: string;
  sectionId?: string;
}

interface AudioPlayerContextType {
  // Current audio state
  currentAudio: AudioResource | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  signedUrl: string | null;
  isLoading: boolean;
  playbackRate: number;
  volume: number;
  
  // Audio element ref
  audioRef: React.RefObject<HTMLAudioElement>;
  
  // Controls
  playAudio: (resource: AudioResource) => Promise<void>;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  
  // Mini-player visibility
  isMiniPlayerVisible: boolean;
  closeMiniPlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentAudio, setCurrentAudio] = useState<AudioResource | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch signed URL from edge function
  const fetchSignedUrl = useCallback(async (resourceId: string): Promise<string | null> => {
    try {
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session for audio URL fetch');
        return null;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-audio-signed-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ resource_id: resourceId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching signed URL:', error);
        return null;
      }

      const { signedUrl } = await response.json();
      return signedUrl;
    } catch (error) {
      console.error('Error fetching audio signed URL:', error);
      return null;
    }
  }, []);

  const playAudio = useCallback(async (resource: AudioResource) => {
    setIsLoading(true);
    setCurrentAudio(resource);
    setIsMiniPlayerVisible(true);

    try {
      const url = await fetchSignedUrl(resource.id);
      if (!url) {
        throw new Error('Failed to get audio URL');
      }

      setSignedUrl(url);
      
      // Audio element will auto-play when src is set via useEffect
    } catch (error) {
      console.error('Error playing audio:', error);
      setCurrentAudio(null);
      setIsMiniPlayerVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSignedUrl]);

  // Handle audio element source changes
  useEffect(() => {
    if (signedUrl && audioRef.current) {
      audioRef.current.src = signedUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(console.error);
    }
  }, [signedUrl]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentAudio(null);
    setSignedUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMiniPlayerVisible(false);
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  const closeMiniPlayer = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  // Handle audio element events
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    // Don't close mini player - let user replay or close manually
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentAudio,
        isPlaying,
        currentTime,
        duration,
        signedUrl,
        isLoading,
        playbackRate,
        volume,
        audioRef,
        playAudio,
        pauseAudio,
        resumeAudio,
        stopAudio,
        seekTo,
        setPlaybackRate,
        setVolume,
        isMiniPlayerVisible,
        closeMiniPlayer,
      }}
    >
      {children}
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        preload="metadata"
      />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
