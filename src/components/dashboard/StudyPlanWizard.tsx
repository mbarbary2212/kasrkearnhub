import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  CalendarDays, 
  Clock, 
  RefreshCw, 
  Sparkles, 
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { StudyPlan, getModuleWeightCategory } from '@/hooks/useStudyPlan';
import { StudyPlanBaselineChapters } from './StudyPlanBaselineChapters';

interface Module {
  id: string;
  name: string;
}

interface FeasibilityResult {
  isFeasible: boolean;
  availableHoursPerWeek: number;
  plannedHoursPerWeek: number;
  utilizationPercent: number;
  totalWeeks: number;
  suggestion: string | null;
}

interface StudyPlanWizardProps {
  existingPlan: StudyPlan | null;
  modules: Module[];
  selectedModuleId: string | null;
  onGenerate: (data: {
    startDate: Date;
    endDate: Date;
    daysPerWeek: number;
    hoursPerDay: number;
    revisionRounds: number;
    baselinePercents: Record<string, number>;
    baselineChapterIds: string[];
  }) => void;
  onReset: () => void;
  isGenerating: boolean;
  isResetting: boolean;
  calculateFeasibility: (
    startDate: Date,
    endDate: Date,
    daysPerWeek: number,
    hoursPerDay: number,
    modules: Module[],
    baselinePercents?: Record<string, number>
  ) => FeasibilityResult;
  initialBaselineChapterIds?: string[];
}

export function StudyPlanWizard({
  existingPlan,
  modules,
  selectedModuleId,
  onGenerate,
  onReset,
  isGenerating,
  isResetting,
  calculateFeasibility,
  initialBaselineChapterIds = [],
}: StudyPlanWizardProps) {
  const [startDate, setStartDate] = useState<string>(
    existingPlan?.start_date || format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    existingPlan?.end_date || format(addMonths(new Date(), 6), 'yyyy-MM-dd')
  );
  const [daysPerWeek, setDaysPerWeek] = useState(existingPlan?.days_per_week || 5);
  const [hoursPerDay, setHoursPerDay] = useState(existingPlan?.hours_per_day || 4);
  const [revisionRounds, setRevisionRounds] = useState(existingPlan?.revision_rounds || 2);
  const [baselinePercents, setBaselinePercents] = useState<Record<string, number>>({});
  const [completedChapterIds, setCompletedChapterIds] = useState<Set<string>>(
    new Set(initialBaselineChapterIds)
  );
  const [showBaselines, setShowBaselines] = useState(false);

  // Sync initial baseline chapter IDs when they load
  useEffect(() => {
    if (initialBaselineChapterIds.length > 0) {
      setCompletedChapterIds(new Set(initialBaselineChapterIds));
    }
  }, [initialBaselineChapterIds]);

  const selectedModule = modules.find(m => m.id === selectedModuleId);

  const feasibility = calculateFeasibility(
    new Date(startDate),
    new Date(endDate),
    daysPerWeek,
    hoursPerDay,
    modules,
    baselinePercents
  );

  const handleToggleChapter = (chapterId: string, isCompleted: boolean) => {
    setCompletedChapterIds(prev => {
      const newSet = new Set(prev);
      if (isCompleted) {
        newSet.add(chapterId);
      } else {
        newSet.delete(chapterId);
      }
      return newSet;
    });
  };

  const handleMarkAllInBook = (chapterIds: string[], isCompleted: boolean) => {
    setCompletedChapterIds(prev => {
      const newSet = new Set(prev);
      chapterIds.forEach(id => {
        if (isCompleted) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  };

  const handleSubmit = () => {
    onGenerate({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      daysPerWeek,
      hoursPerDay,
      revisionRounds,
      baselinePercents,
      baselineChapterIds: Array.from(completedChapterIds),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5" />
          {existingPlan ? 'Update Year Plan' : 'Create Year Plan'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date inputs */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-sm font-medium">Target Finish Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Time availability */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Days per Week</Label>
              <Badge variant="secondary">{daysPerWeek} days</Badge>
            </div>
            <Slider
              value={[daysPerWeek]}
              onValueChange={([value]) => setDaysPerWeek(value)}
              min={1}
              max={7}
              step={1}
              className="w-full"
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Hours per Day</Label>
              <Badge variant="secondary">{hoursPerDay}h</Badge>
            </div>
            <Slider
              value={[hoursPerDay]}
              onValueChange={([value]) => setHoursPerDay(value)}
              min={0.5}
              max={12}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* Revision rounds */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Revision Rounds</Label>
          <Select value={String(revisionRounds)} onValueChange={(v) => setRevisionRounds(Number(v))}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 revision (25% of time)</SelectItem>
              <SelectItem value="2">2 revisions (37% of time)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Already Studied - Module-context aware */}
        <Collapsible open={showBaselines} onOpenChange={setShowBaselines}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <span className="text-sm font-medium text-muted-foreground">
                Already Studied? (Optional)
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showBaselines ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              {selectedModuleId 
                ? 'Mark the chapters you have already completed to exclude them from your study plan.'
                : 'Select a module above to set chapter-level baselines, or use module percentages below for a quick estimate.'}
            </p>
            
            {/* Granular chapter selection when module is selected */}
            {selectedModuleId && (
              <StudyPlanBaselineChapters
                selectedModuleId={selectedModuleId}
                selectedModuleName={selectedModule?.name || ''}
                completedChapterIds={completedChapterIds}
                onToggleChapter={handleToggleChapter}
                onMarkAllInBook={handleMarkAllInBook}
              />
            )}

            {/* Year-level percentage sliders when no module selected */}
            {!selectedModuleId && modules.length > 0 && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Quick module estimates (approximate):
                </p>
                {modules.map((module) => (
                  <div key={module.id} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="truncate flex-1">{module.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {baselinePercents[module.id] || 0}%
                      </Badge>
                    </div>
                    <Slider
                      value={[baselinePercents[module.id] || 0]}
                      onValueChange={([value]) => 
                        setBaselinePercents(prev => ({ ...prev, [module.id]: value }))
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Feasibility card */}
        <div className={`p-4 rounded-lg border ${
          feasibility.isFeasible 
            ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' 
            : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-3">
            {feasibility.isFeasible ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <p className={`text-sm font-medium ${
                feasibility.isFeasible 
                  ? 'text-emerald-800 dark:text-emerald-300' 
                  : 'text-amber-800 dark:text-amber-300'
              }`}>
                {feasibility.isFeasible ? 'Plan looks achievable' : 'Plan may be tight'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Available: {feasibility.availableHoursPerWeek}h/week</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Duration: {feasibility.totalWeeks} weeks</span>
                </div>
              </div>
              {feasibility.suggestion && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {feasibility.suggestion}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={isGenerating}
            className="flex-1 sm:flex-none"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {existingPlan ? 'Update Plan' : 'Generate Plan'}
              </>
            )}
          </Button>
          {existingPlan && (
            <Button 
              variant="outline" 
              onClick={onReset}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset Plan'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}