import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Lock, Pin, Flag, Edit2, Trash2, MoreVertical, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiscussionThread, DiscussionMessage, useThreadMessages, useDeleteMessage } from "@/hooks/useDiscussions";
import { MessageComposer } from "./MessageComposer";
import { ReportModal } from "./ReportModal";
import { useAuth } from "@/contexts/AuthContext";

interface ThreadViewProps {
  thread: DiscussionThread;
  onBack: () => void;
}

export function ThreadView({ thread, onBack }: ThreadViewProps) {
  const { user, role } = useAuth();
  const { data: messages, isLoading } = useThreadMessages(thread.id);
  const deleteMessage = useDeleteMessage();
  
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<string | null>(null);

  const isAdmin = role === 'super_admin' || role === 'platform_admin' || role === 'admin';

  const renderMessage = (message: DiscussionMessage, depth = 0) => {
    const isOwn = message.user_id === user?.id;
    const isRemoved = message.moderation_status === 'removed';
    const isFlagged = message.moderation_status === 'flagged';

    return (
      <div key={message.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
        <Card className={`mb-3 ${isFlagged && isAdmin ? 'border-yellow-500' : ''}`}>
          <CardContent className="py-3 px-4">
            {isRemoved ? (
              <p className="text-muted-foreground italic text-sm">
                [This message has been removed]
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {message.author?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                    {message.is_edited && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                    {isFlagged && isAdmin && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Flagged
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!thread.is_locked && (
                        <DropdownMenuItem onClick={() => setReplyingTo(message.id)}>
                          Reply
                        </DropdownMenuItem>
                      )}
                      {!isOwn && (
                        <DropdownMenuItem onClick={() => setReportingMessage(message.id)}>
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                      )}
                      {isOwn && (
                        <DropdownMenuItem 
                          onClick={() => deleteMessage.mutate(message.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm whitespace-pre-wrap break-all">{message.content}</p>

                {isFlagged && isAdmin && message.moderation_reason && (
                  <Alert className="mt-2" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {message.moderation_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {replyingTo === message.id && (
          <div className="mb-3 ml-8">
            <MessageComposer
              threadId={thread.id}
              parentId={message.id}
              onSuccess={() => setReplyingTo(null)}
              onCancel={() => setReplyingTo(null)}
              placeholder={`Reply to ${message.author?.full_name || 'Anonymous'}...`}
            />
          </div>
        )}

        {message.replies?.map(reply => renderMessage(reply, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {thread.is_pinned && <Pin className="h-4 w-4 text-primary" />}
            {thread.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            <h2 className="font-semibold text-lg">{thread.title}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Started by {thread.author?.full_name || 'Anonymous'} • {thread.reply_count} replies
          </p>
        </div>
      </div>

      {thread.is_locked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This thread is locked and no longer accepting new replies.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {messages?.map(message => renderMessage(message))}
        </div>
      )}

      {!thread.is_locked && !replyingTo && (
        <MessageComposer
          threadId={thread.id}
          placeholder="Write a reply..."
        />
      )}

      <ReportModal
        messageId={reportingMessage}
        onClose={() => setReportingMessage(null)}
      />
    </div>
  );
}
