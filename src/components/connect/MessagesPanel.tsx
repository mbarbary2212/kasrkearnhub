import { useState, useEffect } from 'react';
import { Megaphone, MessageSquare, HelpCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentAnnouncements, useMarkAnnouncementRead } from '@/hooks/useAnnouncements';
import { useMyFeedback } from '@/hooks/useItemFeedback';
import { useMyInquiries } from '@/hooks/useInquiries';
import { useMyThreadReplies, useMarkThreadRepliesRead } from '@/hooks/useAdminReplies';
import { cn } from '@/lib/utils';
import { getInquiryCategoryLabel } from '@/lib/feedbackValidation';
import { format } from 'date-fns';

interface MessagesPanelProps {
  moduleId?: string;
  yearId?: string;
}

export function MessagesPanel({ moduleId = '', yearId }: MessagesPanelProps) {
  const { data: announcements = [] } = useStudentAnnouncements(moduleId, yearId);
  const { data: myFeedback = [] } = useMyFeedback();
  const { data: myInquiries = [] } = useMyInquiries();
  const { data: myReplies = [] } = useMyThreadReplies();
  const markAnnouncementRead = useMarkAnnouncementRead();
  const markRepliesRead = useMarkThreadRepliesRead();

  const moduleFeedback = moduleId ? myFeedback.filter(f => f.module_id === moduleId) : myFeedback;
  const moduleInquiries = moduleId ? myInquiries.filter(i => i.module_id === moduleId) : myInquiries;

  const unreadAnnouncements = announcements.filter(a => !a.isRead).length;

  const repliesByThread = myReplies.reduce((acc, reply) => {
    const key = `${reply.thread_type}:${reply.thread_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(reply);
    return acc;
  }, {} as Record<string, typeof myReplies>);

  const handleMarkAnnouncementRead = async (announcementId: string) => {
    await markAnnouncementRead.mutateAsync(announcementId);
  };

  const handleMarkThreadRepliesRead = async (threadType: 'feedback' | 'inquiry', threadId: string) => {
    await markRepliesRead.mutateAsync({ threadType, threadId });
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-destructive bg-destructive/5';
      case 'important': return 'border-l-warning bg-warning/5';
      default: return 'border-l-primary bg-primary/5';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'important': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <Megaphone className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Tabs defaultValue="announcements" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="announcements" className="relative text-xs">
          Announcements
          {unreadAnnouncements > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 min-w-4 text-[10px] px-1">
              {unreadAnnouncements}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="feedback" className="relative text-xs">
          My Feedback
        </TabsTrigger>
        <TabsTrigger value="inquiries" className="relative text-xs">
          My Questions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="announcements" className="mt-4">
        <ScrollArea className="h-[55vh]">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No announcements</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {announcements.map((announcement) => (
                <AnnouncementItem
                  key={announcement.id}
                  announcement={announcement}
                  onMarkRead={handleMarkAnnouncementRead}
                  getPriorityStyles={getPriorityStyles}
                  getPriorityIcon={getPriorityIcon}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="feedback" className="mt-4">
        <ScrollArea className="h-[55vh]">
          {moduleFeedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No feedback submitted</p>
              <p className="text-xs mt-1">Submit feedback to see it here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {moduleFeedback.map((feedback) => {
                const threadKey = `feedback:${feedback.id}`;
                const threadReplies = repliesByThread[threadKey] || [];
                const hasUnreadReplies = threadReplies.some(r => !r.is_read);
                return (
                  <FeedbackItem
                    key={feedback.id}
                    feedback={feedback}
                    replies={threadReplies}
                    hasUnreadReplies={hasUnreadReplies}
                    onMarkRead={() => handleMarkThreadRepliesRead('feedback', feedback.id)}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="inquiries" className="mt-4">
        <ScrollArea className="h-[55vh]">
          {moduleInquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No questions submitted</p>
              <p className="text-xs mt-1">Ask a question to see it here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {moduleInquiries.map((inquiry) => {
                const threadKey = `inquiry:${inquiry.id}`;
                const threadReplies = repliesByThread[threadKey] || [];
                const hasUnreadReplies = threadReplies.some(r => !r.is_read);
                return (
                  <InquiryItem
                    key={inquiry.id}
                    inquiry={inquiry}
                    replies={threadReplies}
                    hasUnreadReplies={hasUnreadReplies}
                    onMarkRead={() => handleMarkThreadRepliesRead('inquiry', inquiry.id)}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

// ── Sub-components (same as MessagesCard internals) ──

function AnnouncementItem({ announcement, onMarkRead, getPriorityStyles, getPriorityIcon }: {
  announcement: { id: string; title: string; content: string; priority: string; created_at: string; isRead: boolean };
  onMarkRead: (id: string) => void;
  getPriorityStyles: (p: string) => string;
  getPriorityIcon: (p: string) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = announcement.content.length > 150;

  return (
    <div className={cn('border-l-4 rounded-r-lg p-3 transition-all', getPriorityStyles(announcement.priority), !announcement.isRead && 'ring-1 ring-primary/20')}>
      <div className="flex items-start gap-2">
        {getPriorityIcon(announcement.priority)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{announcement.title}</h4>
            {!announcement.isRead && <Badge variant="secondary" className="text-[10px] h-4 px-1">New</Badge>}
          </div>
          <p className={cn('text-sm text-muted-foreground mt-1', !expanded && isLong && 'line-clamp-2')}>{announcement.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
            <div className="flex items-center gap-1">
              {isLong && (
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                  {expanded ? <>Less <ChevronUp className="w-3 h-3 ml-1" /></> : <>More <ChevronDown className="w-3 h-3 ml-1" /></>}
                </Button>
              )}
              {!announcement.isRead && (
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={(e) => { e.stopPropagation(); onMarkRead(announcement.id); }}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackItem({ feedback, replies, hasUnreadReplies, onMarkRead }: {
  feedback: { id: string; category: string; message: string; status: string; created_at: string };
  replies: Array<{ id: string; message: string; is_read: boolean; created_at: string; admin_profile?: { full_name: string | null; email: string } | null }>;
  hasUnreadReplies: boolean;
  onMarkRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (expanded && hasUnreadReplies) onMarkRead(); }, [expanded, hasUnreadReplies, onMarkRead]);

  return (
    <div className={cn('border rounded-lg p-3 bg-card transition-all', hasUnreadReplies && 'ring-1 ring-primary/30')}>
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{feedback.category}</Badge>
            <Badge variant="secondary" className="text-xs">{feedback.status}</Badge>
            {hasUnreadReplies && <Badge variant="default" className="text-[10px] h-4 px-1">New reply</Badge>}
          </div>
          <p className={cn('text-sm mt-2', !expanded && 'line-clamp-2')}>{feedback.message}</p>
          {expanded && replies.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Replies:</p>
              {replies.map((r) => (
                <div key={r.id} className="p-2 bg-primary/5 rounded border-l-2 border-primary">
                  <p className="text-xs font-medium text-primary">{r.admin_profile?.full_name || 'Admin'}</p>
                  <p className="text-sm mt-1">{r.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{format(new Date(feedback.created_at), 'MMM d, yyyy')}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : `Show ${replies.length > 0 ? `${replies.length} replies` : 'more'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InquiryItem({ inquiry, replies, hasUnreadReplies, onMarkRead }: {
  inquiry: { id: string; subject: string; category: string; message: string; status: string; created_at: string };
  replies: Array<{ id: string; message: string; is_read: boolean; created_at: string; admin_profile?: { full_name: string | null; email: string } | null }>;
  hasUnreadReplies: boolean;
  onMarkRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (expanded && hasUnreadReplies) onMarkRead(); }, [expanded, hasUnreadReplies, onMarkRead]);

  return (
    <div className={cn('border rounded-lg p-3 bg-card transition-all', hasUnreadReplies && 'ring-1 ring-primary/30')}>
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{getInquiryCategoryLabel(inquiry.category)}</Badge>
            <Badge variant="secondary" className="text-xs">{inquiry.status}</Badge>
            {hasUnreadReplies && <Badge variant="default" className="text-[10px] h-4 px-1">New reply</Badge>}
          </div>
          <h4 className="font-medium text-sm mt-2">{inquiry.subject}</h4>
          <p className={cn('text-sm text-muted-foreground mt-1', !expanded && 'line-clamp-2')}>{inquiry.message}</p>
          {expanded && replies.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Replies:</p>
              {replies.map((r) => (
                <div key={r.id} className="p-2 bg-primary/5 rounded border-l-2 border-primary">
                  <p className="text-xs font-medium text-primary">{r.admin_profile?.full_name || 'Admin'}</p>
                  <p className="text-sm mt-1">{r.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{format(new Date(inquiry.created_at), 'MMM d, yyyy')}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : `Show ${replies.length > 0 ? `${replies.length} replies` : 'more'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
