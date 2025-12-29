import { useState } from 'react';
import { X, Megaphone, AlertTriangle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStudentAnnouncements, useMarkAnnouncementRead } from '@/hooks/useAnnouncements';

interface AnnouncementBannerProps {
  moduleId?: string;
  yearId?: string;
  className?: string;
}

export function AnnouncementBanner({ moduleId, yearId, className }: AnnouncementBannerProps) {
  const { data: announcements, isLoading } = useStudentAnnouncements(moduleId, yearId);
  const markAsRead = useMarkAnnouncementRead();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out dismissed and read announcements
  const visibleAnnouncements = (announcements || []).filter(
    a => !dismissedIds.has(a.id) && !a.isRead
  );

  if (isLoading || visibleAnnouncements.length === 0) return null;

  const handleDismiss = async (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    await markAsRead.mutateAsync(id);
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive/10 border-destructive/50 text-destructive';
      case 'important':
        return 'bg-warning/10 border-warning/50 text-warning-foreground';
      default:
        return 'bg-primary/10 border-primary/30 text-primary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'important':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      default:
        return <Megaphone className="w-5 h-5 flex-shrink-0" />;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {visibleAnnouncements.map(announcement => {
        const isExpanded = expandedId === announcement.id;
        const isLongContent = announcement.content.length > 150;

        return (
          <div
            key={announcement.id}
            className={cn(
              'relative rounded-lg border p-3 md:p-4 transition-all',
              getPriorityStyles(announcement.priority)
            )}
          >
            <div className="flex items-start gap-3">
              {getPriorityIcon(announcement.priority)}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base">
                  {announcement.title}
                </h4>
                <p className={cn(
                  'text-sm mt-1 opacity-90',
                  !isExpanded && isLongContent && 'line-clamp-2'
                )}>
                  {announcement.content}
                </p>
                
                {isLongContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs font-medium hover:bg-transparent"
                    onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                      <>Read more <ChevronDown className="w-3 h-3 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-60 hover:opacity-100"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
