import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  calculatePerformance,
  calculateImprovement,
  calculateReadiness,
  getEmptyReadinessResult,
  type ReadinessResult,
  type ReadinessComponents,
} from '@/lib/readinessCalculator';

export interface ChapterStatus {
  id: string;
  title: string;
  chapterNumber: number;
  bookLabel: string | null;
  moduleId: string;
  moduleName: string;
  status: 'completed' | 'in_progress' | 'not_started';
  progress: number;
  totalItems: number;
  completedItems: number;
}

export interface DashboardInsight {
  type: 'strong' | 'attention' | 'missed';
  label: string;
  detail?: string;
}

export interface SuggestedItem {
  type: 'read' | 'mcq' | 'video' | 'essay';
  title: string;
  chapterTitle?: string;
  estimatedMinutes?: number;
  chapterId?: string;
  moduleId?: string;
}

export interface DashboardData {
  // Core metrics
  examReadiness: number;
  coveragePercent: number;
  coverageCompleted: number; // completed items count
  coverageTotal: number; // total items count
  chaptersStarted: number;
  chaptersTotal: number;
  studyStreak: number;
  consistencyScore: number;
  
  // Enhanced readiness data
  readinessResult: ReadinessResult;
  performanceScore: number;
  improvementScore: number;
  
  // Weekly stats
  weeklyTimeMinutes: number;
  weeklyChaptersAdvanced: number;
  hasRealAccuracyData: boolean; // flag to control UI display
  
  // Chapters
  chapters: ChapterStatus[];
  
  // Insights
  insights: DashboardInsight[];
  
  // Today's suggestions
  suggestions: SuggestedItem[];
  
  // Selected context
  selectedModuleName?: string;
  selectedYearName?: string;
}

interface DashboardFilters {
  yearId?: string;
  moduleId?: string;
}

