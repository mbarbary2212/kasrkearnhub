import { useMemo } from 'react';
import { useStudentGoals } from '@/hooks/useStudentGoals';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useChapterExamWeights } from '@/hooks/useChapterExamWeights';
import {
  buildAdaptiveStudyPlan,
  type AdaptiveStudyPlan,
  type ChapterInfo,
} from '@/lib/studentMetrics/buildAdaptiveStudyPlan';
import {
  getDaysUntilExam,
  type AmbitionLevel,
} from '@/lib/studentMetrics/plannerThresholds';

// ── Week schedule types ──────────────────────────────────────────

export type DayMode = 'normal' | 'rotation' | 'intensive' | 'exam_day';

export interface DaySchedule {
  date: Date;
  /** "Today", "Tomorrow", "Mon 14", etc. */
  label: string;
  mode: DayMode;
  estimatedMinutes: number;
  /** Exam name if mode is exam_day or intensive */
  examName?: string;
  /** Department name if mode is rotation */
  rotationDept?: string;
  /** Days until nearest upcoming exam (intensive/exam_day only) */
  daysUntilExam?: number;
}

export interface MaintenanceTask {
  chapterId: string;
  chapterTitle: string;
  moduleId: string;
  moduleName: string;
  reviewType: 'flashcard' | 'mcq';
  estimatedMinutes: number;
  reason: string;
}

export interface CoachPlanResult {
  plan: AdaptiveStudyPlan | null;
  isOnRotation: boolean;
  rotationDept: string | null;
  nearestExam: { name: string; date: Date; daysLeft: number } | null;
  weekSchedule: DaySchedule[];
  maintenanceTasks: MaintenanceTask[];
  activeModuleName: string | null;
  /** True when daily_hours has been set — minimum needed for a meaningful plan */
  goalsComplete: boolean;
  isLoading: boolean;
  error: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDayLabel(date: Date, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function generateWeekSchedule(goals: {
  daily_hours?: number | null;
  rotation_schedule?: { department: string; start_date: string; end_date: string }[] | null;
  exam_schedule?: { module_id: string; module_name: string; exam_date: string }[] | null;
}): DaySchedule[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const baseMinutes = (goals.daily_hours ?? 1) * 60;

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    date.setHours(0, 0, 0, 0);
    const dateStr = toDateString(date);
    const label = formatDayLabel(date, i);

    const rotation = goals.rotation_schedule?.find(
      r => r.start_date <= dateStr && r.end_date >= dateStr
    );

    const examToday = goals.exam_schedule?.find(e => e.exam_date === dateStr);

    // Nearest exam within 7 days of this specific day
    const nearestUpcoming = goals.exam_schedule
      ?.map(e => {
        const examDate = new Date(e.exam_date);
        examDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil(
          (examDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...e, daysLeft };
      })
      .filter(e => e.daysLeft >= 0 && e.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0];

    const mode: DayMode = examToday
      ? 'exam_day'
      : rotation
      ? 'rotation'
      : nearestUpcoming
      ? 'intensive'
      : 'normal';

    const estimatedMinutes =
      mode === 'exam_day'
        ? 0
        : mode === 'rotation'
        ? Math.min(baseMinutes, 45)
        : baseMinutes;

    return {
      date,
      label,
      mode,
      estimatedMinutes,
      examName: examToday?.module_name ?? nearestUpcoming?.module_name,
      rotationDept: rotation?.department,
      daysUntilExam: nearestUpcoming?.daysLeft,
    };
  });
}

// ── Main hook ────────────────────────────────────────────────────

export function useCoachPlan(): CoachPlanResult {
  const goalsQuery = useStudentGoals();
  const dashboardQuery = useStudentDashboard();

  // Derive module IDs from dashboard chapters to fetch exam weights
  const moduleIds = useMemo(
    () => [...new Set((dashboardQuery.data?.chapters ?? []).map(ch => ch.moduleId))],
    [dashboardQuery.data?.chapters]
  );

  const examWeightsQuery = useChapterExamWeights(moduleIds);

  const activeModuleId = useMemo(() => {
    const goals = goalsQuery.data;
    if (!goals?.exam_schedule?.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = goals.exam_schedule
      .map(e => ({ ...e, parsedDate: new Date(e.exam_date) }))
      .filter(e => e.parsedDate >= today)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    return upcoming[0]?.module_id ?? null;
  }, [goalsQuery.data]);

  const activeModuleName = useMemo(() => {
    if (!activeModuleId || !goalsQuery.data?.exam_schedule) return null;
    return goalsQuery.data.exam_schedule.find(e => e.module_id === activeModuleId)?.module_name ?? null;
  }, [activeModuleId, goalsQuery.data]);

  const maintenanceTasks = useMemo((): MaintenanceTask[] => {
    const dashboard = dashboardQuery.data;
    if (!dashboard || !activeModuleId) return [];
    const MAINTENANCE_CAP_MINUTES = 15;
    const metricsMap = new Map(dashboard.chapterMetrics.map(m => [m.chapter_id, m]));
    const nonActiveChapters = dashboard.chapters.filter(ch => ch.moduleId !== activeModuleId);
    const tasks: MaintenanceTask[] = [];
    let usedMinutes = 0;
    for (const chapter of nonActiveChapters) {
      if (usedMinutes >= MAINTENANCE_CAP_MINUTES) break;
      const m = metricsMap.get(chapter.id);
      if (!m) continue;
      const hasOverdueFlashcards = (m.flashcards_overdue ?? 0) > 0;
      const hasDueFlashcards = (m.flashcards_due ?? 0) > 0;
      if ((hasOverdueFlashcards || hasDueFlashcards) && usedMinutes + 5 <= MAINTENANCE_CAP_MINUTES) {
        tasks.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          moduleId: chapter.moduleId,
          moduleName: chapter.moduleName,
          reviewType: 'flashcard',
          estimatedMinutes: 5,
          reason: hasOverdueFlashcards ? 'Overdue flashcards' : 'Flashcards due today',
        });
        usedMinutes += 5;
      }
    }
    return tasks;
  }, [dashboardQuery.data, activeModuleId]);

