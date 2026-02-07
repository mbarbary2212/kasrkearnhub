import { useState, useEffect } from 'react';
import { Mail, ChevronRight, Megaphone, MessageCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentAnnouncements, useMarkAnnouncementRead } from '@/hooks/useAnnouncements';
import { useMyFeedback } from '@/hooks/useItemFeedback';
import { useMyInquiries } from '@/hooks/useInquiries';
import { useMyThreadReplies, useMarkThreadRepliesRead, useUnreadReplyCount } from '@/hooks/useAdminReplies';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessagesCardProps {
  moduleId: string;
  yearId?: string;
}

export function MessagesCard({ moduleId, yearId }: MessagesCardProps) {
  const [open, setOpen] = useState(false);
  const { data: announcements = [] } = useStudentAnnouncements(moduleId, yearId);
  const { data: myFeedback = [] } = useMyFeedback();
  const { data: myInquiries = [] } = useMyInquiries();
  const { data: myReplies = [] } = useMyThreadReplies();
  const { data: unreadReplyCount = 0 } = useUnreadReplyCount();
  const markAnnouncementRead = useMarkAnnouncementRead();
  const markRepliesRead = useMarkThreadRepliesRead();

  // Filter feedback/inquiries for this module
  const moduleFeedback = myFeedback.filter(f => f.module_id === moduleId);
  const moduleInquiries = myInquiries.filter(i => i.module_id === moduleId);

  // Get unread counts
  const unreadAnnouncements = announcements.filter(a => !a.isRead).length;
  
  // Count unread replies for this module's threads
  const moduleFeedbackIds = new Set(moduleFeedback.map(f => f.id));
  const moduleInquiryIds = new Set(moduleInquiries.map(i => i.id));
  const unreadModuleReplies = myReplies.filter(r => 
    !r.is_read && (
      (r.thread_type === 'feedback' && moduleFeedbackIds.has(r.thread_id)) ||
      (r.thread_type === 'inquiry' && moduleInquiryIds.has(r.thread_id))
    )
  ).length;

  const totalUnread = unreadAnnouncements + unreadModuleReplies;

  // Group replies by thread
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
      case 'urgent':
        return 'border-l-destructive bg-destructive/5';
      case 'important':
        return 'border-l-warning bg-warning/5';
      default:
        return 'border-l-primary bg-primary/5';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'important':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Megaphone className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 relative"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2 relative">
            <Mail className="w-6 h-6 text-primary" />
            {totalUnread > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1.5"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">Messages</CardTitle>
          <CardDescription>
            View announcements and replies to your submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm text-primary font-medium">
            {totalUnread > 0 ? `${totalUnread} new` : 'View messages'} <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Messages
            </DialogTitle>
          </DialogHeader>

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
              <ScrollArea className="h-[50vh]">
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
              <ScrollArea className="h-[50vh]">
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
              <ScrollArea className="h-[50vh]">
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
        </DialogContent>
      </Dialog>
    </>
  );
}

// Announcement Item Component
interface AnnouncementItemProps {
  announcement: {
    id: string;
    title: string;
    content: string;
    priority: string;
    created_at: string;
    isRead: boolean;
  };
  onMarkRead: (id: string) => void;
  getPriorityStyles: (priority: string) => string;
  getPriorityIcon: (priority: string) => React.ReactNode;
}