export function useStudentDashboard(filters?: DashboardFilters) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['student-dashboard', user?.id, filters?.yearId, filters?.moduleId],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) {
        return getEmptyDashboard();
      }

      // Build queries with filters
      let modulesQuery = supabase.from('modules').select('id, name, year_id').eq('is_published', true);
      
      // If yearId is set, filter modules by year
      if (filters?.yearId) {
        modulesQuery = modulesQuery.eq('year_id', filters.yearId);
      }

      // Fetch modules first to get the list
      const modulesRes = await modulesQuery;
      const modules = modulesRes.data || [];
      
      // Get module IDs to filter chapters
      let moduleIds = modules.map(m => m.id);
      
      // If specific module is selected, use only that
      if (filters?.moduleId) {
        moduleIds = [filters.moduleId];
      }

      // If no modules match the filter, return empty
      if (moduleIds.length === 0) {
        return getEmptyDashboard();
      }

      // Fetch chapters filtered by module IDs
      const chaptersQuery = supabase
        .from('module_chapters')
        .select('id, title, chapter_number, book_label, module_id')
        .in('module_id', moduleIds)
        .order('order_index');

      // Fetch all data in parallel
      const [
        chaptersRes,
        userProgressRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        caseScenariosRes,
        lecturesRes,
        yearRes,
        // Fetch question attempts for performance calculation
        questionAttemptsRes,
      ] = await Promise.all([
        chaptersQuery,
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('mcqs').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('essays').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('practicals').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('case_scenarios').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('lectures').select('id, chapter_id, title, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        filters?.yearId ? supabase.from('years').select('name').eq('id', filters.yearId).single() : null,
        // Get question attempts for this user
        supabase
          .from('question_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const chapters = chaptersRes.data || [];
      const userProgress = userProgressRes.data || [];
      const mcqs = mcqsRes.data || [];
      const essays = essaysRes.data || [];
      const practicals = practicalsRes.data || [];
      const caseScenarios = caseScenariosRes.data || [];
      const lectures = lecturesRes.data || [];
      const questionAttempts = questionAttemptsRes.data || [];

      // Create module lookup
      const moduleMap = new Map(modules.map(m => [m.id, m.name]));

      // Create completed content set
      const completedIds = new Set(
        userProgress.filter(p => p.completed).map(p => p.content_id)
      );

      // Calculate chapter statuses
      const chapterStatuses: ChapterStatus[] = chapters.map(chapter => {
        const chapterMcqs = mcqs.filter(m => m.chapter_id === chapter.id);
        const chapterEssays = essays.filter(e => e.chapter_id === chapter.id);
        const chapterPracticals = practicals.filter(p => p.chapter_id === chapter.id);
        const chapterCases = caseScenarios.filter(c => c.chapter_id === chapter.id);

        const practiceIds = [
          ...chapterMcqs.map(m => m.id),
          ...chapterEssays.map(e => e.id),
          ...chapterPracticals.map(p => p.id),
          ...chapterCases.map(c => c.id),
        ];

        const totalItems = practiceIds.length;
        const completedItems = practiceIds.filter(id => completedIds.has(id)).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
        if (progress === 100 && totalItems > 0) {
          status = 'completed';
        } else if (completedItems > 0) {
          status = 'in_progress';
        }

        return {
          id: chapter.id,
          title: chapter.title,
          chapterNumber: chapter.chapter_number,
          bookLabel: chapter.book_label,
          moduleId: chapter.module_id,
          moduleName: moduleMap.get(chapter.module_id) || 'Unknown Module',
          status,
          progress,
          totalItems,
          completedItems,
        };
      });

      // Calculate content IDs set for module scoping
      const contentIds = new Set([
        ...mcqs.map(m => m.id),
        ...essays.map(e => e.id),
        ...practicals.map(p => p.id),
        ...caseScenarios.map(c => c.id),
      ]);

      // Calculate overall metrics - ITEM-BASED coverage
      const totalItems = chapterStatuses.reduce((sum, c) => sum + c.totalItems, 0);
      const completedItems = chapterStatuses.reduce((sum, c) => sum + c.completedItems, 0);
      const coveragePercent = totalItems > 0 
        ? Math.round((completedItems / totalItems) * 100) 
        : 0;

      // Chapter counts for secondary display
      const chaptersWithContent = chapterStatuses.filter(c => c.totalItems > 0);
      const chaptersStarted = chaptersWithContent.filter(c => c.status !== 'not_started').length;
      const chaptersTotal = chaptersWithContent.length;

      // Calculate study streak (days with activity in user_progress)
      const studyStreak = calculateStudyStreak(userProgress);
      
      // Calculate consistency score (0-100) based on recent activity
      const consistencyScore = calculateConsistencyScore(userProgress, contentIds);

      // ============================================================================
      // NEW: Calculate Performance Score using unified readiness calculator
      // ============================================================================
      
      // MCQ stats
      const mcqAttempts = questionAttempts.filter(a => a.question_type === 'mcq');
      const mcqCorrect = mcqAttempts.filter(a => a.is_correct).length;
      const mcqAccuracy = mcqAttempts.length > 0 ? (mcqCorrect / mcqAttempts.length) * 100 : 0;

      // OSCE stats
      const osceAttempts = questionAttempts.filter(a => a.question_type === 'osce');
      const osceScores = osceAttempts
        .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
        .filter(s => s > 0);
      const osceAvgScore = osceScores.length > 0
        ? osceScores.reduce((sum, s) => sum + s, 0) / osceScores.length
        : 0;

      // Concept Check stats
      const conceptCheckAttempts = questionAttempts.filter(a => a.question_type === 'guided_explanation');
      const conceptCheckPassed = conceptCheckAttempts.filter(a => a.is_correct).length;
      const conceptCheckTotal = conceptCheckAttempts.length;
      const conceptCheckPassRate = conceptCheckTotal > 0
        ? (conceptCheckPassed / conceptCheckTotal) * 100
        : 0;

      // Calculate performance score
      const performanceScore = calculatePerformance({
        mcq: { accuracy: mcqAccuracy, attempts: mcqAttempts.length },
        osce: { avgScore: osceAvgScore, attempts: osceAttempts.length },
        conceptCheck: { passRate: conceptCheckPassRate, total: conceptCheckTotal },
      });

      // ============================================================================
      // NEW: Calculate Improvement Score using attempt-based data
      // ============================================================================
      
      const RECENT_MCQ_ATTEMPTS = 10;
      const RECENT_OSCE_ATTEMPTS = 5;

      const recentMcqAttempts = mcqAttempts.slice(0, RECENT_MCQ_ATTEMPTS);
      const priorMcqAttempts = mcqAttempts.slice(RECENT_MCQ_ATTEMPTS, RECENT_MCQ_ATTEMPTS * 2);
      
      const mcqRecentData = recentMcqAttempts.map(a => ({
        correct: a.is_correct ? 1 : 0,
        total: 1,
      }));
      const mcqPriorData = priorMcqAttempts.map(a => ({
        correct: a.is_correct ? 1 : 0,
        total: 1,
      }));

      const osceRecentScores = osceAttempts.slice(0, RECENT_OSCE_ATTEMPTS)
        .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
        .filter(s => s > 0);
      const oscePriorScores = osceAttempts.slice(RECENT_OSCE_ATTEMPTS, RECENT_OSCE_ATTEMPTS * 2)
        .map(a => (a.selected_answer as { score?: number } | null)?.score ?? 0)
        .filter(s => s > 0);

      const improvementScore = calculateImprovement({
        mcqRecent: mcqRecentData,
        mcqPrior: mcqPriorData,
        osceRecent: osceRecentScores,
        oscePrior: oscePriorScores,
      });

      // ============================================================================
      // NEW: Calculate Final Readiness using unified formula with caps
      // ============================================================================
      
      const readinessComponents: ReadinessComponents = {
        coverage: coveragePercent,
        performance: performanceScore,
        improvement: improvementScore,
        consistency: consistencyScore,
      };

      const readinessResult = calculateReadiness(readinessComponents);
      const examReadiness = readinessResult.examReadiness;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyProgress = userProgress.filter(p => 
        p.completed_at && 
        new Date(p.completed_at) >= weekAgo &&
        contentIds.has(p.content_id)
      );
      
      // Estimate time based on completed items (rough estimate: 5 min per item)
      const weeklyTimeMinutes = weeklyProgress.length * 5;
      
      // Count unique chapters advanced this week
      const weeklyChaptersAdvanced = new Set(
        weeklyProgress
          .map(p => {
            const mcq = mcqs.find(m => m.id === p.content_id);
            if (mcq) return mcq.chapter_id;
            const essay = essays.find(e => e.id === p.content_id);
            if (essay) return essay.chapter_id;
            const practical = practicals.find(pr => pr.id === p.content_id);
            if (practical) return practical.chapter_id;
            const cs = caseScenarios.find(c => c.id === p.content_id);
            if (cs) return cs.chapter_id;
            return null;
          })
          .filter(Boolean)
      ).size;

      // Generate insights
      const insights = generateInsights(chapterStatuses);

      // Generate suggestions (book-first approach)
      const suggestions = generateSuggestions(chapterStatuses, lectures);

      // Get selected module name
      const selectedModuleName = filters?.moduleId 
        ? moduleMap.get(filters.moduleId) 
        : undefined;

      // Determine if we have real accuracy data
      const hasRealAccuracyData = mcqAttempts.length > 0 || osceAttempts.length > 0;

      return {
        examReadiness,
        coveragePercent,
        coverageCompleted: completedItems,
        coverageTotal: totalItems,
        chaptersStarted,
        chaptersTotal,
        studyStreak,
        consistencyScore,
        readinessResult,
        performanceScore,
        improvementScore,
        weeklyTimeMinutes,
        weeklyChaptersAdvanced,
        hasRealAccuracyData,
        chapters: chapterStatuses,
        insights,
        suggestions,
        selectedModuleName,
        selectedYearName: yearRes?.data?.name,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });
}

function getEmptyDashboard(): DashboardData {
  return {
    examReadiness: 0,
    coveragePercent: 0,
    coverageCompleted: 0,
    coverageTotal: 0,
    chaptersStarted: 0,
    chaptersTotal: 0,
    studyStreak: 0,
    consistencyScore: 0,
    readinessResult: getEmptyReadinessResult(),
    performanceScore: 0,
    improvementScore: 50,
    weeklyTimeMinutes: 0,
    weeklyChaptersAdvanced: 0,
    hasRealAccuracyData: false,
    chapters: [],
    insights: [],
    suggestions: [],
  };
}

function calculateConsistencyScore(
  userProgress: { completed_at: string | null; content_id: string }[],
  moduleContentIds: Set<string>
): number {
  // Filter to module-specific progress
  const moduleProgress = userProgress.filter(p => 
    p.completed_at && moduleContentIds.has(p.content_id)
  );
  
  if (moduleProgress.length === 0) return 0;

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get unique dates with activity in last 14 days
  const recentDates = new Set(
    moduleProgress
      .filter(p => new Date(p.completed_at!) >= fourteenDaysAgo)
      .map(p => new Date(p.completed_at!).toDateString())
  );

  // Get unique dates in last 7 days
  const veryRecentDates = new Set(
    moduleProgress
      .filter(p => new Date(p.completed_at!) >= sevenDaysAgo)
      .map(p => new Date(p.completed_at!).toDateString())
  );

  // Score based on activity frequency
  // 14-day activity: up to 50 points (proportional to days active out of 14)
  const fourteenDayScore = Math.min(50, (recentDates.size / 14) * 100);
  
  // 7-day activity: up to 50 points (proportional to days active out of 7)
  const sevenDayScore = Math.min(50, (veryRecentDates.size / 7) * 100);

  return Math.round(fourteenDayScore + sevenDayScore);
}

function calculateStudyStreak(userProgress: { completed_at: string | null }[]): number {
  if (userProgress.length === 0) return 0;

  // Get unique dates with activity
  const activityDates = new Set(
    userProgress
      .filter(p => p.completed_at)
      .map(p => new Date(p.completed_at!).toDateString())
  );

  if (activityDates.size === 0) return 0;

  // Count consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    
    if (activityDates.has(checkDate.toDateString())) {
      streak++;
    } else if (i > 0) {
      // Allow gap for today (user might not have studied yet today)
      break;
    }
  }

  return streak;
}

function generateInsights(chapters: ChapterStatus[]): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  // Strong areas: chapters with highest coverage (completed or high progress)
  const highCoverageChapters = chapters
    .filter(c => c.status === 'completed' || (c.status === 'in_progress' && c.progress >= 75))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  
  highCoverageChapters.forEach(ch => {
    insights.push({
      type: 'strong',
      label: ch.title,
      detail: ch.status === 'completed' ? '100% coverage' : `${ch.progress}% coverage`,
    });
  });

  // Needs attention: in-progress chapters with low progress (prioritize lowest)
  const needsAttention = chapters
    .filter(c => c.status === 'in_progress' && c.progress < 50 && c.totalItems > 0)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 3);
  
  needsAttention.forEach(ch => {
    insights.push({
      type: 'attention',
      label: ch.title,
      detail: `${ch.progress}% coverage — ${ch.completedItems} of ${ch.totalItems} items`,
    });
  });

  // If no strong areas but have not-started chapters, encourage starting
  if (insights.filter(i => i.type === 'strong').length === 0) {
    const notStarted = chapters.filter(c => c.status === 'not_started' && c.totalItems > 0);
    if (notStarted.length > 0) {
      insights.push({
        type: 'attention',
        label: 'Ready to begin',
        detail: `${notStarted.length} chapter${notStarted.length > 1 ? 's' : ''} awaiting your study`,
      });
    }
  }

  return insights;
}

