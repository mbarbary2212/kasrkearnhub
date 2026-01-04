import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StudyPlanWizard } from './StudyPlanWizard';
import { StudyPlanTimeline } from './StudyPlanTimeline';
import { StudyPlanSchedule } from './StudyPlanSchedule';
import { StudyPlanThisWeek } from './StudyPlanThisWeek';
import { StudyPlanOverview } from './StudyPlanOverview';
import { StudyPlanCohortInsights } from './StudyPlanCohortInsights';

interface Module {
  id: string;
  name: string;
  workload_level?: 'light' | 'medium' | 'heavy' | 'heavy_plus' | null;
  page_count?: number | null;
}

interface LearningHubStudyPlanProps {
  moduleSelected: boolean;
  modules: Module[];
  selectedYearName: string;
  selectedYearId?: string;
  selectedModuleId?: string | null;
}

export function LearningHubStudyPlan({ 
  moduleSelected, 
  modules, 
  selectedYearName,
  selectedYearId,
  selectedModuleId,
}: LearningHubStudyPlanProps) {
  const {
    plan,
    baselines,
    planItems,
    baselineChapterIds,
    isLoading,
    createPlan,
    isCreating,
    createError,
    updateItemStatus,
    resetPlan,
    isResetting,
    calculateFeasibility,
  } = useStudyPlan(selectedYearId || null);

  // Defensive defaults - always work with arrays
  const safePlanItems = planItems ?? [];
  const safeBaselines = baselines ?? [];

  // Fetch chapters for plan generation
  const { data: chapters = [] } = useQuery({
    queryKey: ['all-chapters', selectedYearId],
    queryFn: async () => {
      if (!selectedYearId) return [];
      const moduleIds = modules.map(m => m.id);
      if (moduleIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('module_chapters')
        .select('id, module_id, title, chapter_number')
        .in('module_id', moduleIds)
        .order('chapter_number');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedYearId && modules.length > 0,
  });

  // Show placeholder if no module selected
  if (!moduleSelected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Study planning will appear after selecting a module.</p>
          <p className="text-sm mt-2">Choose a module from the selector above to see your personalized study plan.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedModuleName = modules.find(m => m.id === selectedModuleId)?.name || '';

  const handleGenerate = (data: {
    startDate: Date;
    endDate: Date;
    daysPerWeek: number;
    hoursPerDay: number;
    revisionRounds: number;
    baselinePercents: Record<string, number>;
    baselineChapterIds: string[];
    moduleWeekOverrides?: Record<string, number>;
  }) => {
    if (!selectedYearId) return;
    createPlan({
      yearId: selectedYearId,
      startDate: data.startDate,
      endDate: data.endDate,
      daysPerWeek: data.daysPerWeek,
      hoursPerDay: data.hoursPerDay,
      revisionRounds: data.revisionRounds,
      baselinePercents: data.baselinePercents,
      baselineChapterIds: data.baselineChapterIds,
      moduleWeekOverrides: data.moduleWeekOverrides,
      modules,
      chapters,
    });
  };

  const handleMarkDone = (itemId: string) => {
    updateItemStatus({ itemId, status: 'done' });
  };

  const handleUndo = (itemId: string) => {
    updateItemStatus({ itemId, status: 'planned' });
  };

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Wizard - Create/Update Plan */}
      <StudyPlanWizard
        existingPlan={plan}
        modules={modules}
        selectedModuleId={selectedModuleId || null}
        onGenerate={handleGenerate}
        onReset={resetPlan}
        isGenerating={isCreating}
        isResetting={isResetting}
        calculateFeasibility={(start, end, days, hours, mods, baselines) => 
          calculateFeasibility(start, end, days, hours, mods, baselines)
        }
        initialBaselineChapterIds={baselineChapterIds}
      />

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-50 animate-pulse" />
            <p className="font-medium">Loading your study plan...</p>
          </CardContent>
        </Card>
      )}

      {/* Year Timeline (Big Chunks) */}
      {!isLoading && plan && safePlanItems.length > 0 && (
        <StudyPlanTimeline
          modules={modules}
          planItems={safePlanItems}
          startDate={plan.start_date}
          endDate={plan.end_date}
          selectedYearName={selectedYearName}
        />
      )}

      {/* Year Overview */}
      {!isLoading && (
        <StudyPlanOverview
          modules={modules}
          planItems={safePlanItems}
          baselines={safeBaselines}
          startDate={plan?.start_date || ''}
          endDate={plan?.end_date || ''}
          selectedYearName={selectedYearName}
        />
      )}

      {/* This Week Queue + Chapter Schedule */}
      {!isLoading && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <StudyPlanThisWeek
              planItems={safePlanItems}
              selectedModuleId={selectedModuleId || null}
              onMarkDone={handleMarkDone}
            />
          </div>
          <div className="lg:col-span-2">
            <StudyPlanSchedule
              planItems={safePlanItems}
              selectedModuleId={selectedModuleId || null}
              moduleName={selectedModuleName}
              onMarkDone={handleMarkDone}
              onUndo={handleUndo}
            />
          </div>
        </div>
      )}

      {/* Cohort Insights */}
      <StudyPlanCohortInsights
        yearId={selectedYearId || null}
        selectedYearName={selectedYearName}
      />
    </div>
  );
}