function AnnouncementItem({ announcement, onMarkRead, getPriorityStyles, getPriorityIcon }: AnnouncementItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongContent = announcement.content.length > 150;

  return (
    <div
      className={cn(
        'border-l-4 rounded-r-lg p-3 transition-all',
        getPriorityStyles(announcement.priority),
        !announcement.isRead && 'ring-1 ring-primary/20'
      )}
    >
      <div className="flex items-start gap-2">
        {getPriorityIcon(announcement.priority)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{announcement.title}</h4>
            {!announcement.isRead && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">New</Badge>
            )}
          </div>
          <p className={cn(
            'text-sm text-muted-foreground mt-1',
            !expanded && isLongContent && 'line-clamp-2'
          )}>
            {announcement.content}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(announcement.created_at), 'MMM d, yyyy')}
            </span>
            <div className="flex items-center gap-1">
              {isLongContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                >
                  {expanded ? (
                    <>Less <ChevronUp className="w-3 h-3 ml-1" /></>
                  ) : (
                    <>More <ChevronDown className="w-3 h-3 ml-1" /></>
                  )}
                </Button>
              )}
              {!announcement.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={(e) => { e.stopPropagation(); onMarkRead(announcement.id); }}
                >
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

// Feedback Item Component
interface FeedbackItemProps {
  feedback: {
    id: string;
    category: string;
    message: string;
    status: string;
    created_at: string;
  };
  replies: Array<{
    id: string;
    message: string;
    is_read: boolean;
    created_at: string;
    admin_profile?: { full_name: string | null; email: string } | null;
  }>;
  hasUnreadReplies: boolean;
  onMarkRead: () => void;
}

function FeedbackItem({ feedback, replies, hasUnreadReplies, onMarkRead }: FeedbackItemProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Mark replies as read when expanded
    if (expanded && hasUnreadReplies) {
      onMarkRead();
    }
  }, [expanded, hasUnreadReplies, onMarkRead]);

  return (
    <div className={cn(
      'border rounded-lg p-3 bg-card transition-all',
      hasUnreadReplies && 'ring-1 ring-primary/30'
    )}>
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{feedback.category}</Badge>
            <Badge variant="secondary" className="text-xs">{feedback.status}</Badge>
            {hasUnreadReplies && (
              <Badge variant="default" className="text-[10px] h-4 px-1">New reply</Badge>
            )}
          </div>
          
          <p className={cn('text-sm mt-2', !expanded && 'line-clamp-2')}>{feedback.message}</p>
          
          {/* Replies */}
          {expanded && replies.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Replies:</p>
              {replies.map((reply) => (
                <div key={reply.id} className="p-2 bg-primary/5 rounded border-l-2 border-primary">
                  <p className="text-xs font-medium text-primary">
                    {reply.admin_profile?.full_name || 'Admin'}
                  </p>
                  <p className="text-sm mt-1">{reply.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(feedback.created_at), 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : `Show ${replies.length > 0 ? `${replies.length} replies` : 'more'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inquiry Item Component
interface InquiryItemProps {
  inquiry: {
    id: string;
    subject: string;
    category: string;
    message: string;
    status: string;
    created_at: string;
  };
  replies: Array<{
    id: string;
    message: string;
    is_read: boolean;
    created_at: string;
    admin_profile?: { full_name: string | null; email: string } | null;
  }>;
  hasUnreadReplies: boolean;
  onMarkRead: () => void;
}

function InquiryItem({ inquiry, replies, hasUnreadReplies, onMarkRead }: InquiryItemProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Mark replies as read when expanded
    if (expanded && hasUnreadReplies) {
      onMarkRead();
    }
  }, [expanded, hasUnreadReplies, onMarkRead]);

  return (
    <div className={cn(
      'border rounded-lg p-3 bg-card transition-all',
      hasUnreadReplies && 'ring-1 ring-primary/30'
    )}>
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{inquiry.category}</Badge>
            <Badge variant="secondary" className="text-xs">{inquiry.status}</Badge>
            {hasUnreadReplies && (
              <Badge variant="default" className="text-[10px] h-4 px-1">New reply</Badge>
            )}
          </div>
          
          <h4 className="font-medium text-sm mt-2">{inquiry.subject}</h4>
          <p className={cn('text-sm text-muted-foreground mt-1', !expanded && 'line-clamp-2')}>{inquiry.message}</p>
          
          {/* Replies */}
          {expanded && replies.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Replies:</p>
              {replies.map((reply) => (
                <div key={reply.id} className="p-2 bg-primary/5 rounded border-l-2 border-primary">
                  <p className="text-xs font-medium text-primary">
                    {reply.admin_profile?.full_name || 'Admin'}
                  </p>
                  <p className="text-sm mt-1">{reply.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : `Show ${replies.length > 0 ? `${replies.length} replies` : 'more'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
