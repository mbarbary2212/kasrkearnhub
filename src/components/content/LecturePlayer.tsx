import { useState, useEffect } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVideoInfo } from '@/lib/video';

interface Lecture {
  id: string;
  title: string;
  video_url?: string | null;
  videoUrl?: string | null;
}

interface LecturePlayerProps {
  lecture: Lecture;
  onBack: () => void;
}

export function LecturePlayer({ lecture, onBack }: LecturePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = lecture.video_url || lecture.videoUrl || null;
  const videoInfo = getVideoInfo(videoUrl);

  // Auto-play when opened
  useEffect(() => {
    setIsPlaying(false);
  }, [lecture.id]);

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to lectures
      </Button>

      <h2 className="text-lg font-semibold">{lecture.title}</h2>

      <div className="w-full aspect-video rounded-xl overflow-hidden border bg-muted">
        {videoInfo.embedUrl ? (
          isPlaying ? (
            <iframe
              src={videoInfo.embedUrl}
              title={lecture.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className="w-full h-full relative group cursor-pointer focus:outline-none"
              aria-label="Play video"
            >
              {videoInfo.thumbnailUrl ? (
                <img
                  src={videoInfo.thumbnailUrl}
                  alt={lecture.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Click to play</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-primary/90 group-hover:bg-primary flex items-center justify-center transition-all shadow-lg">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
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
    </div>
  );
}
