import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useConnect } from '@/contexts/ConnectContext';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, MessageCircle, ClipboardCheck, GraduationCap,
  Settings, FolderOpen, Sparkles, SlidersHorizontal, Lock,
  HelpCircle, MessageSquare, MessagesSquare, Users, BarChart3, Shield,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLastPosition, buildResumeUrl } from '@/hooks/useLastPosition';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
interface SubItem {
  label: string;
  icon: React.ElementType;
  id: string;
  description?: string;
}

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  path?: string;
  children?: SubItem[];
  hideForAdmin?: boolean;
  adminOnly?: boolean;
}

// ── Submenu definitions ────────────────────────────────
const learningSubItems: SubItem[] = [
  { label: 'Resources', icon: FolderOpen, id: 'resources', description: 'Videos, notes & materials' },
  { label: 'Interactive', icon: Sparkles, id: 'interactive', description: 'Socratic learning' },
  { label: 'Practice', icon: GraduationCap, id: 'practice', description: 'Questions & drills' },
  { label: 'Test Yourself', icon: ClipboardCheck, id: 'test', description: 'Self-assessment' },
];

const connectSubItems: SubItem[] = [
  { label: 'Messages', icon: MessageCircle, id: 'messages', description: 'Admin messages' },
  { label: 'Ask a Question', icon: HelpCircle, id: 'inquiry', description: 'Submit questions' },
  { label: 'Feedback', icon: MessageSquare, id: 'feedback', description: 'Share your thoughts' },
  { label: 'Open Discussions', icon: MessagesSquare, id: 'discussions', description: 'Public forum' },
  { label: 'Study Groups', icon: Users, id: 'study-groups', description: 'Group learning' },
];

// ── Color coding for Learning sub-items ────────────────
const learningSubColors: Record<string, { active: string; icon: string }> = {
  resources:   { active: 'bg-blue-500/15 text-blue-300', icon: 'text-blue-400' },
  interactive: { active: 'bg-teal-500/15 text-teal-300', icon: 'text-teal-400' },
  practice:    { active: 'bg-emerald-500/15 text-emerald-300', icon: 'text-emerald-400' },
  test:        { active: 'bg-violet-500/15 text-violet-300', icon: 'text-violet-400' },
};

// ── Main nav items ─────────────────────────────────────
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'learning', label: 'Learning', icon: BookOpen, children: learningSubItems },
  { id: 'connect', label: 'Connect', icon: MessageCircle, children: connectSubItems },
  { id: 'formative', label: 'Formative', icon: ClipboardCheck, path: '/formative' },
  { id: 'coach', label: 'Coach', shortLabel: 'Coach', icon: GraduationCap, path: '/progress', hideForAdmin: true },
];

// Bottom items with role-based visibility
const studentBottomItems: NavItem[] = [
  { id: 'customize', label: 'Customize', icon: SlidersHorizontal, path: '/customize-content', hideForAdmin: true },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/student-settings' },
];

const adminBottomItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3, path: '/admin/overview', adminOnly: true },
  { id: 'admin-panel', label: 'Admin', icon: Shield, path: '/admin', adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/student-settings' },
];

