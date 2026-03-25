import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Megaphone, Mail, Compass, Clock, ChevronRight, Play, ArrowRight } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import MainLayout from '@/components/layout/MainLayout';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadAnnouncementDetails } from '@/hooks/useUnreadAnnouncementDetails';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useState } from 'react';
import { AppMindMap } from '@/components/dashboard/AppMindMap';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getYearIcon } from '@/lib/yearIcons';
import { getLastPath, isValidResumePath, clearLastPath } from '@/hooks/useRouteResume';
import { useLastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';

export default function Home() {
  const { user, isLoading: authLoading, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [hasCheckedAutoLogin, setHasCheckedAutoLogin] = useState(false);

  // Handle resume last path OR auto-login to preferred year
  useEffect(() => {
    if (!user || authLoading || hasCheckedAutoLogin) return;

    // Check if user explicitly navigated to home (skip all auto-redirects)
    const skipAutoLogin = sessionStorage.getItem('skipAutoLogin');
    if (skipAutoLogin) {
      sessionStorage.removeItem('skipAutoLogin');
      setHasCheckedAutoLogin(true);
      return;
    }

    // Only auto-redirect on initial app load (first visit in this session)
    // If user already visited home this session, don't redirect them away
    const hasVisitedHome = sessionStorage.getItem('kalmhub:hasVisitedHome');
    if (hasVisitedHome) {
      setHasCheckedAutoLogin(true);
      return;
    }
    sessionStorage.setItem('kalmhub:hasVisitedHome', 'true');

    const checkAutoRedirect = async () => {
      try {
        // Priority 1: Check for stored lastPath (resume functionality via localStorage)
        const lastPath = getLastPath();
        if (lastPath && isValidResumePath(lastPath, isAdmin)) {
          clearLastPath();
          navigate(lastPath, { replace: true });
          return;
        }

        // Priority 2: Fall back to preferred year auto-login
        const { data } = await supabase
          .from('profiles')
          .select('preferred_year_id, auto_login_to_year')
          .eq('id', user.id)
          .single();

        if (data?.preferred_year_id) {
          const { data: yearData } = await supabase
            .from('years')
            .select('number')
            .eq('id', data.preferred_year_id)
            .single();

          if (yearData) {
            navigate(`/year/${yearData.number}`, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking auto-redirect:', error);
      } finally {
        setHasCheckedAutoLogin(true);
      }
    };

    checkAutoRedirect();
  }, [user, authLoading, hasCheckedAutoLogin, navigate, isAdmin]);

  // If not logged in, redirect to auth page
  if (!user && !authLoading) {
    navigate('/auth', { replace: true });
    return null;
  }

  // If user is logged in, show the year selection page wrapped in MainLayout
  if (user) {
    // Don't render until we've checked auto-login preference
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

  // Loading state during auth check
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-8 w-64" />
    </div>
  );
}

// Logged in user home page - shows year selection for ALL users
function LoggedInHome() {
  const navigate = useNavigate();
  const { profile, isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const { data: years, isLoading } = useYears();
  const { data: unreadCounts } = useUnreadMessages();
  const { data: unreadAnnouncements } = useUnreadAnnouncementDetails();
  const [mindMapOpen, setMindMapOpen] = useState(false);
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;

  // Fetch the student's last saved position
  const { data: lastPos } = useLastPosition();

  // Glow color mapping per year
  const YEAR_GLOW: Record<number, { base: string; hover: string; iconBg: string }> = {
    1: { base: '0 0 25px rgba(59,130,246,0.12)', hover: '0 0 40px rgba(59,130,246,0.28)', iconBg: 'rgba(59,130,246,0.15)' },
    2: { base: '0 0 25px rgba(34,197,94,0.12)', hover: '0 0 40px rgba(34,197,94,0.28)', iconBg: 'rgba(34,197,94,0.15)' },
    3: { base: '0 0 25px rgba(234,179,8,0.12)', hover: '0 0 40px rgba(234,179,8,0.28)', iconBg: 'rgba(234,179,8,0.15)' },
    4: { base: '0 0 25px rgba(249,115,22,0.12)', hover: '0 0 40px rgba(249,115,22,0.28)', iconBg: 'rgba(249,115,22,0.15)' },
    5: { base: '0 0 25px rgba(239,68,68,0.12)', hover: '0 0 40px rgba(239,68,68,0.28)', iconBg: 'rgba(239,68,68,0.15)' },
  };

  // Year Card Component
  const YearCard = ({ year }: { year: typeof years[0] }) => {
    const glow = YEAR_GLOW[year.number] || YEAR_GLOW[1];

    return (
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer
                   transition-all duration-300 ease-out group
                   hover:scale-[1.02]
                   dark:bg-white/[0.03] dark:backdrop-blur-[16px] dark:border dark:border-white/[0.08]
                   bg-card shadow-md hover:shadow-xl hover:-translate-y-1"
        style={{ boxShadow: glow.base }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = glow.hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = glow.base; }}
        onClick={() => navigate(`/year/${year.number}`)}
      >
        {/* Card Content */}
        <div className="flex items-center justify-between p-4 md:p-5">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg md:text-xl font-heading font-semibold text-foreground">
              Year {year.number}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mt-1 line-clamp-2">
              {year.subtitle || year.name}
            </p>
            {year.number <= 3 && (
              <p className="text-xs italic text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Content coming soon — you can still see the structure
              </p>
            )}
            {year.number === 4 && (
              <p className="text-xs italic text-muted-foreground mt-1">SUR-423: Surgery 1</p>
            )}
          </div>
          
          {/* Year Icon with inner-glow container */}
          {((year as any).image_url || getYearIcon(year.number)) ? (
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center flex-shrink-0
                         transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2"
              style={{ backgroundColor: glow.iconBg, boxShadow: `inset 0 0 20px ${glow.iconBg}` }}
            >
              <img 
                src={(year as any).image_url || getYearIcon(year.number)} 
                alt={`Year ${year.number}`}
                className="w-12 h-12 md:w-14 md:h-14 object-contain"
              />
            </div>
          ) : (
            <div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center flex-shrink-0
                         transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: glow.iconBg, boxShadow: `inset 0 0 20px ${glow.iconBg}` }}
            >
              <span className="text-2xl font-bold text-foreground">{year.number}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalMessages = (unreadCounts?.announcements ?? 0) + (unreadCounts?.replies ?? 0);
  const hasMessages = totalMessages > 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      
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
        <p className="text-sm md:text-base text-muted-foreground">
          Select your academic year to continue
        </p>
      </section>

      {/* Continue Where You Left Off — students only */}
      {isStudent && lastPos && lastPos.module_id && (
        <section className="max-w-3xl mx-auto">
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

      {/* Year Selection */}
      <section className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-heading font-semibold">Academic Years</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/15 shadow-sm
                             hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25
                             transition-all duration-300 ease-out
                             animate-[soft-glow-pulse_12s_ease-in-out_infinite] gap-2 text-sm font-medium"
                  onClick={() => setMindMapOpen(true)}
                >
                  <Compass className="h-4 w-4" />
                  Explore App Structure
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>See how the platform is structured across years, modules, and chapters.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {isLoading ? (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[100px] md:h-[120px] rounded-xl" />
              ))}
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-[100px] md:h-[120px] w-full md:w-[calc(50%-0.75rem)] rounded-xl" />
            </div>
          </div>
        ) : years && years.length > 0 ? (
          <div className="space-y-4 md:space-y-6">
            {/* Years 1-4: 2-column grid on desktop, 1 column on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {years.filter(y => y.number !== 5).map((year) => (
                <YearCard key={year.id} year={year} />
              ))}
            </div>
            
            {/* Year 5: Centered below */}
            {years.find(y => y.number === 5) && (
              <div className="flex justify-center">
                <div className="w-full md:w-[calc(50%-0.75rem)]">
                  <YearCard year={years.find(y => y.number === 5)!} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No years available yet.</p>
          </div>
        )}
      </section>

      <AppMindMap open={mindMapOpen} onOpenChange={setMindMapOpen} />
    </div>
  );
}
