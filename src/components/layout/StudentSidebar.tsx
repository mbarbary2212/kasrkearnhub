import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useConnect } from '@/contexts/ConnectContext';
import { AppCredits } from '@/components/layout/AppCredits';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, MessageCircle, ClipboardCheck, GraduationCap,
  Settings, FolderOpen, Sparkles,
  HelpCircle, MessageSquare, MessagesSquare, Users, BarChart3, Shield,
  BookOpenCheck, ChevronDown, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLastPosition, buildResumeUrl } from '@/hooks/useLastPosition';

// ── Storage key ────────────────────────────────────────
const COLLAPSED_KEY = 'kalmhub:sidebar-collapsed';

// ── Types ──────────────────────────────────────────────
interface SubItem {
  label: string;
  icon: React.ElementType;
  id: string;
  description?: string;
}

// ── Submenu definitions ────────────────────────────────
const learningSubItems: SubItem[] = [
  { label: 'Resources', icon: FolderOpen, id: 'resources' },
  { label: 'Interactive', icon: Sparkles, id: 'interactive' },
  { label: 'Practice', icon: GraduationCap, id: 'practice' },
  { label: 'Test Yourself', icon: ClipboardCheck, id: 'test' },
];

const connectSubItems: SubItem[] = [
  { label: 'Messages', icon: MessageCircle, id: 'messages' },
  { label: 'Ask a Question', icon: HelpCircle, id: 'inquiry' },
  { label: 'Feedback', icon: MessageSquare, id: 'feedback' },
  { label: 'Discussions', icon: MessagesSquare, id: 'discussions' },
  { label: 'Study Groups', icon: Users, id: 'study-groups' },
];

// ── Color coding for Learning sub-items ────────────────
const learningSubColors: Record<string, { active: string; icon: string }> = {
  resources:   { active: 'bg-blue-500/15 text-blue-300', icon: 'text-blue-400' },
  interactive: { active: 'bg-teal-500/15 text-teal-300', icon: 'text-teal-400' },
  practice:    { active: 'bg-emerald-500/15 text-emerald-300', icon: 'text-emerald-400' },
  test:        { active: 'bg-violet-500/15 text-violet-300', icon: 'text-violet-400' },
};

