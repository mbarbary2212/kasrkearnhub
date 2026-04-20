import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Lock, Plus, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscussionThread } from "@/hooks/useDiscussions";
import { CreateThreadModal } from "./CreateThreadModal";

interface ThreadListProps {
  threads: DiscussionThread[] | undefined;
  isLoading: boolean;
  moduleId?: string;
  chapterId?: string;
  isOpenDiscussion?: boolean;
  onSelectThread: (threadId: string) => void;
  selectedThreadId?: string;
}

export function ThreadList({ 
  threads, 
  isLoading, 
  moduleId, 
  chapterId, 
  isOpenDiscussion,
  onSelectThread,
  selectedThreadId 
}: ThreadListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Discussions</h3>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Thread
        </Button>
      </div>

      {threads?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No discussions yet. Start the first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads?.map(thread => (
            <Card 
              key={thread.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedThreadId === thread.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onSelectThread(thread.id)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={thread.author?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {thread.is_pinned && (
                        <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                      {thread.is_locked && (
                        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <h4 className="font-medium truncate">{thread.title}</h4>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{thread.author?.full_name || 'Anonymous'}</span>
                      <span>•</span>
                      {isOpenDiscussion && (
                        <>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {thread.module?.name ?? "General"}
                          </Badge>
                          <span>•</span>
                        </>
                      )}
                      <span>{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(thread.last_activity_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateThreadModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        moduleId={moduleId}
        chapterId={chapterId}
        isOpenDiscussion={isOpenDiscussion}
        onSuccess={(threadId) => {
          setShowCreateModal(false);
          onSelectThread(threadId);
        }}
      />
    </div>
  );
}
