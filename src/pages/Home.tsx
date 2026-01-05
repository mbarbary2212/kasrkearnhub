import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRound, UsersRound, BookOpen, ClipboardCheck, MessageCircle, FileQuestion, ChevronRight, Megaphone, Mail } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import logo from '@/assets/logo.png';
import MainLayout from '@/components/layout/MainLayout';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const { user, profile, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [hasCheckedAutoLogin, setHasCheckedAutoLogin] = useState(false);

  // Handle auto-login to preferred year
  useEffect(() => {
    if (!user || authLoading || hasCheckedAutoLogin) return;

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
          {/* Logo and Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-3 mb-6">
              <img src={logo} alt="KasrLearn Logo" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              <span className="text-gradient-medical">KasrLearn</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your comprehensive medical education platform for Kasr Al-Ainy Faculty of Medicine
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

          {/* Features Section */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
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

  // Color mapping for years - using inline styles since dynamic Tailwind classes are purged
  const getYearStyle = (color: string | null): React.CSSProperties => {
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
    const bgColor = color && colorMap[color] ? colorMap[color] : 'hsl(var(--primary))';
    return { backgroundColor: bgColor };
  };

  const totalMessages = (unreadCounts?.announcements ?? 0) + (unreadCounts?.replies ?? 0);
  const hasMessages = totalMessages > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <section className="text-center py-8">
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4 inline-flex items-center justify-center gap-2 flex-wrap">
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
        <p className="text-lg text-muted-foreground">
          Select your academic year to continue
        </p>
      </section>

      {/* Year Selection */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-xl font-heading font-semibold mb-4">Academic Years</h2>
        
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        ) : years && years.length > 0 ? (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {years.map((year) => (
              <div
                key={year.id}
                className="flex items-center gap-4 py-4 px-4 cursor-pointer transition-colors hover:bg-muted/50 group"
                onClick={() => navigate(`/year/${year.number}`)}
              >
                <div 
                  className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
                  style={getYearStyle(year.color)}
                >
                  <span className="text-lg font-semibold text-primary-foreground">{year.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground">
                    {year.name}
                  </p>
                  {year.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{year.subtitle}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </div>
            ))}
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