  const planResult = useMemo(() => {
    const goals = goalsQuery.data;
    const dashboard = dashboardQuery.data;
    if (!goals || !dashboard) return null;

    // Map ChapterStatus[] (dashboard format) → ChapterInfo[] (planner format)
    const chapters: ChapterInfo[] = dashboard.chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      moduleId: ch.moduleId,
      moduleName: ch.moduleName,
      hasLectures: ch.totalItems > 0,
      firstLectureTitle: undefined,
    }));

    const planChapters = activeModuleId
      ? chapters.filter(ch => ch.moduleId === activeModuleId)
      : chapters;

    // Find nearest upcoming exam
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingExams = (goals.exam_schedule ?? [])
      .map(e => ({ ...e, parsedDate: new Date(e.exam_date) }))
      .filter(e => { e.parsedDate.setHours(0, 0, 0, 0); return e.parsedDate >= today; })
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    const nearestExamEntry = upcomingExams[0] ?? null;
    const nearestExam = nearestExamEntry
      ? {
          name: nearestExamEntry.module_name,
          date: nearestExamEntry.parsedDate,
          daysLeft: getDaysUntilExam(nearestExamEntry.parsedDate) ?? 0,
        }
      : null;

    // Detect if today is within an active rotation
    const todayStr = toDateString(today);
    const activeRotation = (goals.rotation_schedule ?? []).find(
      r => r.start_date <= todayStr && r.end_date >= todayStr
    );

    const baseMinutes = (goals.daily_hours ?? 1) * 60;
    const availableMinutes = activeRotation ? Math.min(baseMinutes, 45) : baseMinutes;

    const plan = buildAdaptiveStudyPlan({
      metrics: dashboard.chapterMetrics,
      chapters: planChapters,
      availableMinutes,
      examWeightMap: examWeightsQuery.data,
      examDate: nearestExamEntry?.parsedDate,
      ambitionLevel: (goals.ambition_level as AmbitionLevel) ?? 'pass_comfortably',
      isOnRotation: !!activeRotation,
    });

    return {
      plan,
      isOnRotation: !!activeRotation,
      rotationDept: activeRotation?.department ?? null,
      nearestExam,
    };
  }, [goalsQuery.data, dashboardQuery.data, examWeightsQuery.data, activeModuleId]);

  const weekSchedule = useMemo(
    () => (goalsQuery.data ? generateWeekSchedule(goalsQuery.data) : []),
    [goalsQuery.data]
  );

  return {
    plan: planResult?.plan ?? null,
    isOnRotation: planResult?.isOnRotation ?? false,
    rotationDept: planResult?.rotationDept ?? null,
    nearestExam: planResult?.nearestExam ?? null,
    weekSchedule,
    maintenanceTasks,
    activeModuleName,
    goalsComplete: !!(goalsQuery.data?.daily_hours),
    isLoading: goalsQuery.isLoading || dashboardQuery.isLoading,
    error: goalsQuery.error ?? dashboardQuery.error,
  };
}