function generateSuggestions(
  chapters: ChapterStatus[], 
  lectures: { id: string; chapter_id: string | null; title: string }[]
): SuggestedItem[] {
  const suggestions: SuggestedItem[] = [];

  // Find chapters to suggest (prioritize in-progress, then not started)
  const inProgressChapters = chapters
    .filter(c => c.status === 'in_progress' && c.totalItems > 0)
    .sort((a, b) => b.progress - a.progress);

  const notStartedChapters = chapters
    .filter(c => c.status === 'not_started' && c.totalItems > 0);

  const priorityChapters = [...inProgressChapters, ...notStartedChapters].slice(0, 2);

  priorityChapters.forEach(chapter => {
    // Primary suggestion: Book study
    suggestions.push({
      type: 'read',
      title: chapter.title,
      chapterTitle: chapter.moduleName,
      estimatedMinutes: 30,
      chapterId: chapter.id,
      moduleId: chapter.moduleId,
    });

    // Secondary: MCQs if available
    if (chapter.totalItems > 0) {
      suggestions.push({
        type: 'mcq',
        title: `Practice MCQs: ${chapter.title}`,
        estimatedMinutes: 15,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
      });
    }

    // Check for video lectures
    const chapterLectures = lectures.filter(l => l.chapter_id === chapter.id);
    if (chapterLectures.length > 0) {
      suggestions.push({
        type: 'video',
        title: chapterLectures[0].title,
        chapterTitle: chapter.title,
        estimatedMinutes: 20,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
      });
    }
  });

  // Limit suggestions
  return suggestions.slice(0, 5);
}
