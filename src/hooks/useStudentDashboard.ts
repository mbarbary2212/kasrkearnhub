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
import {
  buildDashboardSuggestions,
  getWeakTopics,
  calculateAggregateReadiness,
} from '@/lib/studentMetrics';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import type { TestProgressData } from '@/hooks/useTestProgress';

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
  type: 'read' | 'mcq' | 'video' | 'essay' | 'flashcard';
  title: string;
  chapterTitle?: string;
  estimatedMinutes?: number;
  chapterId?: string;
  moduleId?: string;
  reason?: string;
  isPrimary?: boolean;
  subtab?: string;
}

export interface WeakChapter {
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  accuracy: number;
  attempts: number;
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
  
  // Weak chapters
  weakChapters: WeakChapter[];
  
  // Selected context
  selectedModuleName?: string;
  selectedYearName?: string;
}

interface DashboardFilters {
  yearId?: string;
  moduleId?: string;
}

/**
 * Student dashboard hook.
 * 
 * `testProgress` is an optional parameter from `useTestProgress`. When provided,
 * it's used to calculate performance/improvement/readiness scores. When undefined
 * (still loading), the hook returns data with neutral defaults — the component
 * should show a loading state until testProgress resolves.
 */
export function useStudentDashboard(filters?: DashboardFilters, testProgress?: TestProgressData) {
  const { user } = useAuthContext();

  return useQuery({
    // Include testProgress in queryKey so results update when it arrives
    queryKey: ['student-dashboard', user?.id, filters?.yearId, filters?.moduleId, testProgress ? 'withTP' : 'noTP'],
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

      // Fetch all data in parallel (no more question_attempts — uses testProgress param)
      const [
        chaptersRes,
        userProgressRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        vpCasesRes,
        lecturesRes,
        yearRes,
        // Lightweight streak sources: recent sessions + question attempts dates
        sessionsRes,
        recentAttemptsRes,
      ] = await Promise.all([
        chaptersQuery,
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('mcqs').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('essays').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('practicals').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('virtual_patient_cases').select('id, chapter_id, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        supabase.from('lectures').select('id, chapter_id, title, module_id').eq('is_deleted', false).in('module_id', moduleIds),
        filters?.yearId ? supabase.from('years').select('name').eq('id', filters.yearId).single() : null,
        supabase.from('user_sessions').select('session_start').eq('user_id', user.id)
          .gte('session_start', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
          .order('session_start', { ascending: false }).limit(200),
        supabase.from('question_attempts').select('created_at').eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }).limit(200),
      ]);

      const chapters = chaptersRes.data || [];
      const userProgress = userProgressRes.data || [];
      const mcqs = mcqsRes.data || [];
      const essays = essaysRes.data || [];
      const practicals = practicalsRes.data || [];
      const caseScenarios = vpCasesRes.data || [];
      const lectures = lecturesRes.data || [];

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

      // Calculate study streak from ALL activity sources
      const allActivityDates: string[] = [
        ...userProgress.filter(p => p.completed_at).map(p => p.completed_at!),
        ...(sessionsRes.data || []).map(s => s.session_start),
        ...(recentAttemptsRes.data || []).map(a => a.created_at),
      ];
      const studyStreak = calculateStudyStreak(allActivityDates);
      
      // Calculate consistency score (0-100) based on recent activity
      const consistencyScore = calculateConsistencyScore(userProgress, contentIds);

      // ============================================================================
      // Performance & Improvement from testProgress (deduped — no extra fetch)
      // ============================================================================
      
      let performanceScore = 0;
      let improvementScore = 50; // neutral default
      let hasRealAccuracyData = false;

      if (testProgress) {
        const { mcq, osce, conceptCheck } = testProgress;
        
        hasRealAccuracyData = mcq.attempts > 0 || osce.attempts > 0;

        performanceScore = calculatePerformance({
          mcq: { accuracy: mcq.accuracy, attempts: mcq.attempts },
          osce: { avgScore: osce.avgScore, attempts: osce.attempts },
          conceptCheck: { passRate: conceptCheck.passRate, total: conceptCheck.total },
        });

        improvementScore = calculateImprovement({
          mcqRecent: mcq.recentAttempts,
          mcqPrior: mcq.priorAttempts,
          osceRecent: osce.recentScores,
          oscePrior: osce.priorScores,
        });
      }

      // ============================================================================
      // Calculate Final Readiness using unified formula with caps
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

      // Generate smart suggestions with reasons and priority scoring
      const suggestions = generateSuggestions(chapterStatuses, lectures, testProgress);

      // Detect weak chapters (MCQ accuracy < 60% with at least 3 attempts)
      const weakChapters = detectWeakChapters(chapterStatuses, testProgress);

      // Get selected module name
      const selectedModuleName = filters?.moduleId 
        ? moduleMap.get(filters.moduleId) 
        : undefined;

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
        weakChapters,
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
    weakChapters: [],
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

function calculateStudyStreak(activityTimestamps: string[]): number {
  if (activityTimestamps.length === 0) return 0;

  // Get unique dates with activity
  const activityDates = new Set(
    activityTimestamps.map(ts => new Date(ts).toDateString())
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

type ChapterState = 'not_started' | 'early' | 'weak' | 'unstable' | 'strong' | 'in_progress';

function classifyChapter(
  chapter: ChapterStatus,
  testProgress?: TestProgressData,
): ChapterState {
  const completedItems = chapter.completedItems || 0;
  const coverage = chapter.progress || 0;
  const accuracy = testProgress?.mcq?.accuracy || 0;
  const hasEnoughAttempts = (testProgress?.mcq?.attempts || 0) >= 5;

  if (coverage === 0 && completedItems < 3) return 'not_started';
  if (coverage < 40 && completedItems < 5) return 'early';
  if (hasEnoughAttempts && accuracy < 60) return 'weak';
  if (hasEnoughAttempts && accuracy < 75) return 'unstable';
  if (coverage >= 70 && accuracy >= 75) return 'strong';
  return 'in_progress';
}

interface ScoredSuggestion extends SuggestedItem {
  score: number;
}

function generateSuggestions(
  chapters: ChapterStatus[], 
  lectures: { id: string; chapter_id: string | null; title: string; module_id: string | null }[],
  testProgress?: TestProgressData,
): SuggestedItem[] {
  const scored: ScoredSuggestion[] = [];

  const chaptersWithContent = chapters.filter(c => c.totalItems > 0);

  chaptersWithContent.forEach(chapter => {
    if (chapter.status === 'completed') return;

    const state = classifyChapter(chapter, testProgress);
    if (state === 'strong') return;

    const chapterLectures = lectures.filter(l => l.chapter_id === chapter.id);

    if (state === 'not_started' || state === 'early') {
      // Learn first — video then read, NO mcq
      if (chapterLectures.length > 0) {
        scored.push({
          type: 'video',
          title: chapterLectures[0].title,
          chapterTitle: chapter.title,
          estimatedMinutes: 20,
          chapterId: chapter.id,
          moduleId: chapter.moduleId,
          reason: 'Not covered yet',
          subtab: 'lectures',
          score: 80,
        });
      }
      scored.push({
        type: 'read',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        estimatedMinutes: 30,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
        reason: 'Build core understanding',
        score: 70,
      });
    } else if (state === 'weak') {
      // Practice first — mcq high priority, video for review
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        estimatedMinutes: 15,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
        reason: 'Low recent accuracy',
        subtab: 'mcqs',
        score: 90,
      });
      if (chapterLectures.length > 0) {
        scored.push({
          type: 'video',
          title: chapterLectures[0].title,
          chapterTitle: chapter.title,
          estimatedMinutes: 20,
          chapterId: chapter.id,
          moduleId: chapter.moduleId,
          reason: 'Review explanation',
          subtab: 'lectures',
          score: 60,
        });
      }
    } else if (state === 'unstable') {
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        estimatedMinutes: 15,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
        reason: 'Needs reinforcement',
        subtab: 'mcqs',
        score: 75,
      });
    } else {
      // in_progress
      scored.push({
        type: 'mcq',
        title: chapter.title,
        chapterTitle: chapter.moduleName,
        estimatedMinutes: 15,
        chapterId: chapter.id,
        moduleId: chapter.moduleId,
        reason: 'Continue where you left',
        subtab: 'mcqs',
        score: 65,
      });
    }
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate: max 1 per type
  const seen = new Set<string>();
  const deduped: ScoredSuggestion[] = [];
  for (const item of scored) {
    if (!seen.has(item.type)) {
      seen.add(item.type);
      deduped.push(item);
    }
  }

  // Take top 3
  const top = deduped.slice(0, 3);
  if (top.length > 0) {
    top[0].isPrimary = true;
  }

  return top.map(({ score, ...item }) => item);
}

function detectWeakChapters(
  chapters: ChapterStatus[],
  testProgress?: TestProgressData,
): WeakChapter[] {
  // Only flag weak with real accuracy data: >=5 attempts AND <60% accuracy
  if (!testProgress || !testProgress.hasAnyAttempts) return [];
  if (testProgress.mcq.attempts < 5 || testProgress.mcq.accuracy >= 60) return [];

  // Attach the in-progress chapter with the most completedItems (most studied = strongest weak signal)
  const candidate = chapters
    .filter(c => c.status === 'in_progress' && c.totalItems > 0)
    .sort((a, b) => b.completedItems - a.completedItems)[0];

  if (!candidate) return [];

  return [{
    chapterId: candidate.id,
    chapterTitle: candidate.title,
    moduleId: candidate.moduleId,
    accuracy: testProgress.mcq.accuracy,
    attempts: testProgress.mcq.attempts,
  }];
}
