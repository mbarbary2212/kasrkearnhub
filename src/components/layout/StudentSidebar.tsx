import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, MessageCircle, ClipboardCheck, GraduationCap,
  Settings, ChevronLeft, ChevronRight, FolderOpen, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_KEY = 'kalmhub:sidebar-collapsed';

interface NavItem {
  label: string;
  icon: React.ElementType;
  sectionId: string;
  globalPath: string;
  skipAutoLogin?: boolean;
  children?: SubNavItem[];
}

interface SubNavItem {
  label: string;
  icon: React.ElementType;
  sectionId: string;
}

export function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Auto-collapse on smaller screens (below md / 768px)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  // Detect route context
  const moduleMatch = location.pathname.match(/^\/module\/([^/]+)/);
  const isModulePage = !!moduleMatch;
  const moduleId = moduleMatch?.[1];

  const chapterMatch = location.pathname.match(/^\/module\/([^/]+)\/chapter\/([^/]+)/);
  const isChapterPage = !!chapterMatch;

  const topicMatch = location.pathname.match(/^\/module\/([^/]+)\/chapter\/([^/]+)\/topic\/([^/]+)/);
  const isTopicPage = !!topicMatch;

  const isChapterOrTopicPage = isChapterPage || isTopicPage;

  // Learning sub-tabs — color-coded like in the chapter page
  const learningSubColors: Record<string, { active: string; icon: string }> = {
    resources:   { active: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300', icon: 'text-blue-500 dark:text-blue-400' },
    interactive: { active: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300', icon: 'text-teal-600 dark:text-teal-400' },
    practice:    { active: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500 dark:text-emerald-400' },
    test:        { active: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300', icon: 'text-violet-500 dark:text-violet-400' },
  };

  // Learning sub-tabs only visible when on chapter/topic page
  const learningSubItems: SubNavItem[] = [
    { label: 'Resources', icon: FolderOpen, sectionId: 'resources' },
    { label: 'Interactive', icon: Sparkles, sectionId: 'interactive' },
    { label: 'Practice', icon: GraduationCap, sectionId: 'practice' },
    { label: 'Test Yourself', icon: ClipboardCheck, sectionId: 'test' },
  ];

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, sectionId: 'dashboard', globalPath: '/' },
    {
      label: 'Learning', icon: BookOpen, sectionId: 'learning', globalPath: '__learning__',
      children: isChapterOrTopicPage ? learningSubItems : undefined,
    },
    { label: 'Connect', icon: MessageCircle, sectionId: 'connect', globalPath: '/connect' },
    { label: 'Formative Assessment', icon: ClipboardCheck, sectionId: 'formative', globalPath: '/formative' },
    { label: 'Study Coach', icon: GraduationCap, sectionId: 'coach', globalPath: '/progress' },
  ];

  const currentSection = searchParams.get('section') || '';

  const isActive = (item: NavItem) => {
    if (isChapterOrTopicPage) {
      // On chapter/topic pages, Learning is active if section is a learning sub-tab or 'learning'
      if (item.sectionId === 'learning') {
        return ['resources', 'interactive', 'practice', 'test', 'learning', ''].includes(currentSection);
      }
      return currentSection === item.sectionId;
    }
    if (isModulePage) {
      const sec = currentSection || 'dashboard';
      return sec === item.sectionId;
    }
    // Global
    if (item.label === 'Dashboard') return location.pathname === '/' && !item.skipAutoLogin;
    if (item.label === 'Learning') return location.pathname.startsWith('/year/');
    return location.pathname === item.globalPath;
  };

  const isSubActive = (sub: SubNavItem) => {
    const sec = currentSection || 'resources';
    return sec === sub.sectionId;
  };

  const handleNav = (item: NavItem) => {
    if (item.sectionId === 'dashboard') {
      navigate('/');
      return;
    }
    if (isModulePage && moduleId) {
      if (isChapterOrTopicPage && item.sectionId === 'learning') {
        navigate(`/module/${moduleId}?section=learning`);
        return;
      }
      navigate(`/module/${moduleId}?section=${item.sectionId}`);
      return;
    }
    // Global context: Learning should not navigate anywhere — show a hint
    if (item.globalPath === '__learning__') {
      toast.info('Select a module from the Dashboard to start learning.', { duration: 3000 });
      return;
    }
    navigate(item.globalPath);
  };

  const handleSubNav = (sub: SubNavItem) => {
    // Update the section param on the current chapter/topic URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('section', sub.sectionId);
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  };

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-border bg-card/50 transition-[width] duration-200 ease-in-out shrink-0 z-30',
        collapsed ? 'w-14' : 'w-52'
      )}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-end p-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const active = isActive(item);
            const hasChildren = !!item.children?.length;

            const btn = (
              <button
                key={item.label}
                onClick={() => handleNav(item)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors relative w-full',
                  'hover:bg-muted hover:text-foreground',
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  collapsed && 'justify-center px-0'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );

            const wrappedBtn = collapsed ? (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : btn;

            if (hasChildren && active) {
              if (collapsed) {
                // Show sub-items as tooltips in collapsed mode
                return (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    {wrappedBtn}
                    {item.children!.map((sub) => {
                      const subActive = isSubActive(sub);
                      const colors = learningSubColors[sub.sectionId];
                      return (
                        <Tooltip key={sub.sectionId}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleSubNav(sub)}
                              className={cn(
                                'flex items-center justify-center rounded-md p-1.5 transition-colors',
                                'hover:bg-muted hover:text-foreground',
                                subActive ? cn(colors?.active, 'font-semibold') : 'text-muted-foreground'
                              )}
                            >
                              <sub.icon className={cn("h-3.5 w-3.5 shrink-0", subActive ? colors?.icon : '')} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">{sub.label}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              }
              return (
                <div key={item.label} className="flex flex-col">
                  {wrappedBtn}
                  <div className="ml-5 pl-2 border-l border-border flex flex-col gap-0.5 mt-0.5 mb-1">
                    {item.children!.map((sub) => {
                      const subActive = isSubActive(sub);
                      const colors = learningSubColors[sub.sectionId];
                      return (
                        <button
                          key={sub.sectionId}
                          onClick={() => handleSubNav(sub)}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                            'hover:bg-muted hover:text-foreground',
                            subActive ? cn(colors?.active, 'font-semibold') : 'text-muted-foreground'
                          )}
                        >
                          <sub.icon className={cn("h-3.5 w-3.5 shrink-0", subActive ? colors?.icon : '')} />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return wrappedBtn;
          })}
        </TooltipProvider>
      </nav>

      {/* Customize Content + Settings pinned to bottom */}
      <div className="px-2 pb-3 mt-auto flex flex-col gap-1">
        <TooltipProvider delayDuration={0}>
          {/* Customize Content */}
          {(() => {
            const active = location.pathname === '/customize-content';
            const custBtn = (
              <button
                onClick={() => navigate('/customize-content')}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors w-full',
                  'hover:bg-muted hover:text-foreground',
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  collapsed && 'justify-center px-0'
                )}
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Customize Content</span>}
              </button>
            );
            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{custBtn}</TooltipTrigger>
                  <TooltipContent side="right">Customize Content</TooltipContent>
                </Tooltip>
              );
            }
            return custBtn;
          })()}

          {/* Settings */}
          {(() => {
            const active = location.pathname === '/student-settings';
            const btn = (
              <button
                onClick={() => navigate('/student-settings')}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors w-full',
                  'hover:bg-muted hover:text-foreground',
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Settings</span>}
              </button>
            );
            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })()}
        </TooltipProvider>
      </div>
    </aside>
  );
}
