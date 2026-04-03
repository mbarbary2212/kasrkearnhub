import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface TabOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
}

interface MobileSectionDropdownProps {
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function MobileSectionDropdown({
  tabs,
  activeTab,
  onTabChange,
  className,
}: MobileSectionDropdownProps) {
  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];
  
  if (!activeTabData) return null;

  const ActiveIcon = activeTabData.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg",
            "bg-muted border border-border/50 shadow-sm",
            "text-sm font-medium transition-colors",
            "hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-4 h-4 text-primary" />
            <span>{activeTabData.label}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {activeTabData.count}
            </Badge>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[var(--radix-dropdown-menu-trigger-width)] bg-popover border border-border shadow-lg z-50"
        align="start"
        sideOffset={4}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <DropdownMenuItem
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center justify-between gap-2 py-3 cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn(isActive && "font-medium")}>{tab.label}</span>
              </div>
              {tab.subcounts && tab.subcounts.length > 0 ? (
                <span className="flex items-center gap-0.5">
                  {tab.subcounts.map((sc) => (
                    <Badge key={sc.label} variant={isActive ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]" title={sc.label}>
                      {sc.count}
                    </Badge>
                  )).reduce((prev, curr) => (
                    <>{prev}<span className="text-muted-foreground/50 text-[10px]">/</span>{curr}</>
                  ) as any)}
                </span>
              ) : (
                <Badge variant={isActive ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">
                  {tab.count}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
