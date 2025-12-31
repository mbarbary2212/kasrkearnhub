import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LayoutGrid, Shield } from 'lucide-react';
import { StudyPlanItem, getModuleWeightCategory } from '@/hooks/useStudyPlan';
import { differenceInWeeks, format } from 'date-fns';

interface Module {
  id: string;
  name: string;
}

interface StudyPlanTimelineProps {
  modules: Module[];
  planItems: StudyPlanItem[];
  startDate: string;
  endDate: string;
  selectedYearName: string;
}

function getWeightColor(weight: 'heavy+' | 'heavy' | 'medium' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-700';
    case 'heavy': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700';
    case 'medium': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-700';
    case 'light': return 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
}

function getChunkBgColor(weight: 'heavy+' | 'heavy' | 'medium' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'bg-violet-500/20 hover:bg-violet-500/30';
    case 'heavy': return 'bg-blue-500/20 hover:bg-blue-500/30';
    case 'medium': return 'bg-teal-500/20 hover:bg-teal-500/30';
    case 'light': return 'bg-slate-500/20 hover:bg-slate-500/30';
  }
}

export function StudyPlanTimeline({
  modules,
  planItems,
  startDate,
  endDate,
  selectedYearName,
}: StudyPlanTimelineProps) {
  const totalWeeks = differenceInWeeks(new Date(endDate), new Date(startDate));

  // Group items by module to calculate weeks per module
  const moduleWeeks: Record<string, { weeks: Set<number>; weight: 'heavy+' | 'heavy' | 'medium' | 'light' }> = {};
  
  modules.forEach(m => {
    moduleWeeks[m.id] = { 
      weeks: new Set(), 
      weight: getModuleWeightCategory(m.name) 
    };
  });

  planItems.forEach(item => {
    if (item.item_type === 'chapter' && moduleWeeks[item.module_id]) {
      moduleWeeks[item.module_id].weeks.add(item.week_index);
    }
  });

  // Count revision weeks
  const revision1Weeks = planItems.filter(i => i.item_type === 'revision').length;
  const finalRevisionWeeks = planItems.filter(i => i.item_type === 'final_revision').length;

  // Calculate width percentages
  const studyWeeks = totalWeeks - revision1Weeks - finalRevisionWeeks;
  const totalModuleWeeks = Object.values(moduleWeeks).reduce((sum, m) => sum + m.weeks.size, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutGrid className="w-5 h-5" />
            Year Timeline
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            {selectedYearName} • {totalWeeks} weeks
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(startDate), 'MMM d, yyyy')}</span>
          </div>
          <span>→</span>
          <span>{format(new Date(endDate), 'MMM d, yyyy')}</span>
        </div>

        {/* Timeline visualization */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
          {/* Module chunks */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {modules.map((module) => {
              const data = moduleWeeks[module.id];
              const weekCount = data?.weeks.size || 1;
              const widthPercent = totalModuleWeeks > 0 
                ? Math.max(8, (weekCount / totalModuleWeeks) * 100 * (studyWeeks / totalWeeks))
                : 15;
              
              return (
                <div
                  key={module.id}
                  className={`${getChunkBgColor(data?.weight || 'light')} 
                    min-w-[80px] p-3 rounded-lg border transition-colors cursor-default`}
                  style={{ flex: `${widthPercent} 0 0` }}
                >
                  <p className="font-medium text-sm truncate mb-1">{module.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getWeightColor(data?.weight || 'light')} text-xs border`}>
                      {data?.weight === 'heavy+' ? 'Heavy+' : 
                       data?.weight === 'heavy' ? 'Heavy' : 
                       data?.weight === 'medium' ? 'Medium' : 'Light'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{weekCount}w</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Revision blocks */}
          <div className="flex gap-2 border-t border-border/50 pt-4">
            {revision1Weeks > 0 && (
              <div 
                className="flex-1 p-3 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20"
                style={{ flex: `${(revision1Weeks / totalWeeks) * 100}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-300">Revision 1</p>
                </div>
                <p className="text-xs text-muted-foreground">{revision1Weeks} weeks • Protected</p>
              </div>
            )}
            {finalRevisionWeeks > 0 && (
              <div 
                className="flex-1 p-3 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20"
                style={{ flex: `${(finalRevisionWeeks / totalWeeks) * 100}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="font-medium text-sm text-purple-700 dark:text-purple-300">Final Revision</p>
                </div>
                <p className="text-xs text-muted-foreground">{finalRevisionWeeks} weeks • Protected</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-violet-400/50" />
            <span>Heavy+ (major)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400/50" />
            <span>Heavy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-teal-400/50" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-400/50" />
            <span>Light</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-amber-500" />
            <span>Protected</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
