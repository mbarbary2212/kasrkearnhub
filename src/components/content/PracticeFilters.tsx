import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RotateCcw, Filter, Clock, CheckCircle2, XCircle, Star, BarChart3, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export type QuestionStatus = 'not_seen' | 'in_progress' | 'completed' | 'incorrect' | 'starred';

// Single active filter type - 'all' means show everything
export type ActiveFilter = 'all' | 'notSeen' | 'inProgress' | 'completed' | 'incorrect' | 'starred';

export interface PracticeFilterState {
  notSeen: boolean;
  inProgress: boolean;
  completed: boolean;
  incorrect: boolean;
  starred: boolean;
}

// Default is "All" - all filters on
export const DEFAULT_STUDENT_FILTERS: PracticeFilterState = {
  notSeen: true,
  inProgress: true,
  completed: true,
  incorrect: true,
  starred: true,
};

export const ALL_FILTERS_ON: PracticeFilterState = {
  notSeen: true,
  inProgress: true,
  completed: true,
  incorrect: true,
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
    icon: <ListFilter className="h-3.5 w-3.5" />,
    colorClass: 'text-muted-foreground',
  },
  { 
    key: 'inProgress', 
    label: 'In progress', 
    icon: <Clock className="h-3.5 w-3.5" />,
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  { 
    key: 'completed', 
    label: 'Completed', 
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    colorClass: 'text-green-600 dark:text-green-400',
  },
  { 
    key: 'incorrect', 
    label: 'Needs review', 
    icon: <XCircle className="h-3.5 w-3.5" />,
    colorClass: 'text-destructive',
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
  const allOn = filters.notSeen && filters.inProgress && filters.completed && filters.incorrect && filters.starred;
  if (allOn) return 'all';
  
  if (filters.starred && !filters.notSeen && !filters.inProgress && !filters.completed && !filters.incorrect) return 'starred';
  if (filters.incorrect && !filters.notSeen && !filters.inProgress && !filters.completed && !filters.starred) return 'incorrect';
  if (filters.completed && !filters.notSeen && !filters.inProgress && !filters.incorrect && !filters.starred) return 'completed';
  if (filters.inProgress && !filters.notSeen && !filters.completed && !filters.incorrect && !filters.starred) return 'inProgress';
  if (filters.notSeen && !filters.inProgress && !filters.completed && !filters.incorrect && !filters.starred) return 'notSeen';
  
  return 'all';
}

// Helper to convert ActiveFilter to PracticeFilterState
export function filterStateFromActive(active: ActiveFilter): PracticeFilterState {
  if (active === 'all') {
    return { notSeen: true, inProgress: true, completed: true, incorrect: true, starred: true };
  }
  return {
    notSeen: active === 'notSeen',
    inProgress: active === 'inProgress',
    completed: active === 'completed',
    incorrect: active === 'incorrect',
    starred: active === 'starred',
  };
}

interface PracticeFiltersProps {
  filters: PracticeFilterState;
  onFiltersChange: (filters: PracticeFilterState) => void;
  counts: Record<keyof PracticeFilterState, number>;
  totalCount: number;
  filteredCount: number;
  questionType: string;
  moduleSlug?: string;
}

export function PracticeFilters({
  filters,
  onFiltersChange,
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

  const handleResetFilters = () => {
    onFiltersChange(DEFAULT_STUDENT_FILTERS);
  };

  // Get count for display
  const getCountForFilter = (key: ActiveFilter): number => {
    if (key === 'all') return totalCount;
    return counts[key as keyof PracticeFilterState] || 0;
  };

  // Get current filter label
  const currentFilterLabel = FILTER_OPTIONS.find(o => o.key === activeFilter)?.label || 'All';

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
                  onClick={handleResetFilters}
                  disabled={isDefaultFilters}
                  className={cn(
                    "h-6 px-2 text-xs",
                    isDefaultFilters 
                      ? "text-muted-foreground/50 cursor-not-allowed" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
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
 */
export function getQuestionStatus(
  questionId: string,
  attemptMap: Map<string, { is_correct: boolean | null; score: number | null; status: string }>,
  starredIds: Set<string>,
  questionType: 'mcq' | 'osce' | 'essay' | 'matching'
): QuestionStatus[] {
  const statuses: QuestionStatus[] = [];
  
  // Check if starred
  if (starredIds.has(questionId)) {
    statuses.push('starred');
  }
  
  const attempt = attemptMap.get(questionId);
  
  if (!attempt) {
    // No attempt record = not seen
    statuses.push('not_seen');
    return statuses;
  }
  
  // Has attempt record
  if (attempt.status === 'attempted' || attempt.status === 'unseen') {
    // Partial/in-progress (shouldn't happen often for MCQ, but possible for OSCE/Essay)
    statuses.push('in_progress');
  } else if (attempt.status === 'correct') {
    statuses.push('completed');
  } else if (attempt.status === 'incorrect') {
    // Completed but wrong
    statuses.push('completed');
    statuses.push('incorrect');
  }
  
  // For OSCE: score below threshold (e.g., < 4 out of 5) is "needs review"
  if (questionType === 'osce' && attempt.score !== null && attempt.score < 4) {
    if (!statuses.includes('incorrect')) {
      statuses.push('incorrect');
    }
  }
  
  return statuses;
}

/**
 * Filter questions based on filter state and their statuses
 */
export function filterByStatus<T extends { id: string }>(
  questions: T[],
  filters: PracticeFilterState,
  statusMap: Map<string, QuestionStatus[]>
): T[] {
  return questions.filter(q => {
    const statuses = statusMap.get(q.id) || ['not_seen'];
    
    // Question passes if ANY of its statuses match an enabled filter
    if (filters.starred && statuses.includes('starred')) return true;
    if (filters.notSeen && statuses.includes('not_seen')) return true;
    if (filters.inProgress && statuses.includes('in_progress')) return true;
    if (filters.incorrect && statuses.includes('incorrect')) return true;
    if (filters.completed && statuses.includes('completed') && !statuses.includes('incorrect')) return true;
    
    return false;
  });
}

/**
 * Count questions by status
 */
export function countByStatus(
  statusMap: Map<string, QuestionStatus[]>,
  starredIds: Set<string>,
  totalQuestions: number
): Record<keyof PracticeFilterState, number> {
  const counts = {
    notSeen: 0,
    inProgress: 0,
    completed: 0,
    incorrect: 0,
    starred: starredIds.size,
  };
  
  statusMap.forEach((statuses) => {
    if (statuses.includes('not_seen')) counts.notSeen++;
    if (statuses.includes('in_progress')) counts.inProgress++;
    if (statuses.includes('incorrect')) counts.incorrect++;
    if (statuses.includes('completed') && !statuses.includes('incorrect')) counts.completed++;
  });
  
  return counts;
}
