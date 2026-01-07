import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RotateCcw, Filter, CheckCircle2, XCircle, Star, BarChart3, ListFilter, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

// Simplified status model: each question has ONE status based on LAST submission
export type QuestionStatus = 'not_seen' | 'attempted' | 'correct' | 'starred';

// Single active filter type - 'all' means show everything
export type ActiveFilter = 'all' | 'notSeen' | 'attempted' | 'correct' | 'starred';

export interface PracticeFilterState {
  notSeen: boolean;
  attempted: boolean;
  correct: boolean;
  starred: boolean;
}

// Default is "All" - all filters on
export const DEFAULT_STUDENT_FILTERS: PracticeFilterState = {
  notSeen: true,
  attempted: true,
  correct: true,
  starred: true,
};

export const ALL_FILTERS_ON: PracticeFilterState = {
  notSeen: true,
  attempted: true,
  correct: true,
  starred: true,
};

interface FilterOption {
  key: ActiveFilter;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { 
    key: 'all', 
    label: 'All', 
    icon: <ListFilter className="h-3.5 w-3.5" />,
    colorClass: 'text-muted-foreground',
  },
  { 
    key: 'notSeen', 
    label: 'Not seen', 
    icon: <Eye className="h-3.5 w-3.5" />,
    colorClass: 'text-muted-foreground',
  },
  { 
    key: 'attempted', 
    label: 'Attempted', 
    icon: <XCircle className="h-3.5 w-3.5" />,
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  { 
    key: 'correct', 
    label: 'Correct', 
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    colorClass: 'text-green-600 dark:text-green-400',
  },
  { 
    key: 'starred', 
    label: 'Starred', 
    icon: <Star className="h-3.5 w-3.5" />,
    colorClass: 'text-amber-500',
  },
];

// Helper to convert PracticeFilterState to single ActiveFilter
export function getActiveFilter(filters: PracticeFilterState): ActiveFilter {
  const allOn = filters.notSeen && filters.attempted && filters.correct && filters.starred;
  if (allOn) return 'all';
  
  if (filters.starred && !filters.notSeen && !filters.attempted && !filters.correct) return 'starred';
  if (filters.correct && !filters.notSeen && !filters.attempted && !filters.starred) return 'correct';
  if (filters.attempted && !filters.notSeen && !filters.correct && !filters.starred) return 'attempted';
  if (filters.notSeen && !filters.attempted && !filters.correct && !filters.starred) return 'notSeen';
  
  return 'all';
}

// Helper to convert ActiveFilter to PracticeFilterState
export function filterStateFromActive(active: ActiveFilter): PracticeFilterState {
  if (active === 'all') {
    return { notSeen: true, attempted: true, correct: true, starred: true };
  }
  return {
    notSeen: active === 'notSeen',
    attempted: active === 'attempted',
    correct: active === 'correct',
    starred: active === 'starred',
  };
}

interface PracticeFiltersProps {
  filters: PracticeFilterState;
  onFiltersChange: (filters: PracticeFilterState) => void;
  /** Optional: resets the student's progress/attempt so counts go back to zero */
  onResetProgress?: () => void;
  counts: Record<keyof PracticeFilterState, number>;
  totalCount: number;
  filteredCount: number;
  questionType: string;
  moduleSlug?: string;
}

export function PracticeFilters({
  filters,
  onFiltersChange,
  onResetProgress,
  counts,
  totalCount,
  filteredCount,
  questionType,
  moduleSlug,
}: PracticeFiltersProps) {
  const activeFilter = useMemo(() => getActiveFilter(filters), [filters]);

  const isDefaultFilters = activeFilter === 'all';

  const handleFilterChange = (value: ActiveFilter) => {
    onFiltersChange(filterStateFromActive(value));
  };

  const handleReset = () => {
    // Always reset back to "All" selection
    onFiltersChange(DEFAULT_STUDENT_FILTERS);
    // If provided, also reset the student's progress/attempt (so counts reset)
    onResetProgress?.();
  };

  // Get count for display
  const getCountForFilter = (key: ActiveFilter): number => {
    if (key === 'all') return totalCount;
    return counts[key as keyof PracticeFilterState] || 0;
  };

  // Get current filter label
  const currentFilterLabel = FILTER_OPTIONS.find(o => o.key === activeFilter)?.label || 'All';

  // Reset button behavior:
  // - If onResetProgress is provided: reset progress (counts) + return to "All" selection
  // - Otherwise: just reset selection to "All"
  const resetLabel = onResetProgress ? 'Reset attempt' : 'Reset';
  const isResetDisabled = !onResetProgress && isDefaultFilters;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Left side: Filter button + count */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              {currentFilterLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show questions</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={isResetDisabled}
                  className={cn(
                    "h-6 px-2 text-xs",
                    isResetDisabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {resetLabel}
                </Button>
              </div>
              
              <RadioGroup value={activeFilter} onValueChange={(v) => handleFilterChange(v as ActiveFilter)}>
                {FILTER_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center justify-between cursor-pointer py-1.5 hover:bg-muted/50 px-1 rounded"
                  >
                    <span className={cn("flex items-center gap-2 text-sm", option.colorClass)}>
                      {option.icon}
                      {option.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{getCountForFilter(option.key)}</span>
                      <RadioGroupItem value={option.key} className="h-4 w-4" />
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredCount}</span>/{totalCount}
        </span>
      </div>

      {/* Right side: Progress link */}
      {moduleSlug && (
        <Link 
          to={`/progress`}
          className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
        >
          <BarChart3 className="h-3 w-3" />
          My Progress
        </Link>
      )}
    </div>
  );
}

/**
 * Helper function to determine question status based on attempt data
 * LAST ATTEMPT WINS model:
 * - not_seen: never submitted
 * - attempted: last submission was incorrect
 * - correct: last submission was correct
 * - starred: manual toggle (independent)
 */
export function getQuestionStatus(
  questionId: string,
  attemptMap: Map<string, { is_correct: boolean | null }>,
  starredIds: Set<string>,
): QuestionStatus {
  const attempt = attemptMap.get(questionId);
  
  // Check starred first (it's independent)
  if (starredIds.has(questionId)) {
    return 'starred';
  }
  
  if (!attempt) {
    return 'not_seen';
  }
  
  // Last attempt wins
  if (attempt.is_correct === true) {
    return 'correct';
  }
  
  // is_correct is false or null (attempted but not correct)
  return 'attempted';
}

/**
 * Get the primary status (not including starred) for filtering purposes
 */
export function getPrimaryStatus(
  questionId: string,
  attemptMap: Map<string, { is_correct: boolean | null }>,
): 'not_seen' | 'attempted' | 'correct' {
  const attempt = attemptMap.get(questionId);
  
  if (!attempt) {
    return 'not_seen';
  }
  
  if (attempt.is_correct === true) {
    return 'correct';
  }
  
  return 'attempted';
}

/**
 * Filter questions based on filter state
 */
export function filterByStatus<T extends { id: string }>(
  questions: T[],
  filters: PracticeFilterState,
  attemptMap: Map<string, { is_correct: boolean | null }>,
  starredIds: Set<string>
): T[] {
  return questions.filter(q => {
    const isStarred = starredIds.has(q.id);
    const primaryStatus = getPrimaryStatus(q.id, attemptMap);
    
    // If starred filter is on and question is starred, show it
    if (filters.starred && isStarred) return true;
    
    // Otherwise check primary status
    if (filters.notSeen && primaryStatus === 'not_seen') return true;
    if (filters.attempted && primaryStatus === 'attempted') return true;
    if (filters.correct && primaryStatus === 'correct') return true;
    
    return false;
  });
}

/**
 * Count questions by status
 */
export function countByStatus(
  questions: { id: string }[],
  attemptMap: Map<string, { is_correct: boolean | null }>,
  starredIds: Set<string>
): Record<keyof PracticeFilterState, number> {
  const counts = {
    notSeen: 0,
    attempted: 0,
    correct: 0,
    starred: starredIds.size,
  };
  
  questions.forEach(q => {
    const primaryStatus = getPrimaryStatus(q.id, attemptMap);
    if (primaryStatus === 'not_seen') counts.notSeen++;
    else if (primaryStatus === 'attempted') counts.attempted++;
    else if (primaryStatus === 'correct') counts.correct++;
  });
  
  return counts;
}
