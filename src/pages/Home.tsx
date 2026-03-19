import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Megaphone, Mail, Compass, Clock } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import MainLayout from '@/components/layout/MainLayout';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEffect, useState } from 'react';
import { AppMindMap } from '@/components/dashboard/AppMindMap';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getYearIcon } from '@/lib/yearIcons';
import { getLastPath, isValidResumePath, clearLastPath } from '@/hooks/useRouteResume';
import { useQuery } from '@tanstack/react-query';

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

    const checkAutoRedirect = async () => {
      try {
        // Priority 1: Check for stored lastPath (resume functionality)
        const lastPath = getLastPath();
        if (lastPath && isValidResumePath(lastPath, isAdmin)) {
          // Clear the stored path to prevent loops if the route is invalid
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

        if (data?.auto_login_to_year && data?.preferred_year_id) {
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
  const { profile } = useAuthContext();
  const { data: years, isLoading } = useYears();
  const { data: unreadCounts } = useUnreadMessages();
  const [mindMapOpen, setMindMapOpen] = useState(false);

  // Fetch resource counts per year to detect years with no actual content
  const { data: resourceCounts } = useQuery({
    queryKey: ['year-resource-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('chapter_id, module_chapters!inner(module_id, modules!inner(year_id))')
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const yearId = r.module_chapters?.modules?.year_id;
        if (yearId) counts[yearId] = (counts[yearId] || 0) + 1;
      });
      return counts;
    },
  });

  // Color mapping for year accent borders
  const getYearColor = (color: string | null): string => {
    const colorMap: Record<string, string> = {
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#22c55e',
      'bg-yellow-500': '#eab308',
      'bg-orange-500': '#f97316',
      'bg-red-500': '#ef4444',
      'bg-purple-500': '#a855f7',
      'bg-pink-500': '#ec4899',
      'bg-teal-500': '#14b8a6',
      'bg-indigo-500': '#6366f1',
      'bg-primary': 'hsl(var(--primary))',
    };
    return color && colorMap[color] ? colorMap[color] : '#3b82f6';
  };

  // Year Card Component
  const YearCard = ({ year }: { year: typeof years[0] }) => {
    const isEmpty = resourceCounts && (resourceCounts[year.id] || 0) < 5;
    
    return (
      <div
        className="relative bg-card rounded-xl shadow-md overflow-hidden cursor-pointer 
                   transition-all duration-300 ease-out 
                   hover:shadow-xl hover:-translate-y-1 group"
        onClick={() => navigate(`/year/${year.number}`)}
      >
        {/* Colored Left Accent Border */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 md:w-2"
          style={{ backgroundColor: getYearColor(year.color) }}
        />
        
        {/* Card Content */}
        <div className="flex items-center justify-between p-4 md:p-5 pl-5 md:pl-6">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg md:text-xl font-heading font-semibold text-foreground">
              Year {year.number}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mt-1 line-clamp-2">
              {year.subtitle || year.name}
            </p>
            {isEmpty && (
              <p className="text-xs text-muted-foreground/70 mt-1.5 italic flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Content coming soon — tap to preview structure
              </p>
            )}
          </div>
          
          {/* Year Icon */}
          {getYearIcon(year.number) ? (
            <img 
              src={getYearIcon(year.number)} 
              alt={`Year ${year.number}`}
              className="w-16 h-16 md:w-20 md:h-20 object-contain flex-shrink-0
                         transition-transform duration-300 
                         group-hover:scale-110 group-hover:rotate-3"
            />
          ) : (
            <div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: getYearColor(year.color) }}
            >
              <span className="text-2xl font-bold text-white">{year.number}</span>
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
          <span className="text-gradient-medical">{profile?.full_name || 'Student'}</span>
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
              <PopoverContent side="bottom" className="w-auto px-4 py-2 text-sm">
                <p className="text-popover-foreground">Go to your module to check your messages</p>
              </PopoverContent>
            </Popover>
          )}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Select your academic year to continue
        </p>
      </section>

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
