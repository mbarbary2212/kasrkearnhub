import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageCircle, ClipboardCheck, GraduationCap, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'kalmhub:sidebar-collapsed';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  skipAutoLogin?: boolean;
}

export function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Learning', icon: BookOpen, path: '/', skipAutoLogin: true },
    { label: 'Connect', icon: MessageCircle, path: '/connect' },
    { label: 'Formative Assessment', icon: ClipboardCheck, path: '/formative' },
    { label: 'Study Coach', icon: GraduationCap, path: '/progress' },
  ];

  const isActive = (item: NavItem) => {
    if (item.label === 'Dashboard') return location.pathname === '/' && !item.skipAutoLogin;
    if (item.label === 'Learning') return location.pathname.startsWith('/year/');
    return location.pathname === item.path;
  };

  const handleNav = (item: NavItem) => {
    if (item.skipAutoLogin) {
      sessionStorage.setItem('skipAutoLogin', 'true');
    }
    navigate(item.path);
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-border bg-card/50 transition-[width] duration-200 ease-in-out shrink-0 z-30',
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
      <nav className="flex-1 flex flex-col gap-1 px-2">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const active = isActive(item);
            const btn = (
              <button
                key={item.label}
                onClick={() => handleNav(item)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors relative',
                  'hover:bg-muted hover:text-foreground',
                  active ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  collapsed && 'justify-center px-0'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </TooltipProvider>
      </nav>

      {/* Settings pinned to bottom */}
      <div className="px-2 pb-3 mt-auto">
        <TooltipProvider delayDuration={0}>
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
