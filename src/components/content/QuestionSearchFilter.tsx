import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, X, CalendarDays, BarChart2, Star, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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

export type SortOption = 'display_order' | 'created_at_asc' | 'created_at_desc' | 'difficulty_asc' | 'difficulty_desc';
export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

export interface QuestionSearchFilterState {
  search: string;
  difficulty: DifficultyFilter;
  sortBy: SortOption;
}

export const DEFAULT_QUESTION_FILTER: QuestionSearchFilterState = {
  search: '',
  difficulty: 'all',
  sortBy: 'display_order',
};

// Admin-specific filter options
export interface AdminFilterOptions {
  showMarkedOnly: boolean;
  onShowMarkedOnlyChange: (value: boolean) => void;
  markedCount: number;
  showDuplicatesOnly?: boolean;
  onShowDuplicatesOnlyChange?: (value: boolean) => void;
  duplicatesCount?: number;
  showDeleted: boolean;
  onShowDeletedChange: (value: boolean) => void;
  deletedCount: number;
  showDeletedToggle: boolean;
}

interface QuestionSearchFilterProps {
  filters: QuestionSearchFilterState;
  onFiltersChange: (filters: QuestionSearchFilterState) => void;
  totalCount: number;
  filteredCount: number;
  className?: string;
  /** Admin-specific filters - if provided, shows admin filter options */
  adminFilters?: AdminFilterOptions;
  /** Question type label for display */
  questionType?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Whether to show difficulty filter */
  showDifficultyFilter?: boolean;
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

export function QuestionSearchFilter({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  className,
  adminFilters,
  questionType = 'questions',
  searchPlaceholder = 'Search questions...',
  showDifficultyFilter = true,
}: QuestionSearchFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = useMemo(() => {
    const hasSearchFilters = filters.search !== '' || 
           filters.difficulty !== 'all' || 
           filters.sortBy !== 'display_order';
    
    const hasAdminFilters = adminFilters ? (
      adminFilters.showMarkedOnly || 
      (adminFilters.showDuplicatesOnly ?? false) || 
      adminFilters.showDeleted
    ) : false;
    
    return hasSearchFilters || hasAdminFilters;
  }, [filters, adminFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.difficulty !== 'all') count++;
    if (filters.sortBy !== 'display_order') count++;
    
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

  const handleClearAll = () => {
    onFiltersChange(DEFAULT_QUESTION_FILTER);
    // Also clear admin filters if present
    if (adminFilters) {
      adminFilters.onShowMarkedOnlyChange(false);
      adminFilters.onShowDuplicatesOnlyChange?.(false);
      if (adminFilters.showDeletedToggle) {
        adminFilters.onShowDeletedChange(false);
      }
    }
  };

  const handleClearSearch = () => {
    onFiltersChange({ ...filters, search: '' });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Search Bar - Always visible */}
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
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
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

                {/* Show duplicates - always visible when duplicates feature is enabled */}
                {adminFilters.onShowDuplicatesOnlyChange && !adminFilters.showDeleted && (
                  <label 
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      (adminFilters.duplicatesCount ?? 0) > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={adminFilters.showDuplicatesOnly}
                      onCheckedChange={(checked) => adminFilters.onShowDuplicatesOnlyChange?.(!!checked)}
                      disabled={(adminFilters.duplicatesCount ?? 0) === 0}
                    />
                    <Copy className="h-3.5 w-3.5" />
                    <span>Duplicates ({adminFilters.duplicatesCount ?? 0})</span>
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Helper function to filter questions by search term
export function filterBySearch<T extends { [key: string]: any }>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm.trim()) return items;
  
  const lower = searchTerm.toLowerCase().trim();
  return items.filter(item => 
    searchFields.some(field => {
      const value = item[field];
      return typeof value === 'string' && value.toLowerCase().includes(lower);
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

// Helper function to sort questions
export function sortQuestions<T extends { display_order?: number | null; created_at: string; difficulty?: string | null }>(
  items: T[],
  sortBy: SortOption
): T[] {
  const sorted = [...items];
  
  const difficultyOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  
  switch (sortBy) {
    case 'display_order':
      return sorted.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    case 'created_at_desc':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'created_at_asc':
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'difficulty_asc':
      return sorted.sort((a, b) => (difficultyOrder[a.difficulty || 'medium'] || 2) - (difficultyOrder[b.difficulty || 'medium'] || 2));
    case 'difficulty_desc':
      return sorted.sort((a, b) => (difficultyOrder[b.difficulty || 'medium'] || 2) - (difficultyOrder[a.difficulty || 'medium'] || 2));
    default:
      return sorted;
  }
}
