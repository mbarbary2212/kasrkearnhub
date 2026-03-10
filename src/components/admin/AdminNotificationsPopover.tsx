import { useState } from 'react';
import { Bell, CheckCheck, Clock, Megaphone, X, Activity, MessageCircle, HelpCircle, AlertTriangle, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useAdminNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useClearOldNotifications,
  groupNotifications,
  type AdminNotification,
  type GroupedNotification,
} from '@/hooks/useAdminNotifications';

interface AdminNotificationsPopoverProps {
  onNavigateToAnnouncement?: (announcementId: string) => void;
}

export function AdminNotificationsPopover({ onNavigateToAnnouncement }: AdminNotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useAdminNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const clearOld = useClearOldNotifications();

  const grouped = notifications ? groupNotifications(notifications) : [];

  const handleGroupClick = (group: GroupedNotification) => {
    // Mark all unread in group as read
    group.notifications.forEach(n => {
      if (!n.is_read) markRead.mutate(n.id);
    });

    const notification = group.latest;
    navigateForType(notification);
  };

  const navigateForType = (notification: AdminNotification) => {
    switch (notification.type) {
      case 'new_access_request':
        navigate('/admin?tab=accounts');
        setOpen(false);
        break;
      case 'content_activity':
        navigate('/admin?tab=activity-log');
        setOpen(false);
        break;
      case 'new_inquiry':
      case 'inquiry_reply':
        navigate('/admin?tab=inbox');
        setOpen(false);
        break;
      case 'new_feedback':
      case 'feedback_reply':
        navigate('/admin?tab=inbox');
        setOpen(false);
        break;
      case 'ticket_assigned':
        navigate('/admin?tab=inbox');
        setOpen(false);
        break;
      case 'role_changed':
      case 'module_assigned':
      case 'topic_assigned':
        navigate('/dashboard');
        setOpen(false);
        break;
      case 'announcement_pending_approval':
      case 'announcement_approved':
      case 'announcement_rejected':
        if (notification.entity_type === 'announcement' && notification.entity_id && onNavigateToAnnouncement) {
          onNavigateToAnnouncement(notification.entity_id);
        }
        setOpen(false);
        break;
      case 'avatar_request':
      case 'voice_request':
        navigate('/admin?tab=platform-settings');
        setOpen(false);
        break;
      default:
        setOpen(false);
    }
  };

  const handleClearOld = () => {
    clearOld.mutate(undefined, {
      onSuccess: () => toast.success('Old read notifications cleared'),
      onError: () => toast.error('Failed to clear old notifications'),
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_access_request':
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case 'announcement_pending_approval':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'announcement_approved':
        return <CheckCheck className="w-4 h-4 text-green-500" />;
      case 'announcement_rejected':
        return <X className="w-4 h-4 text-destructive" />;
      case 'content_activity':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'new_inquiry':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case 'new_feedback':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'inquiry_reply':
      case 'feedback_reply':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'ticket_assigned':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'role_changed':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'module_assigned':
      case 'topic_assigned':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'avatar_request':
      case 'voice_request':
        return <Megaphone className="w-4 h-4 text-amber-500" />;
      default:
        return <Megaphone className="w-4 h-4" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-muted/30';
    switch (type) {
      case 'new_access_request':
        return 'bg-emerald-500/10 border-l-2 border-emerald-500';
      case 'announcement_pending_approval':
        return 'bg-warning/10 border-l-2 border-warning';
      case 'announcement_approved':
        return 'bg-green-500/10 border-l-2 border-green-500';
      case 'announcement_rejected':
        return 'bg-destructive/10 border-l-2 border-destructive';
      case 'content_activity':
        return 'bg-blue-500/10 border-l-2 border-blue-500';
      case 'new_inquiry':
        return 'bg-purple-500/10 border-l-2 border-purple-500';
      case 'new_feedback':
        return 'bg-orange-500/10 border-l-2 border-orange-500';
      case 'inquiry_reply':
      case 'feedback_reply':
        return 'bg-blue-500/10 border-l-2 border-blue-500';
      case 'ticket_assigned':
        return 'bg-green-500/10 border-l-2 border-green-500';
      case 'role_changed':
        return 'bg-blue-500/10 border-l-2 border-blue-500';
      case 'module_assigned':
      case 'topic_assigned':
        return 'bg-purple-500/10 border-l-2 border-purple-500';
      case 'avatar_request':
      case 'voice_request':
        return 'bg-amber-500/10 border-l-2 border-amber-500';
      default:
        return 'bg-primary/10 border-l-2 border-primary';
    }
  };

  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {hasUnread && (
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={handleClearOld}
              disabled={clearOld.isPending}
              title="Clear read notifications older than 7 days"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear old
            </Button>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : grouped.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : !hasUnread ? (
            <div>
              <div className="px-4 py-2 text-center">
                <p className="text-sm text-muted-foreground">✓ All caught up</p>
              </div>
              <div className="divide-y">
                {grouped.map((group, idx) => (
                  <GroupedNotificationItem
                    key={`${group.latest.id}-${idx}`}
                    group={group}
                    onClick={() => handleGroupClick(group)}
                    getIcon={getNotificationIcon}
                    getBg={getNotificationBg}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {grouped.map((group, idx) => (
                <GroupedNotificationItem
                  key={`${group.latest.id}-${idx}`}
                  group={group}
                  onClick={() => handleGroupClick(group)}
                  getIcon={getNotificationIcon}
                  getBg={getNotificationBg}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function GroupedNotificationItem({
  group,
  onClick,
  getIcon,
  getBg,
}: {
  group: GroupedNotification;
  onClick: () => void;
  getIcon: (type: string) => React.ReactNode;
  getBg: (type: string, isRead: boolean) => string;
}) {
  const { latest, count } = group;
  const allRead = group.notifications.every(n => n.is_read);

  return (
    <button
      className={cn(
        'w-full text-left p-4 hover:bg-muted/50 transition-colors',
        getBg(latest.type, allRead)
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon(latest.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('text-sm', !allRead && 'font-medium')}>
              {latest.title}
            </p>
            {count > 1 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                ×{count}
              </Badge>
            )}
            {!allRead && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {latest.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
