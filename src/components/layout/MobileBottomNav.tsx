import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useConnect } from '@/contexts/ConnectContext';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, MoreHorizontal,
  MessageCircle, ClipboardCheck, SlidersHorizontal, Settings,
  HelpCircle, MessageSquare, MessagesSquare, Users,
  FileText, Gamepad2, PenLine, ListChecks, BarChart3, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDueCards } from '@/hooks/useFSRS';
import { useLastPosition, buildResumeUrl } from '@/hooks/useLastPosition';
import studyCoachIcon from '@/assets/study-coach-icon.png';

/* ------------------------------------------------------------------ */
/*  Tab / item definitions                                            */
/* ------------------------------------------------------------------ */

interface NavTab {
  id: string;
  label: string;
  icon: React.ElementType | 'coach-img';
  path: string;
  action?: 'learning' | 'connect' | 'more';
  hideForAdmin?: boolean;
  adminOnly?: boolean;
}

const studentTabs: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'learning', label: 'Learning', icon: BookOpen, path: '', action: 'learning' },
  { id: 'connect', label: 'Connect', icon: MessageCircle, path: '', action: 'connect' },
  { id: 'coach', label: 'Coach', icon: 'coach-img', path: '/progress', hideForAdmin: true },
  { id: 'more', label: 'More', icon: MoreHorizontal, path: '', action: 'more' },
];

const adminTabs: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'learning', label: 'Learning', icon: BookOpen, path: '', action: 'learning' },
  { id: 'connect', label: 'Connect', icon: MessageCircle, path: '', action: 'connect' },
  { id: 'overview', label: 'Overview', icon: BarChart3, path: '/admin/overview', adminOnly: true },
  { id: 'more', label: 'More', icon: MoreHorizontal, path: '', action: 'more' },
];

interface SubItem {
  id: string;
  label: string;
  icon: React.ElementType;
  section?: string;
  path?: string;
}

const learningItems: SubItem[] = [
  { id: 'resources', label: 'Resources', icon: FileText, section: 'resources' },
  { id: 'interactive', label: 'Interactive', icon: Gamepad2, section: 'interactive' },
  { id: 'practice', label: 'Practice', icon: PenLine, section: 'practice' },
  { id: 'test', label: 'Test Yourself', icon: ListChecks, section: 'test' },
];

const connectItems = [
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'inquiry', label: 'Ask a Question', icon: HelpCircle },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'discussions', label: 'Discussions', icon: MessagesSquare },
  { id: 'study-groups', label: 'Study Groups', icon: Users },
];

