import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, CalendarDays } from 'lucide-react';
import { StudyPlanItem, StudyPlanBaseline, getModuleWeightCategory } from '@/hooks/useStudyPlan';
import { differenceInWeeks, addWeeks, format } from 'date-fns';

interface Module {
  id: string;
  name: string;
}

interface StudyPlanOverviewProps {
  modules: Module[];
  planItems: StudyPlanItem[];
  baselines: StudyPlanBaseline[];
  startDate: string;
  endDate: string;
  selectedYearName: string;
}

export function StudyPlanOverview({
  modules,
  planItems,
  baselines,
  startDate,
  endDate,
  selectedYearName,
}: StudyPlanOverviewProps) {
  // Defensive defaults
  const safeModules = modules ?? [];
  const safePlanItems = planItems ?? [];
  const safeBaselines = baselines ?? [];

  const totalWeeks = startDate && endDate 
    ? differenceInWeeks(new Date(endDate), new Date(startDate)) 
    : 0;

  // Calculate stats per module
  const moduleStats = safeModules.map(module => {
    const moduleItems = safePlanItems.filter(i => i.module_id === module.id && i.item_type === 'chapter');
    const doneItems = moduleItems.filter(i => i.status === 'done');
    const baseline = safeBaselines.find(b => b.module_id === module.id)?.baseline_completed_percent || 0;
    
    // Calculate weeks allocated
    const moduleWeeks = new Set(moduleItems.map(i => i.week_index)).size;
    const weekIndices = moduleItems.map(i => i.week_index);
    const lastWeek = weekIndices.length > 0 ? Math.max(...weekIndices) : 0;
    const estimatedCompletionDate = startDate 
      ? addWeeks(new Date(startDate), lastWeek + 1) 
      : new Date();
    
    // Calculate total weight share
    const weight = getModuleWeightCategory(module.name);
    const weightValue = weight === 'heavy+' ? 3.5 : weight === 'heavy' ? 3 : weight === 'medium' ? 2 : 1;
    
    const totalWeight = safeModules.reduce((sum, m) => {
      const w = getModuleWeightCategory(m.name);
      return sum + (w === 'heavy+' ? 3.5 : w === 'heavy' ? 3 : w === 'medium' ? 2 : 1);
    }, 0);
    
    const sharePercent = totalWeight > 0 ? Math.round((weightValue / totalWeight) * 100) : 0;
    
    // Progress: baseline + (done/total) * remaining
    const remainingPercent = 100 - baseline;
    const donePercent = moduleItems.length > 0 
      ? Math.round(baseline + (doneItems.length / moduleItems.length) * remainingPercent)
      : baseline;

    return {
      id: module.id,
      name: module.name,
      weight,
      sharePercent,
      baselinePercent: baseline,
      progressPercent: donePercent,
      estimatedCompletion: estimatedCompletionDate,
      weeksAllocated: moduleWeeks,
    };
  });

  if (safePlanItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Year Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No plan generated yet</p>
            <p className="text-sm mt-1">Create a year plan to see module breakdown.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Year Overview
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            {selectedYearName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {moduleStats.map((stat) => (
            <div key={stat.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{stat.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {stat.sharePercent}% of year
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {stat.progressPercent}%
                  </span>
                </div>
              </div>
              
              <Progress value={stat.progressPercent} className="h-2" />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  <span>{stat.weeksAllocated}w allocated</span>
                </div>
                <span>
                  Est. completion: {format(stat.estimatedCompletion, 'MMM d')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold">{totalWeeks}</p>
            <p className="text-xs text-muted-foreground">Total weeks</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{safeModules.length}</p>
            <p className="text-xs text-muted-foreground">Modules</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