// ── Component ──────────────────────────────────────────
export function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;

  const { data: lastPosition } = useLastPosition();
  const { openConnect } = useConnect();

  const [collapsed, setCollapsed] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  // Route context
  const chapterMatch = location.pathname.match(/^\/module\/([^/]+)\/chapter\/([^/]+)/);
  const topicMatch = location.pathname.match(/^\/module\/([^/]+)\/chapter\/([^/]+)\/topic\/([^/]+)/);
  const isChapterOrTopicPage = !!chapterMatch || !!topicMatch;
  const currentSection = searchParams.get('section') || '';

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Active state detection ───────────────────────────
  const isLearningActive = isChapterOrTopicPage
    ? ['resources', 'interactive', 'practice', 'test', 'learning', ''].includes(currentSection)
    : location.pathname.startsWith('/year/') || location.pathname.startsWith('/module/');

  const isConnectActive = location.pathname.startsWith('/connect/');

  const isActive = useCallback((id: string) => {
    if (id === 'dashboard') return isAdmin ? location.pathname === '/admin/dashboard' : location.pathname === '/';
    if (id === 'learning') return isLearningActive;
    if (id === 'connect') return isConnectActive;
    if (id === 'formative') return location.pathname === '/formative';
    if (id === 'coach') return location.pathname === '/progress';
    if (id === 'settings') return location.pathname === '/student-settings';
    if (id === 'overview') return location.pathname === '/admin/overview';
    if (id === 'admin-panel') return location.pathname === '/admin';
    return false;
  }, [location.pathname, isLearningActive, isConnectActive, isAdmin]);

  const isLearnSubActive = useCallback((subId: string) => {
    if (!isChapterOrTopicPage) return false;
    return (currentSection || 'resources') === subId;
  }, [isChapterOrTopicPage, currentSection]);

  // ── Navigation handlers ──────────────────────────────
  const goTo = useCallback((path: string) => navigate(path), [navigate]);

  const handleDashboard = useCallback(() => {
    navigate(isAdmin ? '/admin/dashboard' : '/');
  }, [navigate, isAdmin]);

  const handleLearningRoot = useCallback(() => {
    if (!isChapterOrTopicPage) {
      if (lastPosition) navigate(buildResumeUrl(lastPosition));
      else navigate('/', { state: { fromLearning: true } });
    }
  }, [navigate, isChapterOrTopicPage, lastPosition]);

  const handleLearningSub = useCallback((subId: string) => {
    if (!isChapterOrTopicPage) {
      handleLearningRoot();
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set('section', subId);
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  }, [navigate, isChapterOrTopicPage, handleLearningRoot, searchParams, location.pathname]);

  const handleConnectSub = useCallback((subId: string) => {
    if (subId === 'discussions') navigate('/connect/discussions');
    else if (subId === 'study-groups') navigate('/connect/groups');
    else openConnect(subId as any);
  }, [navigate, openConnect]);

  const handleGuide = useCallback(() => {
    window.dispatchEvent(new CustomEvent('kalm:open-workflow'));
  }, []);

  const handleStartTour = useCallback(() => {
    // Clear "seen" flag so it always replays from this entry point
    try {
      localStorage.removeItem(isAdmin ? 'kalm_tour_admin_done' : 'kalm_tour_student_done');
    } catch {}
    const onHome = location.pathname === '/' || location.pathname === '/admin/dashboard';
    if (!onHome) {
      navigate(isAdmin ? '/admin/dashboard' : '/');
      setTimeout(() => window.dispatchEvent(new CustomEvent('kalm:start-tour')), 400);
    } else {
      window.dispatchEvent(new CustomEvent('kalm:start-tour'));
    }
  }, [isAdmin, navigate, location.pathname]);

  // ── Render helpers ───────────────────────────────────
  const NavButton = ({ id, icon: Icon, label, onClick, badge }: {
    id: string; icon: React.ElementType; label: string; onClick: () => void; badge?: React.ReactNode;
  }) => {
    const active = isActive(id);
    const btn = (
      <button
        data-tour={id}
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-3 w-full rounded-lg transition-all duration-200 group',
          collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
          'hover:bg-white/[0.06]',
          active ? 'bg-white/[0.08] text-foreground font-medium' : 'text-muted-foreground',
        )}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="text-sm truncate">{label}</span>}
        {!collapsed && badge}
      </button>
    );
    if (collapsed) {
      return (
        <TooltipProvider key={id} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return btn;
  };

  // ── Render ───────────────────────────────────────────
  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col shrink-0 h-full border-r transition-[width] duration-200',
        'bg-card/50 dark:bg-white/[0.02] backdrop-blur-sm border-border dark:border-white/10',
        collapsed ? 'w-[60px]' : 'w-[200px]',
      )}
    >
      {/* Collapse toggle */}
      <div className={cn('flex items-center border-b border-border/50 px-2 py-2', collapsed ? 'justify-center' : 'justify-end')}>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-col flex-1 min-h-0 overflow-y-auto px-2 py-3 gap-0.5">
        {/* Dashboard */}
        <NavButton id="dashboard" icon={LayoutDashboard} label="Dashboard" onClick={handleDashboard} />

        {/* Coach — student only */}
        {!isAdmin && (
          <NavButton id="coach" icon={GraduationCap} label="Coach" onClick={() => goTo('/progress')} />
        )}

        {/* Learning — always expanded */}
        <NavButton id="learning" icon={BookOpen} label="Learning" onClick={handleLearningRoot} />
        <div className={cn('flex flex-col gap-0.5', collapsed ? 'items-center' : 'ml-4 pl-2 border-l border-border/30')}>
          {learningSubItems.map(sub => {
            const SubIcon = sub.icon;
            const subActive = isLearnSubActive(sub.id);
            const colors = learningSubColors[sub.id];
            const disabled = !isChapterOrTopicPage;

            if (collapsed) {
              return (
                <TooltipProvider key={sub.id} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !disabled && handleLearningSub(sub.id)}
                        className={cn(
                          'p-2 rounded-md transition-colors',
                          disabled && 'opacity-30 cursor-not-allowed',
                          subActive ? cn(colors.active) : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]',
                        )}
                        disabled={disabled}
                      >
                        <SubIcon className={cn('h-4 w-4', subActive && colors.icon)} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {sub.label}{disabled ? ' (choose a chapter first)' : ''}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return (
              <button
                key={sub.id}
                onClick={() => !disabled && handleLearningSub(sub.id)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors w-full text-left',
                  disabled && 'opacity-30 cursor-not-allowed',
                  subActive ? cn(colors.active, 'font-medium') : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]',
                )}
              >
                <SubIcon className={cn('h-4 w-4 shrink-0', subActive && colors.icon)} />
                <span className="truncate">{sub.label}</span>
              </button>
            );
          })}
        </div>

        {/* Connect — with chevron */}
        <NavButton
          id="connect"
          icon={MessageCircle}
          label="Connect"
          onClick={() => collapsed ? goTo('/connect/discussions') : setConnectOpen(o => !o)}
          badge={
            !collapsed ? (
              <ChevronDown className={cn('h-3.5 w-3.5 ml-auto transition-transform', connectOpen && 'rotate-180')} />
            ) : undefined
          }
        />
        {connectOpen && !collapsed && (
          <div className="flex flex-col gap-0.5 ml-4 pl-2 border-l border-border/30">
            {connectSubItems.map(sub => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleConnectSub(sub.id)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors w-full text-left"
                >
                  <SubIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Formative — direct nav */}
        <NavButton id="formative" icon={ClipboardCheck} label="Formative" onClick={() => goTo('/formative')} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin items */}
        {isAdmin && (
          <>
            <NavButton id="overview" icon={BarChart3} label="Overview" onClick={() => goTo('/admin/overview')} />
            <NavButton id="admin-panel" icon={Shield} label="Admin" onClick={() => goTo('/admin')} />
          </>
        )}

        {/* Settings */}
        <NavButton id="settings" icon={Settings} label="Settings" onClick={() => goTo('/student-settings')} />

        {/* Guide (merged Tour + Guide) */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              data-tour="how-to-use"
              className={cn(
                'relative flex items-center gap-3 w-full rounded-lg transition-all duration-200 group',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                'hover:bg-white/[0.06] text-muted-foreground',
              )}
              aria-label="Guide"
            >
              <BookOpenCheck className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-sm truncate">Guide</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-56 p-1">
            <button
              onClick={handleStartTour}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-white/[0.06] transition-colors text-left"
            >
              <BookOpenCheck className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span>Take a tour</span>
                <span className="text-[10px] text-muted-foreground">Spotlight walkthrough</span>
              </div>
            </button>
            <button
              onClick={handleGuide}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-white/[0.06] transition-colors text-left"
            >
              <HelpCircle className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span>How to use KALM</span>
                <span className="text-[10px] text-muted-foreground">Open the full guide</span>
              </div>
            </button>
          </PopoverContent>
        </Popover>

        {/* Credit watermark */}
        <AppCredits collapsed={collapsed} />
      </nav>
    </aside>
  );
}
