import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, LogOut, Shield, Settings, GraduationCap, BookOpen, Users, ChevronRight, PenTool, Stethoscope, ClipboardCheck, LucideIcon } from 'lucide-react';
import { usePresence } from '@/contexts/PresenceContext';
import logo from '@/assets/kalm-hub-logo-transparent.png';
import InquiryModal from '@/components/feedback/InquiryModal';
import { AskCoachButton } from '@/components/coach/AskCoachButton';
import { AdminNotificationsPopover } from '@/components/admin/AdminNotificationsPopover';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouteResume, clearLastPath } from '@/hooks/useRouteResume';
import { useYears } from '@/hooks/useYears';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useActiveYear } from '@/contexts/ActiveYearContext';
import { getYearIcon } from '@/lib/yearIcons';
import { useModule } from '@/hooks/useModules';
import { useChapter } from '@/hooks/useChapters';
import { useChapterProgress } from '@/hooks/useChapterProgress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MainLayoutProps {
  children: ReactNode;
}

function OnlinePill() {
  const { onlineCount } = usePresence();
  return (
    <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-600/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-green-500/10 dark:text-green-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <Users className="h-3.5 w-3.5" />
      <span>{onlineCount}</span>
    </div>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, profile, role, signOut, isAdmin, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin, isTeacher } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const isMobile = useIsMobile();
  const { activeYear } = useActiveYear();

  // Extract moduleId and chapterId from URL for breadcrumb display
  const moduleIdMatch = location.pathname.match(/\/module\/([^/]+)/);
  const chapterIdMatch = location.pathname.match(/\/chapter\/([^/]+)/);
  const currentModuleId = moduleIdMatch?.[1] || '';
  const currentChapterId = chapterIdMatch?.[1] || '';
  const { data: currentModule } = useModule(currentModuleId);
  const { data: currentChapter } = useChapter(currentChapterId || undefined);
  const { data: chapterProgress, isLoading: progressLoading } = useChapterProgress(currentChapterId || undefined);

  const { data: years } = useYears();
  const matchedYear = years?.find(y => y.number === activeYear?.yearNumber);
  const yearIcon = matchedYear?.image_url || (activeYear ? getYearIcon(activeYear.yearNumber) : undefined);

  // Track route changes for resume functionality
  useRouteResume(isAdmin);

  const handleLogout = async () => {
    // Clear stored last path on logout
    clearLastPath();
    sessionStorage.removeItem('kalmhub:hasVisitedHome');
    await signOut();
    // Full reload to show splash screen
    window.location.href = '/';
  };

  const handleGoHome = () => {
    sessionStorage.setItem('skipAutoLogin', 'true');
    navigate('/');
  };

  const handleYearClick = () => {
    navigate('/years');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin':
        return 'bg-red-500 text-white';
      case 'platform_admin':
        return 'bg-indigo-500 text-white';
      case 'department_admin':
        return 'bg-purple-500 text-white';
      case 'topic_admin':
        return 'bg-teal-500 text-white';
      case 'admin':
        return 'bg-medical-purple text-primary-foreground';
      case 'teacher':
        return 'bg-medical-teal text-primary-foreground';
      default:
        return 'bg-medical-blue text-primary-foreground';
    }
  };

  const getRoleLabel = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin':
        return 'Super Admin';
      case 'platform_admin':
        return 'Platform Admin';
      case 'department_admin':
        return 'Module Admin';
      case 'topic_admin':
        return 'Topic Admin';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      case 'admin':
        return 'Admin';
      default:
        return userRole;
    }
  };

  const displayName = profile?.full_name || user?.email || 'User';
  const displayEmail = user?.email || '';
  const isStudent = !!user && !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;
  const showSharedNav = isStudent || isAdmin;

  return (
    <div className="min-h-screen bg-background dark:bg-transparent flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 dark:bg-white/[0.03] dark:backdrop-blur-xl border-b border-border dark:border-white/10">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleGoHome} className="flex items-center justify-center hover:opacity-80 transition-all duration-200 hover:scale-105">
              <img src={logo} alt="KALM Hub Logo" className="h-[16px] md:h-[18px] w-auto object-contain" />
            </button>
            {/* Active year indicator */}
            {activeYear && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                <button
                  onClick={handleYearClick}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-all duration-200"
                >
                  {yearIcon && (
                    <img src={yearIcon} alt={activeYear.yearName} className="h-6 w-6 rounded object-contain" />
                  )}
                  <span className="text-xs md:text-sm font-medium text-muted-foreground hidden sm:inline">
                    {activeYear.yearName}
                  </span>
                </button>
              </>
            )}
            {/* Module slug breadcrumb */}
            {currentModule?.slug && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                <button
                  onClick={() => navigate(`/module/${currentModuleId}`)}
                  className="flex items-center gap-1 hover:opacity-80 transition-all duration-200"
                >
                  <span className="text-xs md:text-sm font-medium text-muted-foreground uppercase">
                    {currentModule.slug}
                  </span>
                </button>
              </>
            )}
            {/* Chapter breadcrumb */}
            {currentChapter && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex items-center gap-1.5">
                  {currentChapter.icon_url && (
                    <img src={currentChapter.icon_url} alt="" className="h-7 w-7 md:h-8 md:w-8 rounded-lg object-cover" />
                  )}
                  <span className="text-xs md:text-sm font-medium text-foreground truncate max-w-[120px] md:max-w-[200px]">
                    {currentChapter.title}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Chapter progress bar - between breadcrumb and right icons */}
          {!isAdmin && currentChapterId && currentChapter && !progressLoading && chapterProgress && (chapterProgress.practiceTotal > 0 || chapterProgress.videosTotal > 0) && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-16 md:w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${chapterProgress.totalProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] md:text-xs font-semibold text-muted-foreground">
                      {chapterProgress.totalProgress}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs space-y-1 max-w-[200px]">
                  <p className="font-semibold">Chapter Progress: {chapterProgress.totalProgress}%</p>
                  {chapterProgress.practiceTotal > 0 && (
                    <p>Practice: {chapterProgress.practiceCompleted}/{chapterProgress.practiceTotal} ({chapterProgress.practiceProgress}%)</p>
                  )}
                  {chapterProgress.videosTotal > 0 && (
                    <p>Videos: {chapterProgress.videoProgress}% watched</p>
                  )}
                  <p className="text-muted-foreground">Practice 60% · Videos 40%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Admin Panel button - only show on non-overview admin pages */}
          {user && isAdmin && !['/admin/overview', '/admin/dashboard'].includes(location.pathname) && (
            <Button
              onClick={() => navigate('/admin')}
              variant="ghost"
              className={`gap-1.5 rounded-full transition-all duration-200 hover:scale-105 ${
                location.pathname === '/admin'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
              size={isMobile ? 'icon' : 'sm'}
            >
              <Shield className="h-4 w-4" />
              {!isMobile && <span className="font-medium">Admin Panel</span>}
            </Button>
          )}

          <div className="flex items-center gap-1.5 md:gap-2">
            {user && <OnlinePill />}
            <ThemeToggle />
            {/* Admin notifications for admins */}
            {user && isAdmin && (
              <AdminNotificationsPopover 
                onNavigateToAnnouncement={() => navigate('/admin?tab=announcements')}
              />
            )}

            {/* Mobile header coach icon removed - students use Avatar menu or Chapter "Ask Coach" buttons */}

            {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full transition-transform duration-200 hover:scale-110">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="gradient-medical text-primary-foreground font-semibold">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                    {role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full w-fit capitalize ${getRoleBadgeColor(role)}`}>
                        {getRoleLabel(role)}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleGoHome}>
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/years')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  All Years
                </DropdownMenuItem>
                {/* Only show Study Coach for non-admins */}
                {!isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/progress')}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Study Coach
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            ) : (
            <Button onClick={() => navigate('/auth')} className="gradient-medical">
              Sign In
            </Button>
          )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Shared Sidebar - desktop only */}
        {showSharedNav && <StudentSidebar />}

        {/* Main Content */}
        <main className={cn("flex-1 px-2 md:px-4 py-4 md:py-8 overflow-x-hidden", showSharedNav ? 'pb-28 md:pb-16' : 'pb-20 md:pb-8', showSharedNav ? '' : 'container mx-auto')}>
          <div className={showSharedNav ? 'container mx-auto' : ''}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {showSharedNav && <MobileBottomNav />}

      {/* Persistent Ask Footer — all devices */}
      {user && !isAdmin && (
        <div className={cn(
          "fixed z-40 right-3 sm:right-4",
          isStudent ? "bottom-[calc(56px+env(safe-area-inset-bottom)+8px)] sm:bottom-4" : "bottom-4"
        )}>
          <AskCoachButton variant="icon" className="h-10 w-10 shadow-lg border border-border bg-card/90 backdrop-blur-sm hover:bg-accent" />
        </div>
      )}

      {/* Inquiry Modal */}
      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />

    </div>
  );
}
