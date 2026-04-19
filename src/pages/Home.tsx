import { useNavigate } from 'react-router-dom';
import { useSessionFlow, type SessionTask } from '@/contexts/SessionFlowContext';
import { DashboardTodayPlan } from '@/components/dashboard/DashboardTodayPlan';
import { useDailyStudyPlan } from '@/hooks/useDailyStudyPlan';
import { useAuthContext } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Megaphone, Mail, ChevronRight, Play, ArrowRight, GalleryHorizontal, Trophy, LayoutGrid, List, Lock, Stethoscope, FlaskConical, PenLine, Video, BookOpenCheck } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import MainLayout from '@/components/layout/MainLayout';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadAnnouncementDetails } from '@/hooks/useUnreadAnnouncementDetails';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getLastPath, isValidResumePath, clearLastPath } from '@/hooks/useRouteResume';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { useDueCards } from '@/hooks/useFSRS';
import { useDueMCQCount } from '@/hooks/useMCQFSRS';
import { useBadgeStats } from '@/hooks/useBadges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModules } from '@/hooks/useModules';
import { useModuleReadinessBatch } from '@/hooks/useModuleReadinessBatch';
import { ModuleReadinessBar } from '@/components/module/ModuleReadinessBar';
import { useMergedModuleConfig } from '@/hooks/useMergedModuleConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { getModuleImage, getModuleGradient } from '@/lib/moduleImages';
import { cn } from '@/lib/utils';

import { useActiveYear } from '@/contexts/ActiveYearContext';
import { useStudentDashboard, type SuggestedItem } from '@/hooks/useStudentDashboard';
import { getReadinessLabel, getResumeIconName } from '@/lib/readinessLabels';
import { DashboardWeakTopics } from '@/components/dashboard/DashboardWeakTopics';
import { GoalsNudgeBanner } from '@/components/dashboard/GoalsNudgeBanner';
import { useYearClassification } from '@/hooks/useYearClassification';
import { ClassificationDashboard } from '@/components/dashboard/ClassificationDashboard';
import { ModuleCardLeads } from '@/components/content/ModuleCardLeads';

import { useTour } from '@/hooks/useTour';
import { studentTourSteps } from '@/components/tour/studentTourSteps';
import { ContextGuide } from '@/components/guidance/ContextGuide';
import { WorkflowGuide } from '@/components/guidance/WorkflowGuide';
import { FirstLoginModal } from '@/components/guidance/FirstLoginModal';

