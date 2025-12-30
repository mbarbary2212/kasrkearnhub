import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, X, Megaphone, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface AnnouncementSummary {
  id: string;
  title: string;
  priority: 'normal' | 'important' | 'urgent';
  target_type: 'all' | 'module' | 'year';
  module_id: string | null;
  year_id: string | null;
  module_name?: string | null;
  year_name?: string | null;
  year_number?: number | null;
}

// Hook to fetch all unread announcements for the logged-in user
function useHomeAnnouncements() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['home-announcements', user?.id],
    queryFn: async () => {
      // Fetch all active announcements with module and year info
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          priority,
          target_type,
          module_id,
          year_id,
          modules(name),
          years(name, number)
        `)
        .eq('is_active', true)
        .eq('pending_approval', false)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch read status
      const announcementIds = (announcements || []).map(a => a.id);
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user?.id || '')
        .in('announcement_id', announcementIds);

      const readIds = new Set((reads || []).map(r => r.announcement_id));

      // Filter out read announcements and transform
      const unread = (announcements || [])
        .filter(a => !readIds.has(a.id))
        .map(a => ({
          id: a.id,
          title: a.title,
          priority: a.priority as 'normal' | 'important' | 'urgent',
          target_type: a.target_type as 'all' | 'module' | 'year',
          module_id: a.module_id,
          year_id: a.year_id,
          module_name: a.modules?.name || null,
          year_name: a.years?.name || null,
          year_number: a.years?.number || null,
        }));

      return unread as AnnouncementSummary[];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function HomeAnnouncementAlert() {
  const navigate = useNavigate();
  const { isPlatformAdmin, isSuperAdmin, isModuleAdmin } = useAuthContext();
  const { data: announcements, isLoading } = useHomeAnnouncements();
  const [dismissed, setDismissed] = useState(false);

  // Hide for admin users - they see announcements in the admin panel
  const isAdmin = isPlatformAdmin || isSuperAdmin || isModuleAdmin;

  if (isAdmin || isLoading || dismissed || !announcements || announcements.length === 0) {
    return null;
  }

  // Group announcements by target
  const globalAnnouncements = announcements.filter(a => a.target_type === 'all');
  const yearAnnouncements = announcements.filter(a => a.target_type === 'year');
  const moduleAnnouncements = announcements.filter(a => a.target_type === 'module');

  // Get unique years and modules with announcements
  const yearsWithAnnouncements = [...new Map(
    yearAnnouncements.map(a => [a.year_id, { id: a.year_id, name: a.year_name, number: a.year_number }])
  ).values()];

  const modulesWithAnnouncements = [...new Map(
    moduleAnnouncements.map(a => [a.module_id, { id: a.module_id, name: a.module_name }])
  ).values()];

  // Check for urgent/important announcements
  const hasUrgent = announcements.some(a => a.priority === 'urgent');
  const hasImportant = announcements.some(a => a.priority === 'important');

  const getPriorityStyles = () => {
    if (hasUrgent) return 'border-destructive/50 bg-destructive/5';
    if (hasImportant) return 'border-warning/50 bg-warning/5';
    return 'border-primary/30 bg-primary/5';
  };

  const getIcon = () => {
    if (hasUrgent) return <AlertCircle className="w-5 h-5 text-destructive" />;
    if (hasImportant) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <Megaphone className="w-5 h-5 text-primary" />;
  };

  return (
    <Card className={cn('relative border-2 overflow-hidden', getPriorityStyles())}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100 z-10"
        onClick={() => setDismissed(true)}
      >
        <X className="w-4 h-4" />
      </Button>
      
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                You have {announcements.length} new announcement{announcements.length > 1 ? 's' : ''}
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              {/* Global announcements */}
              {globalAnnouncements.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">All Students</Badge>
                  <span>{globalAnnouncements.length} announcement{globalAnnouncements.length > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Year-specific announcements */}
              {yearsWithAnnouncements.map(year => {
                const count = yearAnnouncements.filter(a => a.year_id === year.id).length;
                return (
                  <div 
                    key={year.id} 
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/50 cursor-pointer hover:bg-background/80 transition-colors group"
                    onClick={() => navigate(`/year/${year.number}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Year {year.number}</Badge>
                      <span className="text-muted-foreground">{count} announcement{count > 1 ? 's' : ''} in {year.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                );
              })}

              {/* Module-specific announcements */}
              {modulesWithAnnouncements.map(module => {
                const count = moduleAnnouncements.filter(a => a.module_id === module.id).length;
                return (
                  <div 
                    key={module.id} 
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/50 cursor-pointer hover:bg-background/80 transition-colors group"
                    onClick={() => navigate(`/module/${module.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Module</Badge>
                      <span className="text-muted-foreground">{count} announcement{count > 1 ? 's' : ''} in {module.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Click on a year or module above to view the full announcement.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
