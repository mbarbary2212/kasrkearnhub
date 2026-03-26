import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, MessageCircle, ClipboardCheck, GraduationCap,
  FolderOpen, Sparkles, ChevronUp,
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

const chapterSections = [
  { id: 'resources', label: 'Resources', icon: FolderOpen },
  { id: 'interactive', label: 'Interactive', icon: Sparkles },
  { id: 'practice', label: 'Practice', icon: GraduationCap },
  { id: 'test', label: 'Test', icon: ClipboardCheck },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: unreadCounts } = useUnreadMessages();
  const { data: dueCards } = useDueCards();
  const [showSectionOverlay, setShowSectionOverlay] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const moduleMatch = location.pathname.match(/^\/module\/([^/]+)/);
  const isModulePage = !!moduleMatch;
  const moduleId = moduleMatch?.[1];
  const currentSection = searchParams.get('section') || '';

  const isChapterPage = /^\/module\/[^/]+\/chapter\//.test(location.pathname);

  // Close overlay on outside click
  useEffect(() => {
    if (!showSectionOverlay) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setShowSectionOverlay(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showSectionOverlay]);

  // Close overlay on route change
  useEffect(() => {
    setShowSectionOverlay(false);
  }, [location.pathname, currentSection]);

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

  const handleTap = useCallback((tab: NavTab) => {
    if (tab.id === 'dashboard') {
      navigate('/');
      return;
    }
    // On chapter page, Learning tab toggles the section overlay
    if (tab.id === 'learning' && isChapterPage) {
      setShowSectionOverlay(prev => !prev);
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
  }, [navigate, isChapterPage, isModulePage, moduleId]);

  const handleSectionSelect = useCallback((sectionId: string) => {
    const chapterMatch = location.pathname.match(/^(\/module\/[^/]+\/chapter\/[^/]+)/);
    if (chapterMatch) {
      navigate(`${chapterMatch[1]}?section=${sectionId}`);
    }
    setShowSectionOverlay(false);
  }, [navigate, location.pathname]);

  const totalUnread = (unreadCounts?.announcements ?? 0) + (unreadCounts?.replies ?? 0);
  const dueCount = dueCards?.length ?? 0;
  const activeChapterSection = currentSection || 'resources';

  return (
    <>
      {/* Section overlay — only on chapter pages */}
      {showSectionOverlay && isChapterPage && (
        <div
          ref={overlayRef}
          className="sm:hidden fixed bottom-[calc(52px+env(safe-area-inset-bottom))] left-3 right-3 z-50 bg-card/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex justify-around">
            {chapterSections.map((section) => {
              const Icon = section.icon;
              const isSectionActive = activeChapterSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionSelect(section.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl transition-colors min-w-[56px]',
                    isSectionActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground active:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className={cn('text-[10px] font-medium', isSectionActive && 'font-semibold')}>
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            const showConnectBadge = tab.id === 'connect' && totalUnread > 0;
            const showCoachBadge = tab.id === 'coach' && dueCount > 0;
            const isLearningOnChapter = tab.id === 'learning' && isChapterPage;

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
                  {/* Pulse ring hint when on chapter page */}
                  {isLearningOnChapter && (
                    <span className="absolute -inset-1.5 rounded-full bg-primary/20 animate-subtle-pulse" />
                  )}
                  <Icon className="h-5 w-5 relative z-10" />
                  {/* Chevron hint */}
                  {isLearningOnChapter && (
                    <ChevronUp className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-3 w-3 text-primary z-10" />
                  )}
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
    </>
  );
}
