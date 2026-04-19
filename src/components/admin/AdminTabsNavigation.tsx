import { Shield, BookOpen, MessageSquare, Users, UserPlus, Activity, Settings, Layers, FileText, Sparkles, HelpCircle, BarChart3, Megaphone, Radio, Video, ClipboardList, Timer, Heart } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface GroupDef {
  key: 'system' | 'content' | 'messaging';
  label: string;
  description: string;
  icon: LucideIcon;
  tabs: { value: string; label: string; icon: LucideIcon; visible: boolean }[];
}

interface AdminTabsNavigationProps {
  defaultTab: string;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isModuleAdmin: boolean;
  isTopicAdmin: boolean;
  activeGroup: 'system' | 'content' | 'messaging';
  setActiveGroup: (g: 'system' | 'content' | 'messaging') => void;
}

export function AdminTabsNavigation({
  isSuperAdmin,
  isPlatformAdmin,
  isModuleAdmin,
  isTopicAdmin,
  activeGroup,
  setActiveGroup,
}: AdminTabsNavigationProps) {
  const groups: GroupDef[] = [
    {
      key: 'system',
      label: 'System',
      description: 'Users, roles & settings',
      icon: Shield,
      tabs: [
        { value: 'users', label: 'Users', icon: Users, visible: isSuperAdmin || isPlatformAdmin },
        { value: 'accounts', label: 'Accounts', icon: UserPlus, visible: isSuperAdmin || isPlatformAdmin },
        { value: 'activity-log', label: 'Activity Log', icon: Activity, visible: isSuperAdmin || isPlatformAdmin },
        { value: 'live', label: 'Live', icon: Radio, visible: isSuperAdmin || isPlatformAdmin },
        { value: 'perf-logs', label: 'Performance', icon: Timer, visible: isSuperAdmin || isPlatformAdmin },
        { value: 'settings', label: 'Platform Settings', icon: Settings, visible: isPlatformAdmin },
        { value: 'team-credits', label: 'Team Credits', icon: Heart, visible: isSuperAdmin },
      ],
    },
    {
      key: 'content',
      label: 'Content',
      description: 'Curriculum & resources',
      icon: BookOpen,
      tabs: [
        { value: 'sources', label: 'Curriculum & Sources', icon: Layers, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
        { value: 'help', label: 'Help & Templates', icon: HelpCircle, visible: true },
        { value: 'analytics', label: 'Analytics', icon: BarChart3, visible: isSuperAdmin || isPlatformAdmin || isTopicAdmin },
        { value: 'videos', label: 'Videos', icon: Video, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
        { value: 'ai-settings', label: 'Content Factory', icon: Sparkles, visible: isSuperAdmin },
        { value: 'blueprint', label: 'Assessment Blueprint', icon: ClipboardList, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
      ],
    },
    {
      key: 'messaging',
      label: 'Messaging',
      description: 'Announcements & feedback',
      icon: MessageSquare,
      tabs: [
        { value: 'announcements', label: 'Announcements', icon: Megaphone, visible: isSuperAdmin || isPlatformAdmin },
        { value: 'inbox', label: 'Feedback & Inquiries', icon: MessageSquare, visible: isSuperAdmin || isPlatformAdmin },
      ],
    },
  ];

  const visibleGroups = groups.filter(g => g.tabs.some(t => t.visible));
  const currentGroup = visibleGroups.find(g => g.key === activeGroup) || visibleGroups[0];
  const visibleTabs = currentGroup?.tabs.filter(t => t.visible) || [];

  return (
    <div className="space-y-3">
      {/* Level 1: Group selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {visibleGroups.map((group) => {
          const isActive = group.key === activeGroup;
          const Icon = group.icon;
          const tabCount = group.tabs.filter(t => t.visible).length;

          return (
            <button
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-md shrink-0",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold text-sm",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {group.label}
                  </span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {tabCount}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {group.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Level 2: Sub-tabs */}
      <TabsList className="h-auto gap-1 p-1.5 w-full justify-start flex-wrap">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
