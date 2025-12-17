import { VideoLesson } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, Clock } from 'lucide-react';

interface VideoListProps {
  videos: VideoLesson[];
}

export default function VideoList({ videos }: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No videos available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <Card key={video.id} className="overflow-hidden">
          <div className="aspect-video bg-muted">
            <iframe
              src={video.videoUrl}
              title={video.title}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{video.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{video.duration}</span>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{video.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
