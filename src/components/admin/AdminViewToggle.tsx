import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'table';

interface AdminViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function AdminViewToggle({ viewMode, onViewModeChange, className }: AdminViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 border rounded-md p-0.5", className)}>
      <Button
        variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 px-2 gap-1.5"
        onClick={() => onViewModeChange('cards')}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-xs">Cards</span>
      </Button>
      <Button
        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 px-2 gap-1.5"
        onClick={() => onViewModeChange('table')}
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-xs">Table</span>
      </Button>
    </div>
  );
}
