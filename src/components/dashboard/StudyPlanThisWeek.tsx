import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Check, BookOpen, Shield } from 'lucide-react';
import { StudyPlanItem } from '@/hooks/useStudyPlan';
import { isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

interface StudyPlanThisWeekProps {
  planItems: StudyPlanItem[];
  selectedModuleId: string | null;
  onMarkDone: (itemId: string) => void;
}

export function StudyPlanThisWeek({
  planItems,
  selectedModuleId,
  onMarkDone,
}: StudyPlanThisWeekProps) {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  // Get items for this week
  const thisWeekItems = planItems
    .filter(item => {
      const itemStart = new Date(item.planned_date_from);
      const itemEnd = new Date(item.planned_date_to);
      
      // Check if item's date range overlaps with current week
      const overlaps = itemStart <= weekEnd && itemEnd >= weekStart;
      
      // If module is selected, filter to that module (but include revisions)
      const matchesModule = !selectedModuleId || 
        item.module_id === selectedModuleId ||
        item.item_type === 'revision' ||
        item.item_type === 'final_revision';
      
      return overlaps && matchesModule && item.status === 'planned';
    })
    .slice(0, 10);

  if (planItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Generate a plan above to see your weekly tasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (thisWeekItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">No pending tasks this week.</p>
            <Badge variant="secondary" className="text-xs">
              All caught up!
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            This Week
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {thisWeekItems.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {thisWeekItems.map((item) => (
            <li 
              key={item.id}
              className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {item.item_type === 'chapter' ? (
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <Shield className={`w-4 h-4 shrink-0 ${
                    item.item_type === 'final_revision' 
                      ? 'text-purple-500' 
                      : 'text-amber-500'
                  }`} />
                )}
                <span className="text-sm truncate">{item.item_title}</span>
              </div>
              {item.item_type === 'chapter' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkDone(item.id)}
                  className="h-7 px-2 hover:bg-emerald-100 hover:text-emerald-700"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Done</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
