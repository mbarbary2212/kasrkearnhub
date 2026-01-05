import { useState } from 'react';
import { Mail, ChevronRight, X, Megaphone, MessageCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentAnnouncements, useMarkAnnouncementRead } from '@/hooks/useAnnouncements';
import { useMyInquiries } from '@/hooks/useInquiries';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessagesCardProps {
  moduleId: string;
  yearId?: string;
}

export function MessagesCard({ moduleId, yearId }: MessagesCardProps) {
  const [open, setOpen] = useState(false);
  const { data: announcements = [] } = useStudentAnnouncements(moduleId, yearId);
  const { data: inquiries = [] } = useMyInquiries();
  const markAsRead = useMarkAnnouncementRead();

  // Filter inquiries for this module that have admin replies
  const moduleInquiries = inquiries.filter(
    i => i.module_id === moduleId && i.admin_notes
  );

  // Count unread items
  const unreadAnnouncements = announcements.filter(a => !a.isRead).length;
  const unreadReplies = moduleInquiries.filter(i => i.status === 'resolved').length; // TODO: track read state for replies
  const totalUnread = unreadAnnouncements + unreadReplies;

  const handleMarkRead = async (announcementId: string) => {
    await markAsRead.mutateAsync(announcementId);
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
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2 relative">
            <Mail className="w-6 h-6 text-blue-600" />
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
            View announcements and replies to your questions
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="announcements" className="relative">
                Announcements
                {unreadAnnouncements > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs px-1.5">
                    {unreadAnnouncements}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="replies" className="relative">
                Replies
                {unreadReplies > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs px-1.5">
                    {unreadReplies}
                  </Badge>
                )}
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
                        onMarkRead={handleMarkRead}
                        getPriorityStyles={getPriorityStyles}
                        getPriorityIcon={getPriorityIcon}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="replies" className="mt-4">
              <ScrollArea className="h-[50vh]">
                {moduleInquiries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No replies to your questions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {moduleInquiries.map((inquiry) => (
                      <ReplyItem key={inquiry.id} inquiry={inquiry} />
                    ))}
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
                  onClick={() => setExpanded(!expanded)}
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
                  onClick={() => onMarkRead(announcement.id)}
                >
                  <X className="w-3 h-3 mr-1" /> Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReplyItemProps {
  inquiry: {
    id: string;
    subject: string;
    message: string;
    admin_notes: string | null;
    status: string;
    created_at: string;
    resolved_at: string | null;
  };
}

function ReplyItem({ inquiry }: ReplyItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-start gap-2">
        <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{inquiry.subject}</h4>
          
          {/* Original question */}
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            <span className="font-medium">Your question:</span>
            <p className={cn('mt-1', !expanded && 'line-clamp-2')}>{inquiry.message}</p>
          </div>

          {/* Admin reply */}
          {inquiry.admin_notes && (
            <div className="mt-2 p-2 bg-primary/5 rounded text-sm border-l-2 border-primary">
              <span className="text-xs font-medium text-primary">Reply:</span>
              <p className={cn('mt-1', !expanded && 'line-clamp-3')}>{inquiry.admin_notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {inquiry.resolved_at 
                ? `Replied ${format(new Date(inquiry.resolved_at), 'MMM d, yyyy')}`
                : format(new Date(inquiry.created_at), 'MMM d, yyyy')
              }
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
