import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Home, LogOut, Shield, Settings, Trophy, GraduationCap } from 'lucide-react';
import logo from '@/assets/kalm-hub-logo.png';
import InquiryModal from '@/components/feedback/InquiryModal';
import { AdminNotificationsPopover } from '@/components/admin/AdminNotificationsPopover';
import { HeaderBadgesPanel } from '@/components/dashboard/HeaderBadgesPanel';
import { useBadgeStats } from '@/hooks/useBadges';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouteResume, clearLastPath } from '@/hooks/useRouteResume';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, profile, role, signOut, isAdmin, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const { earned } = useBadgeStats();
  const isMobile = useIsMobile();

  // Track route changes for resume functionality
  useRouteResume(isAdmin);

  const handleLogout = async () => {
    // Clear stored last path on logout
    clearLastPath();
    await signOut();
    // Full reload to show splash screen
    window.location.href = '/';
  };

  const handleGoHome = () => {
    sessionStorage.setItem('skipAutoLogin', 'true');
    navigate('/');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleGoHome} className="flex items-center justify-center hover:opacity-80 transition-all duration-200 hover:scale-105 overflow-hidden h-[62px] md:h-[72px]">
              <img src={logo} alt="KALM Hub Logo" className="h-[92px] md:h-[110px] w-auto object-contain" />
            </button>
            {/* Achievements Trophy Icon - Right of logo (students only) */}
            {user && !isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setBadgesOpen(true)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md bg-yellow-500/10 hover:bg-yellow-500/20 transition-transform duration-200 hover:scale-110"
                    >
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black text-white border-black">
                    Achievements
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={handleGoHome}
              className={`text-sm font-medium transition-all duration-200 hover:text-primary hover:scale-110 ${
                location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Home
            </button>
          </nav>

          <div className="flex items-center gap-2">
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
                  {/* Badge count indicator (students only) */}
                  {!isAdmin && earned > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 text-white text-xs font-bold flex items-center justify-center border-2 border-background shadow-sm">
                      {earned > 9 ? '9+' : earned}
                    </span>
                  )}
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
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  </>
                )}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        {children}
      </main>


      {/* Inquiry Modal */}
      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />

      {/* Achievements Panel (students only) */}
      {!isAdmin && <HeaderBadgesPanel open={badgesOpen} onOpenChange={setBadgesOpen} />}
    </div>
  );
}
