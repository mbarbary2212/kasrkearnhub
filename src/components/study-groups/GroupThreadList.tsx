import { MessageSquare, Pin, Lock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StudyGroupThread } from "@/hooks/useStudyGroups";

interface GroupThreadListProps {
  threads: StudyGroupThread[];
  onSelectThread: (thread: StudyGroupThread) => void;
}

export function GroupThreadList({ threads, onSelectThread }: GroupThreadListProps) {
  if (threads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h4 className="font-medium mb-1">No discussions yet</h4>
          <p className="text-sm text-muted-foreground">
            Start a new thread to begin the conversation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <Card
          key={thread.id}
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onSelectThread(thread)}
        >
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarImage src={thread.author?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm line-clamp-1">{thread.title}</h4>
                  {thread.is_pinned && (
                    <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                  {thread.is_locked && (
                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{thread.author?.full_name || 'Unknown'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {thread.reply_count}
                  </span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(thread.last_activity_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
