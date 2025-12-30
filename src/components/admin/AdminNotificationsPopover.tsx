import { useState } from 'react';
import { Bell, CheckCheck, Clock, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  useAdminNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  AdminNotification,
} from '@/hooks/useAdminNotifications';

interface AdminNotificationsPopoverProps {
  onNavigateToAnnouncement?: (announcementId: string) => void;
}

export function AdminNotificationsPopover({ onNavigateToAnnouncement }: AdminNotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data: notifications, isLoading } = useAdminNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    
    // Navigate to related entity if applicable
    if (notification.entity_type === 'announcement' && notification.entity_id && onNavigateToAnnouncement) {
      onNavigateToAnnouncement(notification.entity_id);
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement_pending_approval':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'announcement_approved':
        return <CheckCheck className="w-4 h-4 text-green-500" />;
      case 'announcement_rejected':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <Megaphone className="w-4 h-4" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-muted/30';
    switch (type) {
      case 'announcement_pending_approval':
        return 'bg-warning/10 border-l-2 border-warning';
      case 'announcement_approved':
        return 'bg-green-500/10 border-l-2 border-green-500';
      case 'announcement_rejected':
        return 'bg-destructive/10 border-l-2 border-destructive';
      default:
        return 'bg-primary/10 border-l-2 border-primary';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {(unreadCount ?? 0) > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount && unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {(unreadCount ?? 0) > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                    getNotificationBg(notification.type, notification.is_read)
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm',
                        !notification.is_read && 'font-medium'
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
