import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { addDays, differenceInWeeks, startOfWeek, endOfWeek, format } from 'date-fns';

export interface StudyPlan {
  id: string;
  user_id: string;
  year_id: string;
  start_date: string;
  end_date: string;
  days_per_week: number;
  hours_per_day: number;
  revision_rounds: number;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanBaseline {
  id: string;
  plan_id: string;
  module_id: string;
  baseline_completed_percent: number;
}

export interface StudyPlanItem {
  id: string;
  plan_id: string;
  year_id: string;
  module_id: string;
  chapter_id: string | null;
  item_title: string;
  item_type: 'chapter' | 'revision' | 'final_revision';
  week_index: number;
  planned_date_from: string;
  planned_date_to: string;
  status: 'planned' | 'done';
  completed_at: string | null;
  display_order: number;
}

export interface CreatePlanInput {
  yearId: string;
  startDate: Date;
  endDate: Date;
  daysPerWeek: number;
  hoursPerDay: number;
  revisionRounds: number;
  baselinePercents?: Record<string, number>;
  baselineChapterIds?: string[];
}

export interface Module {
  id: string;
  name: string;
  workload_level?: 'light' | 'medium' | 'heavy' | 'heavy_plus' | null;
}

export interface Chapter {
  id: string;
  module_id: string;
  title: string;
  chapter_number: number;
}

// Module weight configuration - fallback when no workload_level and no content counts
const MODULE_WEIGHTS: Record<string, number> = {
  'medicine': 3.5,
  'internal medicine': 3.5,
  'general surgery': 3,
  'surgery': 3,
};

function getModuleWeightValue(module: Module): number {
  // Use explicit workload_level if set
  if (module.workload_level) {
    switch (module.workload_level) {
      case 'heavy_plus': return 3.5;
      case 'heavy': return 3;
      case 'medium': return 2;
      case 'light': return 1;
    }
  }
  
  // Fallback to name-based matching
  const normalizedName = module.name.toLowerCase();
  for (const [key, weight] of Object.entries(MODULE_WEIGHTS)) {
    if (normalizedName.includes(key)) {
      return weight;
    }
  }
  return 1; // Light modules by default
}

export function getModuleWeightCategory(module: Module | string): 'heavy+' | 'heavy' | 'medium' | 'light' {
  // Handle both module object and string for backward compatibility
  const mod: Module = typeof module === 'string' 
    ? { id: '', name: module, workload_level: null } 
    : module;
  
  const weight = getModuleWeightValue(mod);
  if (weight >= 3.5) return 'heavy+';
  if (weight >= 3) return 'heavy';
  if (weight >= 2) return 'medium';
  return 'light';
}

export function useStudyPlan(yearId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing plan for this year
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['study-plan', yearId, user?.id],
    queryFn: async () => {
      if (!yearId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('year_id', yearId)
        .maybeSingle();
      
      if (error) throw error;
      return data as StudyPlan | null;
    },
    enabled: !!yearId && !!user?.id,
  });

  // Fetch baselines for the plan
  const { data: baselines } = useQuery({
    queryKey: ['study-plan-baselines', plan?.id],
    queryFn: async () => {
      if (!plan?.id) return [];
      
      const { data, error } = await supabase
        .from('study_plan_baseline')
        .select('*')
        .eq('plan_id', plan.id);
      
      if (error) throw error;
      return data as StudyPlanBaseline[];
    },
    enabled: !!plan?.id,
  });

  // Fetch baseline chapter items (granular)
  const { data: baselineItems } = useQuery({
    queryKey: ['study-plan-baseline-items', plan?.id],
    queryFn: async () => {
      if (!plan?.id) return [];
      
      const { data, error } = await supabase
        .from('study_plan_baseline_items')
        .select('chapter_id')
        .eq('plan_id', plan.id)
        .eq('is_completed', true);
      
      if (error) throw error;
      return data?.map(item => item.chapter_id) || [];
    },
    enabled: !!plan?.id,
  });

