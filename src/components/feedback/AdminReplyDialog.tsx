import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useThreadReplies, useSubmitReply, ThreadType, AdminReply } from '@/hooks/useAdminReplies';

interface AdminReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadType: ThreadType;
  threadId: string;
  threadSubject?: string;
  threadMessage: string;
}

export function AdminReplyDialog({ 
  open, 
  onOpenChange, 
  threadType, 
  threadId, 
  threadSubject,
  threadMessage 
}: AdminReplyDialogProps) {
  const [replyMessage, setReplyMessage] = useState('');
  const { data: replies = [], isLoading } = useThreadReplies(threadType, open ? threadId : undefined);
  const submitReply = useSubmitReply();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyMessage.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      await submitReply.mutateAsync({
        threadType,
        threadId,
        message: replyMessage.trim(),
      });

      toast.success('Reply sent successfully');
      setReplyMessage('');
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {threadSubject || (threadType === 'feedback' ? 'Feedback Thread' : 'Inquiry Thread')}
          </DialogTitle>
          <DialogDescription>
            View conversation and send a reply to the student.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Original message */}
          <div className="p-3 rounded-lg bg-muted border mb-4">
            <p className="text-xs text-muted-foreground mb-1">Original message:</p>
            <p className="text-sm">{threadMessage}</p>
          </div>

          {/* Replies */}
          <div className="flex-1 min-h-0 mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Replies ({replies.length})
            </Label>
            <ScrollArea className="h-[200px] border rounded-lg p-3">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading replies...
                </div>
              ) : replies.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No replies yet
                </div>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <ReplyBubble key={reply.id} reply={reply} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Reply form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Your Reply</Label>
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply to the student..."
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitReply.isPending}>
              {submitReply.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Reply
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReplyBubble({ reply }: { reply: AdminReply }) {
  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-primary">
          {reply.admin_profile?.full_name || reply.admin_profile?.email || 'Admin'}
        </span>
        <Badge variant="outline" className="text-[10px] h-4 px-1">Admin</Badge>
        {!reply.is_read && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1">Unread by student</Badge>
        )}
      </div>
      <p className="text-sm">{reply.message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}
