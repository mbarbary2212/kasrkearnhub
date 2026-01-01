import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Check, Undo2, CalendarDays, Shield } from 'lucide-react';
import { StudyPlanItem } from '@/hooks/useStudyPlan';
import { format } from 'date-fns';

interface StudyPlanScheduleProps {
  planItems: StudyPlanItem[];
  selectedModuleId: string | null;
  moduleName: string;
  onMarkDone: (itemId: string) => void;
  onUndo: (itemId: string) => void;
}

export function StudyPlanSchedule({
  planItems,
  selectedModuleId,
  moduleName,
  onMarkDone,
  onUndo,
}: StudyPlanScheduleProps) {
  // Defensive default
  const safePlanItems = planItems ?? [];

  // Filter items for selected module (or show all for revisions)
  const filteredItems = selectedModuleId
    ? safePlanItems.filter(item => 
        item.module_id === selectedModuleId || 
        item.item_type === 'revision' || 
        item.item_type === 'final_revision'
      )
    : safePlanItems;

  // Group by week
  const weekGroups: Record<number, StudyPlanItem[]> = {};
  filteredItems.forEach(item => {
    if (!weekGroups[item.week_index]) {
      weekGroups[item.week_index] = [];
    }
    weekGroups[item.week_index].push(item);
  });

  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);

  if (sortedWeeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Chapter Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No schedule generated yet</p>
            <p className="text-sm mt-1">Create a year plan above to see your chapter schedule.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Chapter Schedule
          </CardTitle>
          {selectedModuleId && (
            <Badge variant="outline" className="text-xs">
              Filtered: {moduleName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedWeeks.slice(0, 12).map((weekIndex) => {
          const items = weekGroups[weekIndex];
          const firstItem = items[0];
          const weekLabel = `Week ${weekIndex + 1}`;
          const dateRange = `${format(new Date(firstItem.planned_date_from), 'MMM d')} - ${format(new Date(firstItem.planned_date_to), 'MMM d')}`;

          return (
            <div key={weekIndex} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm">{weekLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-6 sm:ml-0">{dateRange}</span>
              </div>
              <div className="divide-y">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`px-3 sm:px-4 py-3 flex items-center justify-between gap-2 ${
                      item.status === 'done' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {(item.item_type === 'revision' || item.item_type === 'final_revision') && (
                        <Shield className={`w-4 h-4 shrink-0 ${
                          item.item_type === 'final_revision' 
                            ? 'text-purple-500' 
                            : 'text-amber-500'
                        }`} />
                      )}
                      <span className={`text-sm truncate ${
                        item.status === 'done' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {item.item_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <Badge 
                        variant={item.status === 'done' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          item.status === 'done' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' 
                            : ''
                        }`}
                      >
                        {item.status === 'done' ? 'Done' : 'Planned'}
                      </Badge>
                      {item.item_type === 'chapter' && (
                        item.status === 'done' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUndo(item.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkDone(item.id)}
                            className="h-7 w-7 p-0 hover:bg-emerald-100 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {sortedWeeks.length > 12 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            + {sortedWeeks.length - 12} more weeks
          </p>
        )}
      </CardContent>
    </Card>
  );
}
