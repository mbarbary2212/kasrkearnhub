import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConnect } from '@/contexts/ConnectContext';
import {
  LayoutDashboard, BookOpen, GraduationCap, MoreHorizontal,
  MessageCircle, ClipboardCheck, SlidersHorizontal, Settings, PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDueCards } from '@/hooks/useFSRS';
import { useLastPosition, buildResumeUrl } from '@/hooks/useLastPosition';
import studyCoachIcon from '@/assets/study-coach-icon.png';

interface NavTab {
  id: string;
  label: string;
  icon: React.ElementType | 'coach-img';
  path: string;
  action?: 'more';
}

const tabs: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'learning', label: 'Learning', icon: BookOpen, path: '/learning' },
  { id: 'practice', label: 'Practice', icon: PenLine, path: '/practice' },
  { id: 'coach', label: 'Coach', icon: 'coach-img', path: '/progress' },
  { id: 'more', label: 'More', icon: MoreHorizontal, path: '', action: 'more' },
];

interface MoreItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const moreItems: MoreItem[] = [
  { id: 'formative', label: 'Formative', icon: ClipboardCheck, path: '/formative' },
  { id: 'customize', label: 'Customize', icon: SlidersHorizontal, path: '/customize-content' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/student-settings' },
];

const connectItems = [
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'inquiry', label: 'Ask a Question', icon: HelpCircle },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'discussions', label: 'Discussions', icon: MessagesSquare },
  { id: 'study-groups', label: 'Study Groups', icon: Users },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: dueCards } = useDueCards();
  const { data: lastPosition } = useLastPosition();
  const [showMore, setShowMore] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { openConnect } = useConnect();

  // Close sheet on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showMore]);

  // Close on route change
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  const isActive = useCallback((tab: NavTab) => {
    if (tab.id === 'dashboard') return location.pathname === '/';
    if (tab.id === 'learning') {
      return location.pathname.startsWith('/year/') ||
        location.pathname.startsWith('/module/') ||
        location.pathname === '/learning';
    }
    if (tab.id === 'practice') return location.pathname === '/practice';
    if (tab.id === 'coach') return location.pathname === '/progress';
    if (tab.id === 'more') {
      return showMore || moreItems.some(m => location.pathname === m.path);
    }
    return false;
  }, [location.pathname, showMore]);

  const isMoreItemActive = useCallback((item: MoreItem) => {
    if (item.id === 'connect') return false; // Connect is now a modal
    return location.pathname === item.path;
  }, [location.pathname]);

  const handleTap = useCallback((tab: NavTab) => {
    if (tab.action === 'more') {
      setShowMore(prev => !prev);
      return;
    }
    setShowMore(false);
    if (tab.id === 'learning') {
      const chapterMatch = location.pathname.match(/^(\/module\/[^/]+\/chapter\/[^/]+)/);
      if (chapterMatch) {
        navigate(`${chapterMatch[1]}?section=resources`);
        return;
      }
      const moduleMatch = location.pathname.match(/^(\/module\/[^/]+)/);
      if (moduleMatch) {
        navigate(moduleMatch[1]);
        return;
      }
      if (lastPosition) {
        navigate(buildResumeUrl(lastPosition));
      } else {
        navigate('/', { state: { fromLearning: true } });
      }
      return;
    }
    navigate(tab.path);
  }, [navigate, location.pathname]);

  const dueCount = dueCards?.length ?? 0;

  return (
    <>
      {/* More sheet backdrop */}
      {showMore && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More sheet */}
      {showMore && (
        <div
          ref={sheetRef}
          className="sm:hidden fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-3 right-3 z-50 bg-card/95 backdrop-blur-xl border border-border dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex flex-col gap-0.5">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isMoreItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'connect') {
                      openConnect('menu');
                      setShowMore(false);
                      return;
                    }
                    navigate(item.path);
                    setShowMore(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left',
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
            const active = isActive(tab);
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
                {/* Top active indicator */}
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