export default function Home() {
  const { user, isLoading: authLoading, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [hasCheckedAutoLogin, setHasCheckedAutoLogin] = useState(false);

  // Redirect admins to overview dashboard
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Handle resume last path (but NO auto-redirect to year page anymore)
  useEffect(() => {
    if (!user || authLoading || hasCheckedAutoLogin || isAdmin) return;

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

  // Admin redirect in progress
  if (user && isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Skeleton className="h-8 w-64 mx-auto" />
        </div>
      </MainLayout>
    );
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const taskIcon: Record<string, React.ElementType> = {
  read: BookOpen,
  mcq: FlaskConical,
  video: Play,
  essay: PenLine,
  flashcard: GalleryHorizontal,
};

const resumeIcon: Record<string, React.ElementType> = {
  video: Video,
  practice: FlaskConical,
  flashcard: GalleryHorizontal,
  reading: BookOpenCheck,
};

function LoggedInHome() {
  const navigate = useNavigate();
  const { startSession } = useSessionFlow();
  const { user, profile, isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin, isModuleAdmin, moduleAdminModuleIds } = useAuthContext();
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: unreadCounts } = useUnreadMessages();
  const { data: unreadAnnouncements } = useUnreadAnnouncementDetails();
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const { data: dueCards } = useDueCards();
  const dueCount = dueCards?.length ?? 0;
  const { earned, total } = useBadgeStats();
  const { data: dueMCQCount = 0 } = useDueMCQCount();
  const { data: lastPos } = useLastPosition();

  // Tour + Guidance
  const { startTour } = useTour('student', studentTourSteps);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  // Listen for workflow open event
  useEffect(() => {
    const handler = () => setWorkflowOpen(true);
    window.addEventListener('kalm:open-workflow', handler);
    return () => window.removeEventListener('kalm:open-workflow', handler);
  }, []);

  // Visit counter for context guide
  const [showHomeGuide] = useState(() => {
    const count = parseInt(localStorage.getItem('kalm_home_visit_count') || '0', 10);
    localStorage.setItem('kalm_home_visit_count', String(count + 1));
    return count < 3;
  });
  
  const { setActiveYear } = useActiveYear();

  // Year selection
  const preferredYearId = profile?.preferred_year_id;
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  useEffect(() => {
    if (preferredYearId) {
      setSelectedYearId(preferredYearId);
    } else if (years && years.length > 0 && !selectedYearId) {
      setSelectedYearId(years[0].id);
    }
  }, [preferredYearId, years]);

  // Sync active year to header context
  useEffect(() => {
    if (selectedYearId && years) {
      const year = years.find(y => y.id === selectedYearId);
      if (year) {
        setActiveYear({ yearNumber: year.number, yearName: year.name });
      }
    }
  }, [selectedYearId, years, setActiveYear]);

  // Modules for selected year
  const { data: rawModules, isLoading: modulesLoading } = useModules(selectedYearId || undefined);
  const { data: mergedConfig } = useMergedModuleConfig();

  // Apply merged module filtering and overrides for students
  const modules = useMemo(() => {
    if (!rawModules) return undefined;
    if (!mergedConfig?.enabled || isAdmin) return rawModules;
    return rawModules.filter(m => !mergedConfig.hiddenModules.includes(m.id));
  }, [rawModules, mergedConfig, isAdmin]);

  const moduleIds = useMemo(() => modules?.map(m => m.id) || [], [modules]);
  const { data: readinessMap = {} } = useModuleReadinessBatch(moduleIds);

  // Year-level classification dashboard
  const { data: yearClassification } = useYearClassification(user?.id, moduleIds);

  // Dashboard data (suggestions, streak, readiness)
  const { data: dashboard } = useStudentDashboard(
    selectedYearId ? { yearId: selectedYearId } : undefined
  );

  // Cards/List toggle
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    return (localStorage.getItem('yearPageViewMode') as 'cards' | 'list') || 'cards';
  });
  const toggleViewMode = (mode: 'cards' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('yearPageViewMode', mode);
  };

  const selectedYear = years?.find(y => y.id === selectedYearId);
  const totalMessages = (unreadCounts?.announcements ?? 0) + (unreadCounts?.replies ?? 0);
  const hasMessages = totalMessages > 0;

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const streak = dashboard?.studyStreak ?? 0;
  const readiness = dashboard?.readinessResult?.examReadiness ?? 0;
  const suggestions: SuggestedItem[] = (dashboard?.suggestions ?? []).slice(0, 3);

  const isLoading = yearsLoading || modulesLoading;

  // Resume icon
  const resumeType = lastPos ? getResumeIconName(lastPos.tab, lastPos.activity_position?.sub_tab as string | null) : 'reading';
  const ResumeIcon = resumeIcon[resumeType] || Play;
  
  // Readiness label
  const readinessText = getReadinessLabel(readiness);

  // Weak chapters
  const weakChapters = dashboard?.weakChapters ?? [];

  // Primary suggestion (first one with isPrimary)
  const primarySuggestion = suggestions.find(s => s.isPrimary);
  const otherSuggestions = suggestions.filter(s => !s.isPrimary);

  // Total estimated time
  const totalEstimatedMinutes = suggestions.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  // Daily study plan hook — wired to DashboardTodayPlan component
  const chapterMetrics = dashboard?.chapterMetrics ?? [];
  const planInput = useMemo(() => ({
    metrics: chapterMetrics,
    chapters: (dashboard?.chapters ?? []).map(ch => ({
      id: ch.id,
      title: ch.title,
      moduleId: ch.moduleId,
      moduleName: ch.moduleName,
      hasLectures: false,
    })),
  }), [chapterMetrics, dashboard?.chapters]);

  const {
    dailyPlan,
    availableMinutes,
    setAvailableMinutes,
    refreshPlan,
    isRefreshing,
    markTaskStatus,
  } = useDailyStudyPlan({ planInput, chapterMetrics });

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Context Guide for new users */}
      {showHomeGuide && (
        <ContextGuide
          title="Start here"
          description="Resume where you left off, then follow today's plan to stay on track."
          primaryAction={{
            label: 'Go to Learning',
            onClick: () => {
              if (lastPos) navigate(buildResumeUrl(lastPos));
              else navigate('/', { state: { fromLearning: true } });
            },
          }}
          storageKey="kalm_guide_home_dismissed"
        />
      )}

      {/* First login modal + workflow guide */}
      <FirstLoginModal role="student" onStartTour={startTour} onOpenWorkflow={() => setWorkflowOpen(true)} />
      <WorkflowGuide open={workflowOpen} onOpenChange={setWorkflowOpen} mode="student" />

      {isStudent && <GoalsNudgeBanner />}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
        {/* ==================== LEFT COLUMN (60%) ==================== */}
        <div className="md:col-span-3 space-y-5">
          {/* Greeting + Notifications */}
          <section className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl md:text-2xl font-heading font-bold">
              {greeting}, <span className="text-primary">{firstName}</span> 👋
            </h1>
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
                <PopoverContent side="bottom" align="end" className="w-80 p-0">
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
                              if (ann.module_id) navigate(`/module/${ann.module_id}?tab=connect`);
                            }}
                          >
                            <Megaphone className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-1">{ann.title}</p>
                              {ann.module_name && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />{ann.module_name}
                                </p>
                              )}
                              {!ann.module_id && (
                                <p className="text-xs text-muted-foreground mt-0.5">General announcement</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            {ann.module_id && <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
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
          </section>

          {/* Continue where you left off */}
          {isStudent && lastPos && lastPos.module_id && (
            <section>
              <div
                data-tour="continue-card"
                className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 cursor-pointer
                           hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 group"
                onClick={() => navigate(buildResumeUrl(lastPos))}
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0
                                  group-hover:bg-primary/20 transition-colors">
                     <ResumeIcon className="w-5 h-5 text-primary" />
                   </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Continue where you left off</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{buildResumeLabel(lastPos)}</p>
                    <p className="text-[10px] text-muted-foreground/70">Pick up exactly where you left off</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(lastPos.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </div>
            </section>
          )}

          {/* Module Section with Year Selector + Cards/List Toggle */}
          <section data-tour="modules">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-lg font-heading font-semibold">Your Modules</h2>
                  <p className="text-[10px] text-muted-foreground/70">Explore topics or revise specific areas</p>
                </div>
                <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                  <SelectTrigger className="h-7 w-[130px] bg-background text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years?.map((year) => (
                      <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 gap-1.5" onClick={() => toggleViewMode('cards')}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Cards</span>
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 gap-1.5" onClick={() => toggleViewMode('list')}>
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">List</span>
                </Button>
              </div>
            </div>

            {/* Module Grid / List */}
            {isLoading ? (
              viewMode === 'cards' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="w-full aspect-[2.5]" />
                      <div className="p-2 space-y-1"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-full" /></div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-3 px-4">
                      <Skeleton className="h-4 w-20" /><Skeleton className="h-4 flex-1 max-w-xs" />
                    </div>
                  ))}
                </div>
              )
            ) : modules && modules.length > 0 ? (
              viewMode === 'cards' ? (
                <div className={cn("grid gap-3 w-full",
                  modules.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                )}>
                  {modules.map((module) => {
                    const isAssigned = isModuleAdmin && !isTeacher ? moduleAdminModuleIds.includes(module.id) : true;
                    const image = getModuleImage(module.slug, (module as any).image_url);
                    const gradient = getModuleGradient(module.slug);

                    if (!isAssigned) {
                      return (
                        <Card key={module.id} className="overflow-hidden opacity-50 cursor-default">
                          <AspectRatio ratio={16 / 9}>
                            {image ? (
                              <img src={image} alt={module.name} className="w-full h-full object-cover grayscale" />
                            ) : (
                              <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative', gradient)}>
                                <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                                <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">{module.slug?.toUpperCase()}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Lock className="w-8 h-8 text-white/70" />
                            </div>
                          </AspectRatio>
                          <div className="p-2.5">
                            <p className="font-heading font-semibold text-muted-foreground truncate text-xs sm:text-sm">{module.slug?.toUpperCase()} — {module.name}</p>
                          </div>
                        </Card>
                      );
                    }

                    return (
                      <Card
                        key={module.id}
                        className="overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 group"
                        onClick={() => navigate(`/module/${module.id}`)}
                      >
                        <AspectRatio ratio={16 / 9}>
                          {image ? (
                            <img src={image} alt={module.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center relative', gradient)}>
                              <Stethoscope className="absolute bottom-3 right-3 w-10 h-10 text-white/10" />
                              <span className="text-2xl font-heading font-bold text-white/80 tracking-wider">{module.slug?.toUpperCase()}</span>
                            </div>
                          )}
                        </AspectRatio>
                        <div className="p-2.5">
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="font-heading font-semibold text-foreground truncate text-xs sm:text-sm">
                                {mergedConfig?.enabled && mergedConfig.display[module.id]
                                  ? mergedConfig.display[module.id].displayName
                                  : `${module.slug?.toUpperCase()} — ${module.name}`}
                              </p>
                              {mergedConfig?.enabled && mergedConfig.display[module.id] && (
                                <div className="flex gap-1 mt-0.5">
                                  {mergedConfig.display[module.id].tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                                  ))}
                                </div>
                              )}
                              <ModuleReadinessBar readiness={readinessMap[module.id] ?? null} />
                              <ModuleCardLeads moduleId={module.id} />
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* List view */
                <div className="border rounded-lg divide-y">
                  {modules.map((module) => {
                    const isAssigned = isModuleAdmin && !isTeacher ? moduleAdminModuleIds.includes(module.id) : true;
                    if (!isAssigned) {
                      return (
                        <div key={module.id} className="flex items-center gap-3 py-3 px-4 opacity-50">
                          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium text-muted-foreground truncate">{module.slug?.toUpperCase()} — {module.name}</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={module.id}
                        className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => navigate(`/module/${module.id}`)}
                      >
                        <span className="text-xs font-mono font-semibold text-primary min-w-[4.5rem]">{module.slug?.toUpperCase()}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {mergedConfig?.enabled && mergedConfig.display[module.id]
                              ? mergedConfig.display[module.id].displayName
                              : module.name}
                          </span>
                          {mergedConfig?.enabled && mergedConfig.display[module.id] && (
                            <div className="flex gap-1">
                              {mergedConfig.display[module.id].tags.map(tag => (
                                <span key={tag} className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                              ))}
                            </div>
                          )}
                          <ModuleCardLeads moduleId={module.id} />
                        </div>
                        <div className="w-24 flex-shrink-0">
                          <ModuleReadinessBar readiness={readinessMap[module.id] ?? null} />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No modules available for this year.</p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* ==================== RIGHT COLUMN (40%) ==================== */}
        <div className="md:col-span-2 space-y-4">
          {/* Compact Stats Strip */}
          {isStudent && (
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-base font-bold">🔥 {streak}</p>
                  <p className="text-[10px] text-muted-foreground">Day Streak</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-base font-bold">📊 {Math.round(readiness)}%</p>
                  <p className="text-[10px] text-muted-foreground">{readinessText}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <button
                  className="text-center flex-1 hover:opacity-70 transition-opacity"
                  onClick={() => navigate('/achievements')}
                  title={`${earned} of ${total} badges earned`}
                >
                  <p className="text-base font-bold">🏆 {earned}</p>
                  <p className="text-[10px] text-muted-foreground">Badges</p>
                </button>
              </div>
            </Card>
          )}

          {/* Flashcards Widget */}
          {isStudent && dueCount > 0 && (
            <Card
              data-tour="flashcards-due"
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
              onClick={() => navigate('/review/flashcards')}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GalleryHorizontal className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {dueCount} card{dueCount === 1 ? '' : 's'} due today
                    </p>
                    <p className="text-xs text-muted-foreground">Daily review to keep knowledge fresh</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          {isStudent && dueCount === 0 && dueCards && (
            <Card data-tour="flashcards-due" className="border-green-200 dark:border-green-800">
              <CardContent className="py-2 px-4">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
                  ✓ Flashcards all caught up
                </p>
              </CardContent>
            </Card>
          )}

          {/* MCQ Spaced Repetition Widget */}
          {isStudent && dueMCQCount > 0 && (
            <Card
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
              onClick={() => navigate('/review/flashcards')}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {dueMCQCount} MCQ{dueMCQCount !== 1 ? 's' : ''} due today
                    </p>
                    <p className="text-xs text-muted-foreground">Spaced repetition practice</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Where You Stand */}
          {isStudent && (dashboard?.insights?.some(i => i.type === 'strong') || weakChapters.length > 0) && (
            <Card>
              <CardContent className="py-3 px-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Where you stand</p>
                {dashboard?.insights?.filter(i => i.type === 'strong').slice(0, 2).map((insight, idx) => (
                  <div key={`strong-${idx}`} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <p className="text-xs text-foreground font-medium truncate">{insight.label}</p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-auto flex-shrink-0">Strong ✓</span>
                  </div>
                ))}
                {weakChapters.slice(0, 2).map((ch, idx) => (
                  <div
                    key={`weak-${idx}`}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/module/${ch.moduleId}/chapter/${ch.chapterId}?section=practice&subtab=mcqs`)}
                  >
                    <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                    <p className="text-xs text-foreground font-medium truncate">{ch.chapterTitle}</p>
                    <span className="text-[10px] text-destructive ml-auto flex-shrink-0">{Math.round(ch.accuracy)}% MCQ</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Today's Study Plan — rendered via DashboardTodayPlan component */}
          {isStudent && suggestions.length > 0 && (
            <DashboardTodayPlan
              suggestions={suggestions}
              studyPlan={dashboard?.studyPlan ?? null}
              dailyPlan={dailyPlan}
              availableMinutes={availableMinutes}
              onAvailableMinutesChange={setAvailableMinutes}
              onRefreshPlan={refreshPlan}
              isRefreshing={isRefreshing}
              onNavigate={(moduleId, chapterId, tab, subtab) => {
                if (!moduleId || !chapterId) {
                  navigate('/review/flashcards');
                  return;
                }

                // Build session task list from all suggestions
                const sessionTasks: SessionTask[] = suggestions.map(s => {
                  const planTask = dailyPlan?.tasks.find(t => t.chapter_id === s.chapterId);
                  return {
                    title: s.title,
                    moduleId: s.moduleId ?? '',
                    chapterId: s.chapterId ?? '',
                    tab: s.prescribedStudyMode?.tab || s.tab || 'resources',
                    subtab: s.subtab,
                    estimatedMinutes: s.estimatedMinutes,
                    reason: s.reason,
                    dailyPlanTaskId: planTask?.id,
                  };
                });

                // Find the index of the clicked task
                const clickedIndex = sessionTasks.findIndex(
                  t => t.chapterId === chapterId && t.moduleId === moduleId
                );

                startSession(sessionTasks, Math.max(0, clickedIndex), (taskId) => {
                  markTaskStatus(taskId, 'completed');
                });

                const subtabParam = subtab ? `&subtab=${subtab}` : '';
                navigate(`/module/${moduleId}/chapter/${chapterId}?section=${tab || 'resources'}${subtabParam}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
