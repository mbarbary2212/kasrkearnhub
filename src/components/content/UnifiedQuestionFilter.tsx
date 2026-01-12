import { useState, useMemo } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronUp, X, CalendarDays, BarChart2, 
  Star, Copy, Trash2, RotateCcw, CheckCircle2, XCircle, Eye, ListFilter 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============ Types ============

export type SortOption = 'display_order' | 'created_at_asc' | 'created_at_desc' | 'difficulty_asc' | 'difficulty_desc';
export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
export type StatusFilter = 'all' | 'notSeen' | 'attempted' | 'correct' | 'starred';

export interface UnifiedFilterState {
  search: string;
  difficulty: DifficultyFilter;
  sortBy: SortOption;
  status: StatusFilter;
}

export const DEFAULT_UNIFIED_FILTER: UnifiedFilterState = {
  search: '',
  difficulty: 'all',
  sortBy: 'display_order',
  status: 'all',
};

// Admin-specific filter options
export interface AdminFilterOptions {
  showMarkedOnly: boolean;
  onShowMarkedOnlyChange: (value: boolean) => void;
  markedCount: number;
  showDuplicatesOnly: boolean;
  onShowDuplicatesOnlyChange: (value: boolean) => void;
  duplicatesCount: number;
  showDeleted: boolean;
  onShowDeletedChange: (value: boolean) => void;
  deletedCount: number;
  showDeletedToggle: boolean;
}

interface StatusCounts {
  notSeen: number;
  attempted: number;
  correct: number;
  starred: number;
}

interface UnifiedQuestionFilterProps {
  filters: UnifiedFilterState;
  onFiltersChange: (filters: UnifiedFilterState) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
  /** Question type label for display */
  questionType?: string;
  /** Custom search placeholder */
  searchPlaceholder?: string;
  /** Whether to show difficulty filter (default: true) */
  showDifficultyFilter?: boolean;
  /** Whether to show status filter (for student progress tracking) */
  showStatusFilter?: boolean;
  /** Status counts for the status filter */
  statusCounts?: StatusCounts;
  /** Callback to reset progress (also resets status to 'all') */
  onResetProgress?: () => void;
  /** Admin-specific filters - if provided, shows admin filter options */
  adminFilters?: AdminFilterOptions;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon?: React.ReactNode }[] = [
  { value: 'display_order', label: 'Default Order' },
  { value: 'created_at_desc', label: 'Newest First', icon: <CalendarDays className="h-3 w-3" /> },
  { value: 'created_at_asc', label: 'Oldest First', icon: <CalendarDays className="h-3 w-3" /> },
  { value: 'difficulty_asc', label: 'Easy → Hard', icon: <BarChart2 className="h-3 w-3" /> },
  { value: 'difficulty_desc', label: 'Hard → Easy', icon: <BarChart2 className="h-3 w-3" /> },
];

const DIFFICULTY_OPTIONS: { value: DifficultyFilter; label: string; color?: string }[] = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'hard', label: 'Hard', color: 'text-red-600' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string; icon: React.ReactNode; colorClass: string }[] = [
  { key: 'all', label: 'All', icon: <ListFilter className="h-3.5 w-3.5" />, colorClass: 'text-muted-foreground' },
  { key: 'notSeen', label: 'Not seen', icon: <Eye className="h-3.5 w-3.5" />, colorClass: 'text-muted-foreground' },
  { key: 'attempted', label: 'Attempted', icon: <XCircle className="h-3.5 w-3.5" />, colorClass: 'text-amber-600 dark:text-amber-400' },
  { key: 'correct', label: 'Correct', icon: <CheckCircle2 className="h-3.5 w-3.5" />, colorClass: 'text-green-600 dark:text-green-400' },
  { key: 'starred', label: 'Starred', icon: <Star className="h-3.5 w-3.5" />, colorClass: 'text-amber-500' },
];

