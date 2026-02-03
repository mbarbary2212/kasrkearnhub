import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRound, UsersRound, BookOpen, ClipboardCheck, MessageCircle, FileQuestion, ChevronRight, Megaphone, Mail, GraduationCap } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import logo from '@/assets/kalm-hub-logo.png';
import MainLayout from '@/components/layout/MainLayout';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getYearIcon } from '@/lib/yearIcons';

export default function Home() {
  const { user, profile, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [hasCheckedAutoLogin, setHasCheckedAutoLogin] = useState(false);

  // Handle auto-login to preferred year - only on fresh session, not when user explicitly navigates home
  useEffect(() => {
    if (!user || authLoading || hasCheckedAutoLogin) return;

    // Check if user explicitly navigated to home (skip auto-login)
    const skipAutoLogin = sessionStorage.getItem('skipAutoLogin');
    if (skipAutoLogin) {
      sessionStorage.removeItem('skipAutoLogin');
      setHasCheckedAutoLogin(true);
      return;
    }

    const checkAutoLogin = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_year_id, auto_login_to_year')
          .eq('id', user.id)
          .single();

        if (data?.auto_login_to_year && data?.preferred_year_id) {
          // Get the year number from the year ID
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
        console.error('Error checking auto-login:', error);
      } finally {
        setHasCheckedAutoLogin(true);
      }
    };

    checkAutoLogin();
  }, [user, authLoading, hasCheckedAutoLogin, navigate]);

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

  // Landing page for non-logged in users
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center mb-6 overflow-hidden h-72 md:h-80">
              <img 
                src={logo} 
                alt="KALM Hub Logo" 
                className="w-[360px] h-[360px] md:w-[400px] md:h-[400px] object-contain object-top -mb-24" 
              />
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Kasralainy for learning and mentorship HUB
            </p>
          </div>

          {/* Login Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Student Login - Primary, prominent on all devices */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 border-0 shadow-lg group"
              onClick={() => navigate('/auth?type=student')}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-medical-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UserRound className="w-10 h-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-heading">Student</CardTitle>
                <CardDescription className="text-base">
                  Access lectures, quizzes, and study materials
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full gradient-medical text-lg py-6">
                  Student Login
                </Button>
              </CardContent>
            </Card>

            {/* Faculty & Staff Login - Only visible on desktop/tablet (md and up) */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 border-0 shadow-lg group hidden md:block"
              onClick={() => navigate('/auth?type=faculty')}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-medical-teal rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UsersRound className="w-10 h-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-heading">Faculty & Staff</CardTitle>
                <CardDescription className="text-base">
                  Manage content, view analytics, and track progress
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full bg-medical-teal hover:bg-medical-teal/90 text-primary-foreground text-lg py-6">
                  Faculty Login
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Mobile-only Faculty Login - Secondary/Less prominent */}
          <div className="md:hidden mt-6 text-center">
            <Button 
              variant="outline" 
              size="sm"
              className="text-muted-foreground"
              onClick={() => navigate('/auth?type=faculty')}
            >
              <UsersRound className="w-4 h-4 mr-2" />
              Faculty & Staff Login
            </Button>
          </div>

          {/* Features Section - 5 Pillars */}
          <div className="mt-16 max-w-6xl mx-auto">
            {/* Desktop: all 5 in single row */}
            <div className="hidden md:grid md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Resources</h3>
                <p className="text-sm text-muted-foreground">
                  To build understanding
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ClipboardCheck className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Practice</h3>
                <p className="text-sm text-muted-foreground">
                  Test your understanding
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileQuestion className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Formative Assessment</h3>
                <p className="text-sm text-muted-foreground">
                  Designed around your module
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="font-heading font-semibold mb-2">Connect</h3>
                <p className="text-sm text-muted-foreground">
                  Your voice matters
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-pointer">
                      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                        <GraduationCap className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <h3 className="font-heading font-semibold mb-2">Personal Study Coach</h3>
                      <p className="text-sm text-muted-foreground">
                        AI-powered guidance for your learning journey
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black text-white border-black">
                    Personal Study Coach
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Mobile: 2x2 grid for first 4, then 5th centered below */}
            <div className="md:hidden space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">Resources</h3>
                  <p className="text-sm text-muted-foreground">
                    To build understanding
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                    <ClipboardCheck className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">Practice</h3>
                  <p className="text-sm text-muted-foreground">
                    Test your understanding
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileQuestion className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">Formative Assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    Designed around your module
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">Connect</h3>
                  <p className="text-sm text-muted-foreground">
                    Your voice matters
                  </p>
                </div>
              </div>
              {/* 5th pillar centered */}
              <div className="flex justify-center">
                <div className="w-[calc(50%-0.75rem)] text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-pointer">
                          <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                            <GraduationCap className="w-6 h-6 text-secondary-foreground" />
                          </div>
                          <h3 className="font-heading font-semibold mb-2">Personal Study Coach</h3>
                          <p className="text-sm text-muted-foreground">
                            AI-powered guidance for your learning journey
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black text-white border-black">
                        Personal Study Coach
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Logged in user home page - shows year selection for ALL users
function LoggedInHome() {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { data: years, isLoading } = useYears();
  const { data: unreadCounts } = useUnreadMessages();

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
  const YearCard = ({ year }: { year: typeof years[0] }) => (
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 cursor-pointer">
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
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-popover-foreground">Go to your module to check your messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Select your academic year to continue
        </p>
      </section>

      {/* Year Selection */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-lg md:text-xl font-heading font-semibold mb-3 md:mb-4">Academic Years</h2>
        
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
    </div>
  );
}
