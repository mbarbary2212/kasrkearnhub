import { useState } from "react";
import { ArrowLeft, Pin, Lock, User, Reply, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  StudyGroupThread,
  StudyGroupMessage,
  useGroupMessages,
  usePostGroupMessage,
} from "@/hooks/useStudyGroups";
import { quickCheck } from "@/lib/profanityFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface GroupThreadViewProps {
  thread: StudyGroupThread;
  onBack: () => void;
  isAdmin: boolean;
}

export function GroupThreadView({ thread, onBack, isAdmin }: GroupThreadViewProps) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [warning, setWarning] = useState("");

  const { data: messages, isLoading } = useGroupMessages(thread.id);
  const { mutate: postMessage, isPending: posting } = usePostGroupMessage();

  const handleContentChange = (value: string) => {
    setReplyContent(value);
    setWarning(quickCheck(value) ? "Your message may contain inappropriate language." : "");
  };

  const handleSubmit = (parentId?: string) => {
    if (!replyContent.trim() || thread.is_locked) return;

    postMessage(
      {
        threadId: thread.id,
        content: replyContent.trim(),
        parentId,
      },
      {
        onSuccess: () => {
          setReplyContent("");
          setReplyingTo(null);
          setWarning("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {thread.title}
            {thread.is_pinned && <Pin className="h-4 w-4 text-primary" />}
            {thread.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </h2>
          <p className="text-sm text-muted-foreground">
            Started by {thread.author?.full_name || 'Unknown'} •{' '}
            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {thread.is_locked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This thread is locked. No new replies can be added.
          </AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              currentUserId={user?.id}
              onReply={() => setReplyingTo(message.id)}
              isLocked={thread.is_locked}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No messages yet
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reply Box */}
      {!thread.is_locked && (
        <Card>
          <CardContent className="pt-4">
            {warning && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            )}

            {replyingTo && (
              <div className="mb-2 flex items-center justify-between bg-accent/50 px-3 py-1.5 rounded text-sm">
                <span>Replying to message...</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => handleContentChange(e.target.value)}
              maxLength={5000}
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {replyContent.length}/5000
              </span>
              <Button
                size="sm"
                onClick={() => handleSubmit(replyingTo || undefined)}
                disabled={!replyContent.trim() || posting}
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Reply className="h-4 w-4 mr-2" />
                )}
                Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MessageItem({
  message,
  currentUserId,
  onReply,
  isLocked,
  depth = 0,
}: {
  message: StudyGroupMessage;
  currentUserId?: string;
  onReply: () => void;
  isLocked: boolean;
  depth?: number;
}) {
  const isOwn = message.user_id === currentUserId;

  return (
    <div className={depth > 0 ? "ml-8 border-l-2 border-border pl-4" : ""}>
      <Card className={isOwn ? "border-primary/20 bg-primary/5" : ""}>
        <CardContent className="py-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.author?.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {message.author?.full_name || 'Unknown'}
                </span>
                {isOwn && (
                  <Badge variant="outline" className="text-xs py-0">You</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                {message.is_edited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap break-all">{message.content}</p>
              {!isLocked && depth === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 -ml-2 h-7 text-xs"
                  onClick={onReply}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested Replies */}
      {message.replies && message.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {message.replies.map((reply) => (
            <MessageItem
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              isLocked={isLocked}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