  // Fetch plan items
  const { data: planItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['study-plan-items', plan?.id],
    queryFn: async () => {
      if (!plan?.id) return [];
      
      const { data, error } = await supabase
        .from('study_plan_items')
        .select('*')
        .eq('plan_id', plan.id)
        .order('week_index', { ascending: true })
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as StudyPlanItem[];
    },
    enabled: !!plan?.id,
  });

  // Create or update plan
  const createPlanMutation = useMutation({
    mutationFn: async ({ 
      yearId, 
      startDate, 
      endDate, 
      daysPerWeek, 
      hoursPerDay, 
      revisionRounds, 
      baselinePercents,
      baselineChapterIds,
      modules,
      chapters 
    }: CreatePlanInput & { modules: Module[]; chapters: Chapter[] }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Calculate plan structure
      const totalWeeks = differenceInWeeks(endDate, startDate);
      if (totalWeeks < 4) throw new Error('Plan must be at least 4 weeks');

      // Reserve revision weeks (protected)
      let revision1Weeks = 0;
      let finalRevisionWeeks = 0;
      
      if (revisionRounds === 2) {
        revision1Weeks = Math.ceil(totalWeeks * 0.25);
        finalRevisionWeeks = Math.ceil(totalWeeks * 0.12);
      } else {
        finalRevisionWeeks = Math.ceil(totalWeeks * 0.25);
      }
      
      const studyWeeks = totalWeeks - revision1Weeks - finalRevisionWeeks;

      // Calculate total weight and available hours
      const totalWeight = modules.reduce((sum, m) => {
        const baseline = baselinePercents?.[m.id] || 0;
        const remainingPercent = (100 - baseline) / 100;
        return sum + getModuleWeightValue(m) * remainingPercent;
      }, 0);

      const hoursPerWeek = daysPerWeek * hoursPerDay;
      const totalStudyHours = studyWeeks * hoursPerWeek;

      // Upsert the plan
      const { data: planData, error: planError } = await supabase
        .from('study_plans')
        .upsert({
          user_id: user.id,
          year_id: yearId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          days_per_week: daysPerWeek,
          hours_per_day: hoursPerDay,
          revision_rounds: revisionRounds,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,year_id' })
        .select()
        .single();

      if (planError) throw planError;

      // Save baselines
      if (baselinePercents) {
        const baselineRows = Object.entries(baselinePercents).map(([moduleId, percent]) => ({
          plan_id: planData.id,
          module_id: moduleId,
          baseline_completed_percent: percent,
        }));

        // Delete existing baselines and insert new ones
        await supabase
          .from('study_plan_baseline')
          .delete()
          .eq('plan_id', planData.id);

        if (baselineRows.length > 0) {
          const { error: baselineError } = await supabase
            .from('study_plan_baseline')
            .insert(baselineRows);
          if (baselineError) throw baselineError;
        }
      }

      // Save baseline chapter items (granular)
      await supabase
        .from('study_plan_baseline_items')
        .delete()
        .eq('plan_id', planData.id);

      if (baselineChapterIds && baselineChapterIds.length > 0) {
        // Get chapter info to know module_id
        const { data: chapterInfo } = await supabase
          .from('module_chapters')
          .select('id, module_id')
          .in('id', baselineChapterIds);
        
        if (chapterInfo && chapterInfo.length > 0) {
          const baselineItemRows = chapterInfo.map(ch => ({
            plan_id: planData.id,
            module_id: ch.module_id,
            chapter_id: ch.id,
            is_completed: true,
          }));

          const { error: itemsError } = await supabase
            .from('study_plan_baseline_items')
            .insert(baselineItemRows);
          if (itemsError) throw itemsError;
        }
      }

      // Delete existing items and generate new schedule
      await supabase
        .from('study_plan_items')
        .delete()
        .eq('plan_id', planData.id);

      // Generate schedule items
      const items: Omit<StudyPlanItem, 'id' | 'completed_at'>[] = [];
      let currentWeek = 0;
      let displayOrder = 0;

      // Allocate study weeks to modules
      for (const module of modules) {
        const baseline = baselinePercents?.[module.id] || 0;
        const remainingPercent = (100 - baseline) / 100;
        const moduleWeight = getModuleWeightValue(module) * remainingPercent;
        const moduleWeeks = Math.max(1, Math.round((moduleWeight / totalWeight) * studyWeeks));
        
        // Get chapters for this module
        const moduleChapters = chapters.filter(c => c.module_id === module.id);
        const chapterCount = moduleChapters.length || Math.ceil(moduleWeeks * 2); // Estimate if no chapters

        // Distribute chapters across module weeks
        const chaptersPerWeek = Math.ceil(chapterCount / moduleWeeks);

        for (let weekOffset = 0; weekOffset < moduleWeeks; weekOffset++) {
          const weekIndex = currentWeek + weekOffset;
          const weekStart = addDays(startOfWeek(startDate), weekIndex * 7);
          const weekEnd = endOfWeek(weekStart);

          // Add chapters for this week
          const startChapterIdx = weekOffset * chaptersPerWeek;
          const endChapterIdx = Math.min(startChapterIdx + chaptersPerWeek, chapterCount);

          for (let i = startChapterIdx; i < endChapterIdx; i++) {
            const chapter = moduleChapters[i];
            items.push({
              plan_id: planData.id,
              year_id: yearId,
              module_id: module.id,
              chapter_id: chapter?.id || null,
              item_title: chapter?.title || `Chapter ${i + 1}`,
              item_type: 'chapter',
              week_index: weekIndex,
              planned_date_from: format(weekStart, 'yyyy-MM-dd'),
              planned_date_to: format(weekEnd, 'yyyy-MM-dd'),
              status: 'planned',
              display_order: displayOrder++,
            });
          }
        }
        currentWeek += moduleWeeks;
      }

      // Add revision 1 items (if 2 rounds)
      if (revisionRounds === 2) {
        for (let i = 0; i < revision1Weeks; i++) {
          const weekIndex = currentWeek + i;
          const weekStart = addDays(startOfWeek(startDate), weekIndex * 7);
          const weekEnd = endOfWeek(weekStart);

          items.push({
            plan_id: planData.id,
            year_id: yearId,
            module_id: modules[0]?.id || '',
            chapter_id: null,
            item_title: `Revision 1 - Week ${i + 1}`,
            item_type: 'revision',
            week_index: weekIndex,
            planned_date_from: format(weekStart, 'yyyy-MM-dd'),
            planned_date_to: format(weekEnd, 'yyyy-MM-dd'),
            status: 'planned',
            display_order: displayOrder++,
          });
        }
        currentWeek += revision1Weeks;
      }

      // Add final revision items
      for (let i = 0; i < finalRevisionWeeks; i++) {
        const weekIndex = currentWeek + i;
        const weekStart = addDays(startOfWeek(startDate), weekIndex * 7);
        const weekEnd = endOfWeek(weekStart);

        items.push({
          plan_id: planData.id,
          year_id: yearId,
          module_id: modules[0]?.id || '',
          chapter_id: null,
          item_title: `Final Revision - Week ${i + 1}`,
          item_type: 'final_revision',
          week_index: weekIndex,
          planned_date_from: format(weekStart, 'yyyy-MM-dd'),
          planned_date_to: format(weekEnd, 'yyyy-MM-dd'),
          status: 'planned',
          display_order: displayOrder++,
        });
      }

      // Insert all items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('study_plan_items')
          .insert(items);
        if (itemsError) throw itemsError;
      }

      return planData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan'] });
      queryClient.invalidateQueries({ queryKey: ['study-plan-items'] });
      queryClient.invalidateQueries({ queryKey: ['study-plan-baselines'] });
      queryClient.invalidateQueries({ queryKey: ['study-plan-baseline-items'] });
      toast.success('Study plan generated successfully');
    },
    onError: (error) => {
      toast.error('Failed to create plan: ' + error.message);
    },
  });

  // Update item status
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: 'planned' | 'done' }) => {
      const { data, error } = await supabase
        .from('study_plan_items')
        .update({ 
          status,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan-items'] });
    },
  });

  // Reset plan
  const resetPlanMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id) throw new Error('No plan to reset');

      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan'] });
      queryClient.invalidateQueries({ queryKey: ['study-plan-items'] });
      queryClient.invalidateQueries({ queryKey: ['study-plan-baselines'] });
      queryClient.invalidateQueries({ queryKey: ['study-plan-baseline-items'] });
      toast.success('Study plan reset');
    },
  });

  // Calculate feasibility
  const calculateFeasibility = (
    startDate: Date,
    endDate: Date,
    daysPerWeek: number,
    hoursPerDay: number,
    modules: Module[],
    baselinePercents?: Record<string, number>
  ) => {
    const totalWeeks = differenceInWeeks(endDate, startDate);
    const hoursPerWeek = daysPerWeek * hoursPerDay;
    const totalAvailableHours = totalWeeks * hoursPerWeek;

    // Estimate required hours (rough: 40-60 hours per module unit)
    const totalWeight = modules.reduce((sum, m) => {
      const baseline = baselinePercents?.[m.id] || 0;
      const remainingPercent = (100 - baseline) / 100;
      return sum + getModuleWeightValue(m) * remainingPercent;
    }, 0);

    const estimatedRequiredHours = totalWeight * 50; // 50 hours per weight unit
    const revisionHours = estimatedRequiredHours * 0.4; // 40% for revisions
    const totalRequiredHours = estimatedRequiredHours + revisionHours;

    const isFeasible = totalAvailableHours >= totalRequiredHours;
    const utilizationPercent = Math.round((totalRequiredHours / totalAvailableHours) * 100);

    return {
      isFeasible,
      availableHoursPerWeek: hoursPerWeek,
      plannedHoursPerWeek: Math.round(totalRequiredHours / totalWeeks),
      utilizationPercent,
      totalWeeks,
      suggestion: !isFeasible 
        ? `Consider extending end date by ${Math.ceil((totalRequiredHours - totalAvailableHours) / hoursPerWeek)} weeks or increasing daily hours.`
        : null,
    };
  };

  return {
    plan,
    baselines: baselines ?? [],
    planItems: planItems ?? [],
    baselineChapterIds: baselineItems ?? [],
    isLoading: planLoading || itemsLoading,
    createPlan: createPlanMutation.mutate,
    isCreating: createPlanMutation.isPending,
    createError: createPlanMutation.error,
    updateItemStatus: updateItemStatusMutation.mutate,
    resetPlan: resetPlanMutation.mutate,
    isResetting: resetPlanMutation.isPending,
    calculateFeasibility,
    getModuleWeightCategory,
  };
}

