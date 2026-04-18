import { useMemo } from 'react';
import { Clock, Play, Video, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTopicLectures, type TopicLecture } from '@/hooks/useTopicLectures';
import { extractYouTubeId } from '@/lib/video';

interface TopicVideosModalProps {
  topicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlay: (lecture: TopicLecture) => void;
  excludeLectureId?: string;
}

function getYouTubeThumb(lecture: TopicLecture): string | null {
  const id = lecture.youtube_video_id || extractYouTubeId(lecture.video_url || '') || null;
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

export function TopicVideosModal({
  topicId,
  open,
  onOpenChange,
  onPlay,
  excludeLectureId,
}: TopicVideosModalProps) {
  const { data, isLoading } = useTopicLectures(open ? topicId : null);

  // Optionally hide the currently playing lecture from the list
  const filteredGroups = useMemo(() => {
    if (!data) return [];
    if (!excludeLectureId) return data.groups;
    return data.groups
      .map((g) => ({
        ...g,
        lectures: g.lectures.filter((l) => l.id !== excludeLectureId),
      }))
      .filter((g) => g.lectures.length > 0);
  }, [data, excludeLectureId]);

  const totalShown = filteredGroups.reduce((sum, g) => sum + g.lectures.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            All videos: {data?.topicName || 'Loading…'}
          </DialogTitle>
          <DialogDescription>
            {totalShown > 0
              ? `${totalShown} ${totalShown === 1 ? 'video' : 'videos'} from ${filteredGroups.length} ${
                  filteredGroups.length === 1 ? 'doctor' : 'doctors'
                }`
              : 'Other videos on this topic'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-6">
            {isLoading && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Loading videos…
              </div>
            )}

            {!isLoading && totalShown === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No other videos on this topic yet.
              </div>
            )}

            {!isLoading &&
              filteredGroups.map((group) => (
                <div key={group.doctor} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{group.doctor}</h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {group.lectures.length}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {group.lectures.map((lecture) => {
                      const thumb = getYouTubeThumb(lecture);
                      return (
                        <button
                          key={lecture.id}
                          onClick={() => {
                            onPlay(lecture);
                            onOpenChange(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                        >
                          <div className="relative w-24 h-14 shrink-0 rounded-md overflow-hidden bg-muted">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                              <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {lecture.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {lecture.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lecture.duration}
                                </span>
                              )}
                              {lecture.chapter_title && (
                                <span className="truncate">· {lecture.chapter_title}</span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            tabIndex={-1}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
