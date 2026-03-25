import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Megaphone, Mail, ChevronRight, Play, ArrowRight, GalleryHorizontal, Trophy, Settings } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import MainLayout from '@/components/layout/MainLayout';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadAnnouncementDetails } from '@/hooks/useUnreadAnnouncementDetails';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getLastPath, isValidResumePath, clearLastPath } from '@/hooks/useRouteResume';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { useDueCards } from '@/hooks/useFSRS';
import { useBadgeStats } from '@/hooks/useBadges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModules } from '@/hooks/useModules';
import { useModuleReadinessBatch } from '@/hooks/useModuleReadinessBatch';
import { ModuleReadinessBar } from '@/components/module/ModuleReadinessBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Home() {
  const { user, isLoading: authLoading, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [hasCheckedAutoLogin, setHasCheckedAutoLogin] = useState(false);

  // Handle resume last path (but NO auto-redirect to year page anymore)
  useEffect(() => {
    if (!user || authLoading || hasCheckedAutoLogin) return;

    const skipAutoLogin = sessionStorage.getItem('skipAutoLogin');
    if (skipAutoLogin) {
      sessionStorage.removeItem('skipAutoLogin');
      setHasCheckedAutoLogin(true);
      return;
    }

    const hasVisitedHome = sessionStorage.getItem('kalmhub:hasVisitedHome');
    if (hasVisitedHome) {
      setHasCheckedAutoLogin(true);
      return;
    }
    sessionStorage.setItem('kalmhub:hasVisitedHome', 'true');

    const checkAutoRedirect = async () => {
      try {
        // Only resume last path — no year redirect
        const lastPath = getLastPath();
        if (lastPath && isValidResumePath(lastPath, isAdmin)) {
          clearLastPath();
          navigate(lastPath, { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking auto-redirect:', error);
      } finally {
        setHasCheckedAutoLogin(true);
      }
    };

    checkAutoRedirect();
  }, [user, authLoading, hasCheckedAutoLogin, navigate, isAdmin]);

  if (!user && !authLoading) {
    navigate('/auth', { replace: true });
    return null;
  }

  if (user) {
    if (!hasCheckedAutoLogin) {
      return (
        <MainLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Skeleton className="h-8 w-64 mx-auto mb-4" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        </MainLayout>
      );
    }

    return (
      <MainLayout>
        <LoggedInHome />
      </MainLayout>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-8 w-64" />
    </div>
  );
}

function LoggedInHome() {
  const navigate = useNavigate();
  const { profile, isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: unreadCounts } = useUnreadMessages();
  const { data: unreadAnnouncements } = useUnreadAnnouncementDetails();
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const { data: dueCards } = useDueCards();
  const dueCount = dueCards?.length ?? 0;
  const { earned, total } = useBadgeStats();
  const { data: lastPos } = useLastPosition();

  // Use preferred_year_id from profile, allow switching
  const preferredYearId = profile?.preferred_year_id;
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  useEffect(() => {
    if (preferredYearId && !selectedYearId) {
      setSelectedYearId(preferredYearId);
    } else if (years && years.length > 0 && !selectedYearId) {
      setSelectedYearId(years[0].id);
    }
  }, [preferredYearId, years, selectedYearId]);

  // Fetch modules for selected year
  const { data: modules, isLoading: modulesLoading } = useModules(selectedYearId || undefined);
  const moduleIds = modules?.map(m => m.id) || [];
  const { data: readinessMap } = useModuleReadinessBatch(moduleIds);

  const selectedYear = years?.find(y => y.id === selectedYearId);
  const totalMessages = (unreadCounts?.announcements ?? 0) + (unreadCounts?.replies ?? 0);
  const hasMessages = totalMessages > 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in max-w-3xl mx-auto">
      
      {/* Welcome Section */}
      <section className="text-center py-3 md:py-4">
        <h1 className="text-lg md:text-xl font-heading font-bold mb-1 md:mb-2 inline-flex items-center justify-center gap-2 flex-wrap">
          <span>Welcome back,</span>
          <span className="text-sky-400">{profile?.full_name || 'Student'}</span>
          {hasMessages && (
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                  {(unreadCounts?.announcements ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                      <Megaphone className="w-3.5 h-3.5" />
                      {unreadCounts.announcements}
                    </span>
                  )}
                  {(unreadCounts?.replies ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      <Mail className="w-3.5 h-3.5" />
                      {unreadCounts.replies}
                    </span>
                  )}
                </span>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="w-80 p-0">
                <div className="px-4 py-3 border-b">
                  <h4 className="font-semibold text-sm text-foreground">Unread Messages</h4>
                </div>
                <ScrollArea className="max-h-[300px]">
                  {unreadAnnouncements && unreadAnnouncements.length > 0 ? (
                    <div className="divide-y">
                      {unreadAnnouncements.map((ann) => (
                        <button
                          key={ann.id}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
                          onClick={() => {
                            if (ann.module_id) {
                              navigate(`/module/${ann.module_id}?tab=connect`);
                            }
                          }}
                        >
                          <Megaphone className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-1">{ann.title}</p>
                            {ann.module_name && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {ann.module_name}
                              </p>
                            )}
                            {!ann.module_id && (
                              <p className="text-xs text-muted-foreground mt-0.5">General announcement</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {ann.module_id && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <p className="text-sm">No unread messages</p>
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </h1>
        {selectedYear && (
          <p className="text-sm md:text-base text-muted-foreground">
            {selectedYear.name} — Your learning hub
          </p>
        )}
      </section>

      {/* Continue Where You Left Off — students only */}
      {isStudent && lastPos && lastPos.module_id && (
        <section>
          <div
            className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 cursor-pointer
                       hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 group"
            onClick={() => navigate(buildResumeUrl(lastPos))}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0
                              group-hover:bg-primary/20 transition-colors">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Continue where you left off</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {buildResumeLabel(lastPos)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(lastPos.updated_at), { addSuffix: true })}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
          </div>
        </section>
      )}

      {/* Year Selector */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-semibold">Your Modules</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year:</span>
            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
              <SelectTrigger className="h-8 w-[160px] bg-background text-sm">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years?.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Module Cards */}
        {yearsLoading || modulesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : modules && modules.length > 0 ? (
          <div className="space-y-3">
            {modules.map((mod) => {
              const readiness = readinessMap?.[mod.id] ?? null;
              return (
                <Card
                  key={mod.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                  onClick={() => navigate(`/module/${mod.id}`)}
                >
                  <CardContent className="py-4 px-4 md:px-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary shrink-0" />
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {(mod as any).code ? `${(mod as any).code}: ` : ''}{mod.name}
                          </h3>
                        </div>
                        <ModuleReadinessBar readiness={readiness} />
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No modules available for this year.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Flashcards & Achievements widgets — students only */}
      {isStudent && (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Flashcards Widget */}
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
              onClick={() => navigate('/review/flashcards')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GalleryHorizontal className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Flashcards</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dueCount > 0 ? `${dueCount} card${dueCount === 1 ? '' : 's'} due today` : 'All caught up!'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary font-medium">
                  {dueCount > 0 ? 'Review Now' : 'Browse Cards'} <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* Achievements Widget */}
            <Card className="hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Achievements</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {earned} of {total} badges earned
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (earned / total) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