const studentMoreItems: SubItem[] = [
  { id: 'formative', label: 'Formative', icon: ClipboardCheck, path: '/formative' },
  { id: 'customize', label: 'Customize', icon: SlidersHorizontal, path: '/customize-content' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/student-settings' },
];

const adminMoreItems: SubItem[] = [
  { id: 'formative', label: 'Formative', icon: ClipboardCheck, path: '/formative' },
  { id: 'admin-panel', label: 'Admin Panel', icon: Shield, path: '/admin' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/student-settings' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: dueCards } = useDueCards();
  const { data: lastPosition } = useLastPosition();
  const { openConnect } = useConnect();
  const { isAdmin } = useAuthContext();

  const tabs = isAdmin ? adminTabs : studentTabs;
  const moreItems = isAdmin ? adminMoreItems : studentMoreItems;

  // Sheet states — only one open at a time
  const [activeSheet, setActiveSheet] = useState<'learning' | 'connect' | 'more' | null>(null);

  const learningSheetRef = useRef<HTMLDivElement>(null);
  const connectSheetRef = useRef<HTMLDivElement>(null);
  const moreSheetRef = useRef<HTMLDivElement>(null);

  const toggleSheet = useCallback((sheet: 'learning' | 'connect' | 'more') => {
    setActiveSheet(prev => (prev === sheet ? null : sheet));
  }, []);

  // Close sheet on outside click
  useEffect(() => {
    if (!activeSheet) return;
    const refMap = { learning: learningSheetRef, connect: connectSheetRef, more: moreSheetRef };
    const ref = refMap[activeSheet];
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setActiveSheet(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [activeSheet]);

  // Close on route change
  useEffect(() => {
    setActiveSheet(null);
  }, [location.pathname]);

  /* ---- Active-state helpers ---- */

  const isTabActive = useCallback((tab: NavTab) => {
    if (tab.id === 'dashboard') {
      if (isAdmin) return location.pathname === '/admin/dashboard';
      return location.pathname === '/';
    }
    if (tab.id === 'overview') return location.pathname === '/admin/overview';
    if (tab.id === 'learning') {
      if (isAdmin) return location.pathname === '/admin/learning';
      return activeSheet === 'learning' ||
        location.pathname.startsWith('/year/') ||
        location.pathname.startsWith('/module/') ||
        location.pathname === '/learning';
    }
    if (tab.id === 'connect') return activeSheet === 'connect';
    if (tab.id === 'coach') return location.pathname === '/progress';
    if (tab.id === 'more') {
      return activeSheet === 'more' || moreItems.some(m => location.pathname === m.path);
    }
    return false;
  }, [location.pathname, activeSheet, isAdmin, moreItems]);

  const currentSection = searchParams.get('section');

  /* ---- Navigation handlers ---- */

  const handleTap = useCallback((tab: NavTab) => {
    if (tab.action) {
      toggleSheet(tab.action);
      return;
    }
    setActiveSheet(null);
    navigate(tab.path);
  }, [navigate, toggleSheet]);

  const handleLearningItem = useCallback((item: SubItem) => {
    setActiveSheet(null);
    const chapterMatch = location.pathname.match(/^(\/module\/[^/]+\/chapter\/[^/]+)/);
    if (chapterMatch && item.section) {
      navigate(`${chapterMatch[1]}?section=${item.section}`);
      return;
    }
    const moduleMatch = location.pathname.match(/^(\/module\/[^/]+)/);
    if (moduleMatch) {
      navigate(moduleMatch[1]);
      return;
    }
    if (lastPosition) {
      const url = buildResumeUrl(lastPosition);
      navigate(item.section ? `${url}${url.includes('?') ? '&' : '?'}section=${item.section}` : url);
    } else {
      navigate('/', { state: { fromLearning: true } });
    }
  }, [navigate, location.pathname, lastPosition]);

  const handleConnectItem = useCallback((id: string) => {
    setActiveSheet(null);
    openConnect(id as any);
  }, [openConnect]);

  const handleMoreItem = useCallback((item: SubItem) => {
    setActiveSheet(null);
    if (item.path) navigate(item.path);
  }, [navigate]);

  const dueCount = dueCards?.length ?? 0;

  /* ---- Shared sheet styles ---- */
  const sheetClass = "sm:hidden fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-3 right-3 z-50 bg-card/95 backdrop-blur-xl border border-border dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200";

  /* ---- Render ---- */
  return (
    <>
      {/* Backdrop */}
      {activeSheet && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveSheet(null)}
        />
      )}

      {/* Learning sheet */}
      {activeSheet === 'learning' && (
        <div ref={learningSheetRef} className={sheetClass}>
          <div className="flex flex-col gap-0.5">
            {learningItems.map((item) => {
              const Icon = item.icon;
              const active = currentSection === item.section;
              return (
                <button
                  key={item.id}
                  onClick={() => handleLearningItem(item)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left',
                    active
                      ? 'text-primary bg-primary/10 font-semibold'
                      : 'text-foreground active:bg-white/[0.06]'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect sheet */}
      {activeSheet === 'connect' && (
        <div ref={connectSheetRef} className={sheetClass}>
          <div className="flex flex-col gap-0.5">
            {connectItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleConnectItem(item.id)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left text-foreground active:bg-white/[0.06]"
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* More sheet */}
      {activeSheet === 'more' && (
        <div ref={moreSheetRef} className={sheetClass}>
          <div className="flex flex-col gap-0.5">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMoreItem(item)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left',
                    active
                      ? 'text-primary bg-primary/10 font-semibold'
                      : 'text-foreground active:bg-white/[0.06]'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            const isCoachImg = tab.icon === 'coach-img';
            const Icon = isCoachImg ? null : (tab.icon as React.ElementType);
            const showDueBadge = tab.id === 'coach' && dueCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => handleTap(tab)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-all duration-200 relative',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary transition-all duration-200" />
                )}
                <div className="relative">
                  {isCoachImg ? (
                    <img
                      src={studyCoachIcon}
                      alt="Coach"
                      className={cn(
                        'h-5 w-5 rounded-full object-contain transition-opacity duration-200',
                        !active && 'opacity-50'
                      )}
                    />
                  ) : (
                    Icon && <Icon className="h-5 w-5" />
                  )}
                  {showDueBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                      {dueCount}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] leading-tight text-center font-medium transition-all duration-200',
                  active && 'font-semibold'
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