export function UnifiedQuestionFilter({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  className,
  questionType = 'Question',
  searchPlaceholder = 'Search questions...',
  showDifficultyFilter = true,
  showStatusFilter = false,
  statusCounts,
  onResetProgress,
  adminFilters,
}: UnifiedQuestionFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = useMemo(() => {
    const hasSearchFilters = 
      filters.search !== '' || 
      filters.difficulty !== 'all' || 
      filters.sortBy !== 'display_order' ||
      filters.status !== 'all';
    
    const hasAdminFilters = adminFilters ? (
      adminFilters.showMarkedOnly || 
      adminFilters.showDuplicatesOnly || 
      adminFilters.showDeleted
    ) : false;
    
    return hasSearchFilters || hasAdminFilters;
  }, [filters, adminFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.difficulty !== 'all') count++;
    if (filters.sortBy !== 'display_order') count++;
    if (filters.status !== 'all') count++;
    
    // Count admin filters
    if (adminFilters) {
      if (adminFilters.showMarkedOnly) count++;
      if (adminFilters.showDuplicatesOnly) count++;
      if (adminFilters.showDeleted) count++;
    }
    
    return count;
  }, [filters, adminFilters]);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleDifficultyChange = (value: DifficultyFilter) => {
    onFiltersChange({ ...filters, difficulty: value });
  };

  const handleSortChange = (value: SortOption) => {
    onFiltersChange({ ...filters, sortBy: value });
  };

  const handleStatusChange = (value: StatusFilter) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleClearAll = () => {
    onFiltersChange(DEFAULT_UNIFIED_FILTER);
    // Also clear admin filters if present
    if (adminFilters) {
      adminFilters.onShowMarkedOnlyChange(false);
      adminFilters.onShowDuplicatesOnlyChange(false);
      if (adminFilters.showDeletedToggle) {
        adminFilters.onShowDeletedChange(false);
      }
    }
  };

  const handleClearSearch = () => {
    onFiltersChange({ ...filters, search: '' });
  };

  const handleResetProgress = () => {
    onFiltersChange({ ...filters, status: 'all' });
    onResetProgress?.();
  };

  // Get count for status filter display
  const getCountForStatus = (key: StatusFilter): number => {
    if (key === 'all') return totalCount;
    if (!statusCounts) return 0;
    return statusCounts[key as keyof StatusCounts] || 0;
  };

  // Current status label for display
  const currentStatusLabel = STATUS_OPTIONS.find(o => o.key === filters.status)?.label || 'All';

  return (
    <div className={cn("space-y-2", className)}>
      {/* Search Bar + Filter Toggle - Always visible */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9"
          />
          {filters.search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsible Filter Toggle */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Results count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <span className="font-medium text-foreground">{filteredCount}</span>
          /{totalCount}
        </span>
      </div>

      {/* Collapsible Filter Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border">
            {/* Top row: Status filter (for students) or Difficulty/Sort (for admins) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter for Students */}
              {showStatusFilter && statusCounts && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <RadioGroup 
                      value={filters.status} 
                      onValueChange={(v) => handleStatusChange(v as StatusFilter)}
                      className="flex flex-wrap gap-1"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <label
                          key={option.key}
                          className={cn(
                            "flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-md text-sm transition-colors",
                            filters.status === option.key 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted"
                          )}
                        >
                          <RadioGroupItem value={option.key} className="sr-only" />
                          <span className={cn("flex items-center gap-1", option.colorClass)}>
                            {option.icon}
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({getCountForStatus(option.key)})
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Reset Progress */}
                  {onResetProgress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetProgress}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset attempt
                    </Button>
                  )}

                  <Separator orientation="vertical" className="h-6" />
                </>
              )}

              {/* Difficulty Filter */}
              {showDifficultyFilter && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Difficulty:</span>
                  <Select value={filters.difficulty} onValueChange={(v) => handleDifficultyChange(v as DifficultyFilter)}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={filters.sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-1.5">
                          {opt.icon}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Admin-only filters */}
              {adminFilters && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  
                  {/* Marked for review */}
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={adminFilters.showMarkedOnly}
                      onCheckedChange={(checked) => adminFilters.onShowMarkedOnlyChange(!!checked)}
                    />
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span>Marked ({adminFilters.markedCount})</span>
                  </label>

                  {/* Show duplicates - always visible so admin knows it exists */}
                  {!adminFilters.showDeleted && (
                    <label 
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        adminFilters.duplicatesCount > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={adminFilters.showDuplicatesOnly}
                        onCheckedChange={(checked) => adminFilters.onShowDuplicatesOnlyChange(!!checked)}
                        disabled={adminFilters.duplicatesCount === 0}
                      />
                      <Copy className="h-3.5 w-3.5" />
                      <span>Duplicates ({adminFilters.duplicatesCount})</span>
                    </label>
                  )}

                  {/* Show deleted */}
                  {adminFilters.showDeletedToggle && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={adminFilters.showDeleted}
                        onCheckedChange={(checked) => adminFilters.onShowDeletedChange(!!checked)}
                      />
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      <span>Deleted ({adminFilters.deletedCount})</span>
                    </label>
                  )}
                </>
              )}

              {/* Clear All */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground ml-auto"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============ Helper Functions ============

// Helper function to filter by search term
export function filterBySearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm.trim()) return items;
  
  const lower = searchTerm.toLowerCase().trim();
  return items.filter(item => 
    searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lower);
      }
      return false;
    })
  );
}

