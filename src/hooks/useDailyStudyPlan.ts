import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { buildAdaptiveStudyPlan, type AdaptivePlanInput, type AdaptiveStudyPlan } from '@/lib/studentMetrics';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import {
  MCQ_COMPLETION_THRESHOLD,
  COVERAGE_COMPLETION_THRESHOLD,
  PARTIAL_MCQ_THRESHOLD,
  MAX_CARRY_OVER_TASKS,
  CARRY_OVER_MIN_PRIORITY,
  MAX_CARRY_COUNT,
  classifyExamMode,
  getDaysUntilExam,
  type ExamMode,
} from '@/lib/studentMetrics/plannerThresholds';

export interface DailyPlanTask {
  id: string;
  plan_id: string;
  chapter_id: string | null;
  task_type: string;
  title: string;
  reason: string | null;
  status: 'pending' | 'partial' | 'completed' | 'skipped';
  is_carried_over: boolean;
  carry_count: number;
  priority: number;
  estimated_minutes: number;
  completion_percent: number;
  prescribed_study_mode: string | null;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  module_id: string | null;
  plan_date: string;
  exam_mode: ExamMode;
  plan_label: string | null;
  tasks_completed: number;
  tasks_total: number;
  tasks: DailyPlanTask[];
}

interface UseDailyStudyPlanOptions {
  /** Pass the adaptive plan input so we can generate if needed */
  planInput?: AdaptivePlanInput;
  /** Exam date from study_plans configuration */
  examDate?: string | null;
  /** Chapter metrics for syncing task statuses */
  chapterMetrics?: StudentChapterMetric[];
}

const TODAY = () => new Date().toISOString().split('T')[0];

/**
 * Manages persistent daily study plans with carry-over logic.
 * - Checks for existing plan for today
 * - If none, generates from adaptive engine + carries over from yesterday
 * - Syncs task statuses against real student_chapter_metrics
 */
