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
import { Home, LogOut, Shield, Settings, GraduationCap, BookOpen, Users } from 'lucide-react';
import { usePresence } from '@/contexts/PresenceContext';
import logo from '@/assets/kalm-hub-logo-transparent.png';
import InquiryModal from '@/components/feedback/InquiryModal';
import { AdminNotificationsPopover } from '@/components/admin/AdminNotificationsPopover';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouteResume, clearLastPath } from '@/hooks/useRouteResume';
import { useYears } from '@/hooks/useYears';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useActiveYear } from '@/contexts/ActiveYearContext';
import { getYearIcon } from '@/lib/yearIcons';

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
  const yearIcon = activeYear ? getYearIcon(activeYear.yearNumber) : undefined;

  const { data: years } = useYears();

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

  return (
    <div className="min-h-screen bg-background dark:bg-transparent flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 dark:bg-white/[0.03] dark:backdrop-blur-xl border-b border-border dark:border-white/10">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleGoHome} className="flex items-center justify-center hover:opacity-80 transition-all duration-200 hover:scale-105">
              <img src={logo} alt="KALM Hub Logo" className="h-[16px] md:h-[18px] w-auto object-contain" />
            </button>
            {/* Active year indicator - clicks to All Years */}
            {activeYear && (
              <button
                onClick={handleYearClick}
                className="flex items-center gap-1.5 pl-1.5 border-l border-border/50 hover:opacity-80 transition-all duration-200"
              >
                {yearIcon && (
                  <img src={yearIcon} alt={activeYear.yearName} className="h-6 w-6 rounded object-contain" />
                )}
                <span className="text-xs md:text-sm font-medium text-muted-foreground hidden sm:inline">
                  {activeYear.yearName}
                </span>
              </button>
            )}
          </div>

          {/* Admin Panel button - prominent header placement */}
          {user && isAdmin && (
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
        {/* Student Sidebar - desktop only */}
        {isStudent && <StudentSidebar />}

        {/* Main Content */}
        <main className={cn("flex-1 px-2 md:px-4 py-4 md:py-8 pb-20 md:pb-8", isStudent ? 'md:max-w-[calc(100%-0px)]' : 'container mx-auto')}>
          <div className={isStudent ? 'container mx-auto' : ''}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isStudent && <MobileBottomNav />}

      {/* Inquiry Modal */}
      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />

    </div>
  );
}
