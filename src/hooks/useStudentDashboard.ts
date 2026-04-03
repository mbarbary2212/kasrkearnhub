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
  buildAdaptiveStudyPlan,
  getWeakTopics,
  calculateAggregateReadiness,
  buildCoachInsights,
} from '@/lib/studentMetrics';
import type { PlannedTask, AdaptiveStudyPlan, CoachInsight } from '@/lib/studentMetrics';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import type { TestProgressData } from '@/hooks/useTestProgress';
import { type ChapterExamWeight } from '@/hooks/useChapterExamWeights';
import { getStudyMode } from '@/lib/studyModes';

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
  action?: string;
  actionRoute?: string;
}

export interface SuggestedItem {
  type: string;
  title: string;
  detail?: string;
  chapterTitle?: string;
  estimatedMinutes?: number;
  chapterId?: string;
  moduleId?: string;
  reason?: string;
  isPrimary?: boolean;
  subtab?: string;
  tab?: string;
  trend?: 'declining' | 'stable' | 'improving';
  revisionState?: string;
  prescribedStudyMode?: { key: string; label: string; tab: string };
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
  coverageCompleted: number;
  coverageTotal: number;
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
  hasRealAccuracyData: boolean;
  
  // Chapters
  chapters: ChapterStatus[];
  
  // Insights
  insights: DashboardInsight[];
  
  // Adaptive study plan
  suggestions: SuggestedItem[];
  studyPlan: AdaptiveStudyPlan | null;
  
  // Weak chapters
  weakChapters: WeakChapter[];
  
  // Confidence insight
  confidenceInsight: string | null;
  
  // Selected context
  selectedModuleName?: string;
  selectedYearName?: string;

  // New: data for enhanced dashboard widgets
  chapterMetrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
  activityDates: string[];
  readinessTrend: number[];
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