// ── Component ──────────────────────────────────────────
export function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuTop, setSubmenuTop] = useState(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { isAdmin, isTeacher, isPlatformAdmin, isSuperAdmin } = useAuthContext();
  const isStudent = !isAdmin && !isTeacher && !isPlatformAdmin && !isSuperAdmin;

  const { data: lastPosition } = useLastPosition();
  const { openConnect } = useConnect();

  // Extract moduleId/chapterId from route for lead avatars
  const routeModuleId = params.moduleId;
  const routeChapterId = params.chapterId;

  // Fetch leads for sidebar (only for students)
  const { data: moduleAdmins } = useModuleAdmins(isStudent ? routeModuleId : undefined);
  const { data: chapterAdmins } = useChapterAdmins(isStudent ? routeChapterId : undefined);

  // Route context
  const chapterMatch = location.pathname.match(/^\/module\/([^/]+)\/chapter\/([^/]+)/);
  const topicMatch = location.pathname.match(/^\/module\/([^/]+)\/chapter\/([^/]+)\/topic\/([^/]+)/);
  const isChapterOrTopicPage = !!chapterMatch || !!topicMatch;
  const currentSection = searchParams.get('section') || '';

  // Determine which items to show based on role
  const filteredNavItems = navItems.filter(item => {
    if (item.hideForAdmin && isAdmin) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const bottomItems = isAdmin ? adminBottomItems : studentBottomItems;

  // Close submenu on route change
  useEffect(() => {
    setActiveSubmenu(null);
  }, [location.pathname, searchParams.toString()]);

  // Click outside to close submenu
  useEffect(() => {
    if (!activeSubmenu) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeSubmenu]);

  // ── Active state detection ───────────────────────────
  const isItemActive = useCallback((item: NavItem) => {
    if (item.id === 'dashboard') {
      if (isAdmin) return location.pathname === '/admin/dashboard';
      return location.pathname === '/';
    }
    if (item.id === 'overview') return location.pathname === '/admin/overview';
    if (item.id === 'admin-panel') return location.pathname === '/admin';
    if (item.id === 'learning') {
      if (isChapterOrTopicPage) return ['resources', 'interactive', 'practice', 'test', 'learning', ''].includes(currentSection);
      return location.pathname.startsWith('/year/') || location.pathname.startsWith('/module/');
    }
    if (item.id === 'connect') return location.pathname.startsWith('/connect/');
    if (item.id === 'formative') return location.pathname === '/formative';
    if (item.id === 'coach') return location.pathname === '/progress';
    if (item.id === 'customize') return location.pathname === '/customize-content';
    if (item.id === 'settings') return location.pathname === '/student-settings';
    return false;
  }, [location.pathname, isChapterOrTopicPage, currentSection, isAdmin]);

  // ── Handle primary nav click ─────────────────────────
  const handleNavClick = useCallback((item: NavItem, el: HTMLButtonElement | null) => {
    // Dashboard for admin goes to admin dashboard
    if (item.id === 'dashboard' && isAdmin) {
      navigate('/admin/dashboard');
      setActiveSubmenu(null);
      return;
    }
    // Direct path items
    if (item.path) {
      navigate(item.path);
      setActiveSubmenu(null);
      return;
    }
    // Learning: if not on a chapter/topic page, navigate to last position or dashboard
    if (item.id === 'learning' && !isChapterOrTopicPage) {
      setActiveSubmenu(null);
      if (lastPosition) {
        navigate(buildResumeUrl(lastPosition));
      } else {
        navigate('/', { state: { fromLearning: true } });
      }
      return;
    }
    // Items with submenus (Learning on chapter page, Connect)
    if (item.children) {
      if (activeSubmenu === item.id) {
        setActiveSubmenu(null);
      } else {
        setActiveSubmenu(item.id);
        if (el) {
          const sidebarRect = sidebarRef.current?.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();
          setSubmenuTop(itemRect.top - (sidebarRect?.top || 0));
        }
      }
    }
  }, [navigate, activeSubmenu, isChapterOrTopicPage, lastPosition, isAdmin]);

  // ── Handle submenu item click ────────────────────────
  const handleSubClick = useCallback((parentId: string, sub: SubItem) => {
    if (parentId === 'learning') {
      if (!isChapterOrTopicPage) {
        if (lastPosition) {
          navigate(buildResumeUrl(lastPosition));
        } else {
          navigate('/', { state: { fromLearning: true } });
        }
        setActiveSubmenu(null);
        return;
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.set('section', sub.id);
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    } else if (parentId === 'connect') {
      if (sub.id === 'discussions') {
        navigate('/connect/discussions');
      } else if (sub.id === 'study-groups') {
        navigate('/connect/groups');
      } else {
        openConnect(sub.id as any);
      }
    }
    setActiveSubmenu(null);
  }, [navigate, isChapterOrTopicPage, lastPosition, searchParams, location.pathname, openConnect]);

  // ── Check if Learning sub-items are disabled ─────────
  const isLearningDisabled = !isChapterOrTopicPage;

  // ── Render a single nav button ───────────────────────
  const renderNavButton = (item: NavItem) => {
    const active = isItemActive(item);
    const isSubmenuOpen = activeSubmenu === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        ref={(el) => { itemRefs.current[item.id] = el; }}
        onClick={(e) => handleNavClick(item, e.currentTarget)}
        className={cn(
          'relative flex flex-col items-center justify-center gap-1.5 w-full py-3 px-1 rounded-xl transition-all duration-200 group',
          'hover:bg-white/[0.06]',
          active && !isSubmenuOpen && 'bg-white/[0.08] text-foreground',
          isSubmenuOpen && 'bg-white/[0.1] text-foreground',
          !active && !isSubmenuOpen && 'text-muted-foreground',
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary transition-all duration-200" />
        )}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="text-[10px] font-medium leading-tight text-center line-clamp-2">
          {item.shortLabel || item.label}
        </span>
      </button>
    );
  };

  // ── Render floating submenu panel ────────────────────
  const renderSubmenu = () => {
    if (!activeSubmenu) return null;
    const allItems = [...filteredNavItems, ...bottomItems];
    const parentItem = allItems.find(i => i.id === activeSubmenu);
    if (!parentItem?.children?.length) return null;

    const isLearning = activeSubmenu === 'learning';
    const disabled = isLearning && isLearningDisabled;

    return (
      <div
        className="absolute left-full ml-2 z-50 w-56 animate-in fade-in slide-in-from-left-2 duration-200"
        style={{ top: `${submenuTop}px` }}
      >
        <div className="bg-card dark:bg-[rgba(10,15,20,0.92)] backdrop-blur-md border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-2 px-1.5">
          {/* Panel header */}
          <div className="px-3 py-2 mb-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {parentItem.label}
            </span>
          </div>

          {/* Sub-items */}
          <div className="flex flex-col gap-0.5">
            {parentItem.children.map((sub) => {
              const SubIcon = sub.icon;
              const colors = isLearning ? learningSubColors[sub.id] : null;
              const isSubActive = isLearning && isChapterOrTopicPage
                ? (currentSection || 'resources') === sub.id
                : false;

              if (disabled) {
                return (
                  <TooltipProvider key={sub.id} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-40 cursor-not-allowed">
                          <SubIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-muted-foreground">{sub.label}</span>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </div>
                            {sub.description && (
                              <span className="text-[11px] text-muted-foreground/50 line-clamp-1">{sub.description}</span>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        Choose a chapter first
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubClick(activeSubmenu, sub)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left',
                    'hover:bg-muted/50',
                    isSubActive
                      ? cn(colors?.active || 'bg-primary/10 text-primary', 'font-semibold')
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <SubIcon className={cn(
                    'h-4 w-4 shrink-0 transition-colors duration-200',
                    isSubActive ? (colors?.icon || 'text-primary') : ''
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{sub.label}</span>
                    {sub.description && (
                      <span className="text-[11px] text-muted-foreground/60 line-clamp-1">{sub.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'hidden sm:flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] sticky top-14 md:top-16 z-30 shrink-0 relative',
        'w-20 sm:w-[88px] md:w-20',
        'bg-card/50 dark:bg-white/[0.02] backdrop-blur-sm border-r border-border dark:border-white/10'
      )}
    >
      <nav className="flex flex-col gap-0.5 px-2 pt-3 pb-2 overflow-y-auto">
        {filteredNavItems.map((item) => renderNavButton(item))}
        <div className="mt-1 flex flex-col gap-0.5">
          {/* Your Team — module/topic leads for students, right above settings */}
          {isStudent && (moduleAdmins?.length || chapterAdmins?.length) ? (
            <div className="px-1.5 py-1.5 space-y-1.5 border-t border-border/50 mt-1 mb-1">
              {moduleAdmins && moduleAdmins.length > 0 && (
                <LeadAvatarStack admins={moduleAdmins} maxVisible={3} avatarSize="h-7 w-7" label="Module" />
              )}
              {chapterAdmins && chapterAdmins.length > 0 && (
                <LeadAvatarStack admins={chapterAdmins} maxVisible={3} avatarSize="h-7 w-7" label="Topic" />
              )}
            </div>
          ) : null}
          {bottomItems.map((item) => renderNavButton(item))}
        </div>
      </nav>

      {renderSubmenu()}
    </aside>
  );
}