// Helper function to filter by difficulty
export function filterByDifficulty<T extends { difficulty?: string | null }>(
  items: T[],
  difficulty: DifficultyFilter
): T[] {
  if (difficulty === 'all') return items;
  return items.filter(item => item.difficulty === difficulty);
}

// Helper function to filter by status
export function filterByStatus<T extends { id: string }>(
  items: T[],
  status: StatusFilter,
  attemptMap: Map<string, { is_correct: boolean | null }>,
  starredIds: Set<string>
): T[] {
  if (status === 'all') return items;
  
  return items.filter(item => {
    const isStarred = starredIds.has(item.id);
    const attempt = attemptMap.get(item.id);
    
    switch (status) {
      case 'starred':
        return isStarred;
      case 'notSeen':
        return !attempt;
      case 'attempted':
        return attempt && attempt.is_correct !== true;
      case 'correct':
        return attempt?.is_correct === true;
      default:
        return true;
    }
  });
}

// Helper function to sort items
export function sortItems<T extends { display_order?: number | null; created_at?: string; difficulty?: string | null }>(
  items: T[],
  sortBy: SortOption
): T[] {
  const sorted = [...items];
  
  const difficultyOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  
  switch (sortBy) {
    case 'display_order':
      return sorted.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    case 'created_at_desc':
      return sorted.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
    case 'created_at_asc':
      return sorted.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      });
    case 'difficulty_asc':
      return sorted.sort((a, b) => (difficultyOrder[a.difficulty || 'medium'] || 2) - (difficultyOrder[b.difficulty || 'medium'] || 2));
    case 'difficulty_desc':
      return sorted.sort((a, b) => (difficultyOrder[b.difficulty || 'medium'] || 2) - (difficultyOrder[a.difficulty || 'medium'] || 2));
    default:
      return sorted;
  }
}

// Helper function to count by status
export function countByStatus(
  items: { id: string }[],
  attemptMap: Map<string, { is_correct: boolean | null }>,
  starredIds: Set<string>
): { notSeen: number; attempted: number; correct: number; starred: number } {
  const counts = {
    notSeen: 0,
    attempted: 0,
    correct: 0,
    starred: starredIds.size,
  };
  
  items.forEach(item => {
    const attempt = attemptMap.get(item.id);
    if (!attempt) {
      counts.notSeen++;
    } else if (attempt.is_correct === true) {
      counts.correct++;
    } else {
      counts.attempted++;
    }
  });
  
  return counts;
}
