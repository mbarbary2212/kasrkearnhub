import { ArrowDownAZ, ArrowUpZA, ListOrdered } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type SortMode } from '@/hooks/useChapterSort';

interface SortDropdownProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

export function SortDropdown({ sortMode, onSortChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sort:</span>
      <Select value={sortMode} onValueChange={(v) => onSortChange(v as SortMode)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              <span>Default</span>
            </div>
          </SelectItem>
          <SelectItem value="az">
            <div className="flex items-center gap-2">
              <ArrowDownAZ className="w-4 h-4" />
              <span>A → Z</span>
            </div>
          </SelectItem>
          <SelectItem value="za">
            <div className="flex items-center gap-2">
              <ArrowUpZA className="w-4 h-4" />
              <span>Z → A</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