      // Fetch all data in parallel
      const [
        chaptersRes,
        userProgressRes,
        mcqsRes,
        essaysRes,
        practicalsRes,
        vpCasesRes,
        lecturesRes,
        yearRes,
        sessionsRes,
        recentAttemptsRes,
        chapterMetricsRes,
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
        supabase.from('student_chapter_metrics' as any).select('*').eq('student_id', user.id),
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

      // Generate insights — placeholder, real coach insights built after metrics load
      let insights: DashboardInsight[] = [];

      // ============================================================================
      // Use real chapter metrics for suggestions and weak chapters
      // ============================================================================
      const realMetrics = ((chapterMetricsRes.data || []) as unknown as StudentChapterMetric[])
        .filter(m => moduleIds.includes(m.module_id));

      // ============================================================================
      // Fetch exam weights for priority boosting + prescribed study modes
      // ============================================================================
      let examWeightMap: Map<string, ChapterExamWeight> | undefined;
      try {
        const { data: activeAssessments } = await supabase
          .from('assessment_structures')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_active', true);

        if (activeAssessments && activeAssessments.length > 0) {
          const { data: weights } = await supabase
            .from('topic_exam_weights')
            .select('chapter_id, module_id, weight_percent, weight_marks, component_id, assessment_components!inner(component_type)')
            .in('assessment_id', activeAssessments.map(a => a.id))
            .not('chapter_id', 'is', null)
            .not('component_id', 'is', null);

          if (weights && weights.length > 0) {
            examWeightMap = new Map<string, ChapterExamWeight>();
            const SECONDARY_THRESHOLD = 0.7;

            for (const w of weights as any[]) {
              if (!w.chapter_id) continue;
              const componentType: string = w.assessment_components?.component_type || 'unknown';
              const percent = Number(w.weight_percent) || 0;
              const marks = Number(w.weight_marks) || 0;

              let entry = examWeightMap.get(w.chapter_id);
              if (!entry) {
                entry = {
                  chapter_id: w.chapter_id,
                  module_id: w.module_id,
                  total_weight_percent: 0,
                  total_weight_marks: 0,
                  component_weights: {},
                  dominant_component: null,
                  secondary_component: null,
                  prescribed_study_mode: getStudyMode(null),
                };
                examWeightMap.set(w.chapter_id, entry);
              }
              entry.total_weight_percent += percent;
              entry.total_weight_marks += marks;
              if (!entry.component_weights[componentType]) {
                entry.component_weights[componentType] = { percent: 0, marks: 0 };
              }
              entry.component_weights[componentType].percent += percent;
              entry.component_weights[componentType].marks += marks;
            }

            // Compute dominant/secondary for each chapter
            for (const entry of examWeightMap.values()) {
              const sorted = Object.entries(entry.component_weights)
                .map(([type, vals]) => ({ type, total: vals.percent || vals.marks }))
                .sort((a, b) => b.total - a.total);

              entry.dominant_component = sorted[0]?.type ?? null;
              if (sorted.length >= 2 && sorted[0].total > 0) {
                const ratio = sorted[1].total / sorted[0].total;
                if (ratio >= SECONDARY_THRESHOLD) {
                  entry.secondary_component = sorted[1].type;
                }
              }
              entry.prescribed_study_mode = getStudyMode(entry.dominant_component);
            }
          }
        }
      } catch {
        // Non-critical: proceed without exam weights
      }

      // Build chapter info for suggestion builder
      const chapterInfos = chapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        moduleId: ch.module_id,
        moduleName: moduleMap.get(ch.module_id) || 'Unknown Module',
        hasLectures: lectures.some(l => l.chapter_id === ch.id),
        firstLectureTitle: lectures.find(l => l.chapter_id === ch.id)?.title,
      }));

      // Build adaptive study plan from real metrics + exam weights
      const studyPlan = buildAdaptiveStudyPlan({
        metrics: realMetrics,
        chapters: chapterInfos,
        examWeightMap,
      });

      // Convert PlannedTask[] to SuggestedItem[] for backward compat
      const suggestions: SuggestedItem[] = studyPlan.tasks.map(t => ({
        type: t.type as SuggestedItem['type'],
        title: t.title,
        chapterTitle: t.chapterTitle,
        estimatedMinutes: t.estimatedMinutes,
        chapterId: t.chapterId,
        moduleId: t.moduleId,
        reason: t.reason,
        isPrimary: t.isPrimary,
        subtab: t.subtab,
        tab: t.tab,
        trend: t.trend,
        revisionState: t.revisionState,
        prescribedStudyMode: t.prescribedStudyMode,
      }));

      // Build coach insights from real metrics + exam weights
      const chapterTitleMap = new Map(chapters.map(ch => [ch.id, ch.title]));
      const coachInsights = buildCoachInsights({
        metrics: realMetrics,
        chapterTitleMap,
        examWeightMap,
      });

      // Convert CoachInsight[] to DashboardInsight[] for existing UI
      insights = coachInsights.map(ci => {
        const typeMap: Record<string, DashboardInsight['type']> = {
          priority: 'attention',
          misallocation: 'attention',
          trend: 'attention',
          strength: 'strong',
          confidence: 'missed',
        };
        return {
          type: typeMap[ci.type] || 'attention',
          label: ci.type === 'priority' ? 'Priority'
            : ci.type === 'misallocation' ? 'Study Allocation'
            : ci.type === 'trend' ? 'Trend Alert'
            : ci.type === 'strength' ? 'Strength'
            : 'Confidence',
          detail: ci.message,
        };
      });

      // Get weak chapters from real metrics
      const weakChapters: WeakChapter[] = getWeakTopics(realMetrics, chapterTitleMap);

      // Use real aggregate readiness if available
      const metricsReadiness = calculateAggregateReadiness(realMetrics);
      const finalExamReadiness = realMetrics.length > 0 ? metricsReadiness : examReadiness;

      // Get selected module name
      const selectedModuleName = filters?.moduleId 
        ? moduleMap.get(filters.moduleId) 
        : undefined;

      // Build activity dates for streak calendar
      const activityDates = allActivityDates;

      // Build readiness trend (simple: use per-chapter readiness scores as proxy)
      // In production this would come from a time-series table
      const readinessTrend = realMetrics.length > 0
        ? realMetrics.slice(-14).map(m => m.readiness_score)
        : [];

      return {
        examReadiness: finalExamReadiness,
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
        studyPlan,
        weakChapters,
        confidenceInsight: studyPlan.confidenceInsight ?? null,
        selectedModuleName,
        selectedYearName: yearRes?.data?.name,
        chapterMetrics: realMetrics,
        chapterTitleMap,
        activityDates,
        readinessTrend,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
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
    studyPlan: null,
    weakChapters: [],
    confidenceInsight: null,
    chapterMetrics: [],
    chapterTitleMap: new Map(),
    activityDates: [],
    readinessTrend: [],
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

// Old proxy-based classifyChapter, generateSuggestions, and detectWeakChapters
// have been removed. All suggestion/weak logic now flows through:
//   src/lib/studentMetrics/buildDashboardSuggestions.ts
//   src/lib/studentMetrics/classifyChapterState.ts
// Insights now flow through:
//   src/lib/studentMetrics/buildCoachInsights.ts
