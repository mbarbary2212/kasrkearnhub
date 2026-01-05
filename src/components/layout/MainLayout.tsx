import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { Home, LogOut, Inbox, FileText, Shield, BarChart3, Settings } from 'lucide-react';
import logo from '@/assets/logo.png';
import studyGuideIcon from '@/assets/study-guide-icon.png';
import personalCoachIcon from '@/assets/personal-coach-icon.png';
import InquiryModal from '@/components/feedback/InquiryModal';
import { AdminNotificationsPopover } from '@/components/admin/AdminNotificationsPopover';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, profile, role, signOut, isAdmin, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
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
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="KasrLearn Logo" className="w-10 h-10 object-contain" />
            <span className="font-heading font-bold text-xl">KasrLearn</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* Admin notifications for admins */}
            {user && isAdmin && (
              <AdminNotificationsPopover 
                onNavigateToAnnouncement={() => navigate('/admin?tab=announcements')}
              />
            )}

            {/* Study Guide Quick Access */}
            {user && (
              <Button
                onClick={() => navigate('/progress')}
                variant="ghost"
                size="icon"
                className="h-[68px] w-[68px] rounded-full hover:bg-primary/10 p-0.5"
              >
                <img src={personalCoachIcon} alt="Personal Study Coach" className="h-16 w-16 rounded" />
              </Button>
            )}

            {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/progress')}>
                  <img src={personalCoachIcon} alt="Personal Study Coach" className="mr-2 h-4 w-4 rounded" />
                  Personal Study Coach
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin/inbox')}>
                      <Inbox className="mr-2 h-4 w-4" />
                      Feedback & Inquiries
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin?tab=help')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Help & Templates
                    </DropdownMenuItem>
                    {!isTopicAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
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
    </div>
  );
}