// Cohort insights hook
export function useCohortInsights(yearId: string | null) {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['cohort-insights', yearId],
    queryFn: async () => {
      if (!yearId) return null;

      // Get active users in last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: recentProgress, error } = await supabase
        .from('user_progress')
        .select('user_id, completed_at')
        .gte('completed_at', fourteenDaysAgo.toISOString())
        .eq('completed', true);

      if (error) throw error;

      // Count unique active users
      const activeUsers = new Set(recentProgress?.map(p => p.user_id) || []);
      const activeCount = activeUsers.size;

      if (activeCount < 30) {
        return { insufficientData: true, activeCount };
      }

      // Calculate median coverage (simplified - using count of completions)
      const userCompletions: Record<string, number> = {};
      recentProgress?.forEach(p => {
        userCompletions[p.user_id] = (userCompletions[p.user_id] || 0) + 1;
      });

      const completionCounts = Object.values(userCompletions).sort((a, b) => a - b);
      const medianCompletions = completionCounts[Math.floor(completionCounts.length / 2)] || 0;

      // Weekly progress (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const weeklyProgress = recentProgress?.filter(p => 
        new Date(p.completed_at!) >= sevenDaysAgo
      ).length || 0;

      const weeklyActiveUsers = new Set(
        recentProgress?.filter(p => new Date(p.completed_at!) >= sevenDaysAgo)
          .map(p => p.user_id)
      ).size;

      return {
        insufficientData: false,
        activeCount,
        medianWeeklyItems: Math.round(weeklyProgress / Math.max(weeklyActiveUsers, 1)),
        weeklyActiveUsers,
      };
    },
    enabled: !!yearId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { insights, isLoading };
}
