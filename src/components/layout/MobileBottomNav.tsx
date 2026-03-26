import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, MessageCircle, ClipboardCheck, GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useDueCards } from '@/hooks/useFSRS';
import { toast } from 'sonner';

interface NavTab {
  id: string;
  label: string;
  icon: React.ElementType;
  globalPath: string;
}

const tabs: NavTab[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, globalPath: '/' },
  { id: 'learning', label: 'Learning', icon: BookOpen, globalPath: '__learning__' },
  { id: 'connect', label: 'Connect', icon: MessageCircle, globalPath: '/connect' },
  { id: 'formative', label: 'Formative', icon: ClipboardCheck, globalPath: '/formative' },
  { id: 'coach', label: 'Coach', icon: GraduationCap, globalPath: '/progress' },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: unreadCounts } = useUnreadMessages();
  const { data: dueCards } = useDueCards();

  const moduleMatch = location.pathname.match(/^\/module\/([^/]+)/);
  const isModulePage = !!moduleMatch;
  const moduleId = moduleMatch?.[1];
  const currentSection = searchParams.get('section') || '';

  const isChapterPage = /^\/module\/[^/]+\/chapter\//.test(location.pathname);

  const isActive = (tab: NavTab) => {
    if (isModulePage || isChapterPage) {
      if (tab.id === 'learning') {
        return ['learning', 'resources', 'interactive', 'practice', 'test', ''].includes(currentSection);
      }
      return currentSection === tab.id;
    }
    if (tab.id === 'dashboard') return location.pathname === '/';
    if (tab.id === 'learning') return location.pathname.startsWith('/year/');
    return location.pathname === tab.globalPath;
  };

  const handleTap = (tab: NavTab) => {
    if (tab.id === 'dashboard') {
      navigate('/');
      return;
    }
    if (isModulePage && moduleId) {
      if (isChapterPage && tab.id === 'learning') {
        navigate(`/module/${moduleId}?section=learning`);
        return;
      }
      navigate(`/module/${moduleId}?section=${tab.id}`);
      return;
    }
    if (tab.globalPath === '__learning__') {
      toast.info('Select a module from the Dashboard to start learning.', { duration: 3000 });
      return;
    }
    navigate(tab.globalPath);
  };

  const totalUnread = (unreadCounts?.announcements ?? 0) + (unreadCounts?.replies ?? 0);
  const dueCount = dueCards?.length ?? 0;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const showConnectBadge = tab.id === 'connect' && totalUnread > 0;
          const showCoachBadge = tab.id === 'coach' && dueCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTap(tab)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-colors relative',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showConnectBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                    {totalUnread}
                  </span>
                )}
                {showCoachBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                    {dueCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