export function useDailyStudyPlan(options: UseDailyStudyPlanOptions = {}) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { planInput, examDate, chapterMetrics } = options;

  const query = useQuery({
    queryKey: ['daily-study-plan', user?.id, TODAY()],
    queryFn: async (): Promise<DailyPlan | null> => {
      if (!user?.id) return null;

      const today = TODAY();

      // 1. Check for existing plan
      const { data: existingPlans } = await supabase
        .from('daily_study_plans' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', today);

      const existing = (existingPlans as any[])?.[0];

      if (existing) {
        // Load tasks
        const { data: tasks } = await supabase
          .from('daily_study_plan_tasks' as any)
          .select('*')
          .eq('plan_id', existing.id)
          .order('priority', { ascending: false });

        const planTasks = (tasks as any[] || []) as DailyPlanTask[];

        // Sync task statuses against current metrics
        const synced = syncTaskStatuses(planTasks, chapterMetrics || []);

        // Update completion counts
        const completed = synced.filter(t => t.status === 'completed').length;
        if (completed !== existing.tasks_completed) {
          await supabase
            .from('daily_study_plans' as any)
            .update({ tasks_completed: completed } as any)
            .eq('id', existing.id);
        }

        return {
          ...existing,
          tasks_completed: completed,
          tasks: synced,
        } as DailyPlan;
      }

      // 2. No existing plan — generate a new one
      if (!planInput) return null;

      const daysUntilExam = getDaysUntilExam(examDate);
      const examMode = classifyExamMode(daysUntilExam);

      // Build plan with exam mode
      const adaptivePlan = buildAdaptiveStudyPlan({
        ...planInput,
        examDate: examDate ? new Date(examDate) : undefined,
      });

      // 3. Get carry-over tasks from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: yesterdayPlans } = await supabase
        .from('daily_study_plans' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_date', yesterdayStr);

      let carryOverTasks: DailyPlanTask[] = [];
      const yesterdayPlan = (yesterdayPlans as any[])?.[0];

      if (yesterdayPlan) {
        const { data: yesterdayTasks } = await supabase
          .from('daily_study_plan_tasks' as any)
          .select('*')
          .eq('plan_id', yesterdayPlan.id)
          .in('status', ['pending', 'partial'])
          .order('priority', { ascending: false });

        carryOverTasks = ((yesterdayTasks as any[]) || [])
          .filter((t: any) =>
            t.priority > CARRY_OVER_MIN_PRIORITY &&
            t.carry_count < MAX_CARRY_COUNT
          )
          .slice(0, MAX_CARRY_OVER_TASKS) as DailyPlanTask[];
      }

      // 4. Persist new plan
      const { data: newPlan } = await supabase
        .from('daily_study_plans' as any)
        .insert({
          user_id: user.id,
          module_id: planInput.chapters?.[0]?.moduleId || null,
          plan_date: today,
          exam_mode: examMode,
          plan_label: adaptivePlan.planLabel + (daysUntilExam !== null ? ` · Exam in ${daysUntilExam}d` : ''),
          tasks_total: adaptivePlan.tasks.length + carryOverTasks.length,
          tasks_completed: 0,
        } as any)
        .select()
        .single();

      if (!newPlan) return null;
      const planId = (newPlan as any).id;

      // Insert carry-over tasks first
      const carryInserts = carryOverTasks.map((t) => ({
        plan_id: planId,
        chapter_id: t.chapter_id,
        task_type: t.task_type,
        title: t.title,
        reason: t.reason || 'Carried over from yesterday',
        status: 'pending',
        is_carried_over: true,
        carry_count: t.carry_count + 1,
        priority: t.priority,
        estimated_minutes: t.estimated_minutes,
        prescribed_study_mode: t.prescribed_study_mode,
      }));

      // Insert fresh adaptive tasks
      const freshInserts = adaptivePlan.tasks.map((t) => ({
        plan_id: planId,
        chapter_id: t.chapterId || null,
        task_type: t.prescribedStudyMode?.key || t.type,
        title: t.title,
        reason: t.reason,
        status: 'pending',
        is_carried_over: false,
        carry_count: 0,
        priority: t.priority,
        estimated_minutes: t.estimatedMinutes,
        prescribed_study_mode: t.prescribedStudyMode?.key || null,
      }));

      const allInserts = [...carryInserts, ...freshInserts];
      if (allInserts.length > 0) {
        await supabase
          .from('daily_study_plan_tasks' as any)
          .insert(allInserts as any);
      }

      // Re-fetch tasks
      const { data: createdTasks } = await supabase
        .from('daily_study_plan_tasks' as any)
        .select('*')
        .eq('plan_id', planId)
        .order('priority', { ascending: false });

      return {
        ...(newPlan as any),
        tasks: ((createdTasks as any[]) || []) as DailyPlanTask[],
      } as DailyPlan;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Mutation to manually update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: DailyPlanTask['status'] }) => {
      await supabase
        .from('daily_study_plan_tasks' as any)
        .update({ status } as any)
        .eq('id', taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-study-plan'] });
    },
  });

  return {
    dailyPlan: query.data ?? null,
    isLoading: query.isLoading,
    markTaskStatus: (taskId: string, status: DailyPlanTask['status']) =>
      updateTaskStatus.mutate({ taskId, status }),
  };
}

/**
 * Sync task statuses against real student_chapter_metrics.
 * Does NOT write to DB — returns updated tasks for display.
 */
function syncTaskStatuses(
  tasks: DailyPlanTask[],
  metrics: StudentChapterMetric[],
): DailyPlanTask[] {
  const metricsMap = new Map(metrics.map(m => [m.chapter_id, m]));

  return tasks.map(task => {
    if (!task.chapter_id || task.status === 'skipped') return task;

    const m = metricsMap.get(task.chapter_id);
    if (!m) return task;

    // Check completion
    if (
      m.mcq_attempts >= MCQ_COMPLETION_THRESHOLD ||
      m.coverage_percent >= COVERAGE_COMPLETION_THRESHOLD
    ) {
      return { ...task, status: 'completed' as const, completion_percent: 100 };
    }

    // Check partial
    if (m.mcq_attempts >= PARTIAL_MCQ_THRESHOLD || m.coverage_percent > 0) {
      const mcqPct = Math.min(100, Math.round((m.mcq_attempts / MCQ_COMPLETION_THRESHOLD) * 100));
      const covPct = Math.round(m.coverage_percent);
      const pct = Math.max(mcqPct, covPct);
      if (pct > 0 && task.status === 'pending') {
        return { ...task, status: 'partial' as const, completion_percent: pct };
      }
    }

    return task;
  });
}
