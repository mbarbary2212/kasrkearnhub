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
  BookCheck,
  Settings2,
  AlertTriangle,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { StudyPlan, getModuleWeightCategory } from '@/hooks/useStudyPlan';
import { StudyPlanBaselineChapters } from './StudyPlanBaselineChapters';

interface Module {
  id: string;
  name: string;
  workload_level?: 'light' | 'medium' | 'heavy' | 'heavy_plus' | null;
  page_count?: number | null;
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
    moduleWeekOverrides?: Record<string, number>;
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
  const [showWeekOverrides, setShowWeekOverrides] = useState(false);
  const [moduleWeekOverrides, setModuleWeekOverrides] = useState<Record<string, number>>({});

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
      moduleWeekOverrides: Object.keys(moduleWeekOverrides).length > 0 ? moduleWeekOverrides : undefined,
    });
  };

  // Calculate suggested weeks per module based on weights
  const getSuggestedWeeks = (moduleId: string) => {
    const totalWeeks = feasibility.totalWeeks;
    const studyWeeks = Math.floor(totalWeeks * (revisionRounds === 2 ? 0.63 : 0.75));
    
    const module = modules.find(m => m.id === moduleId);
    if (!module) return 1;
    
    const weight = getModuleWeightCategory(module, modules);
    const weightValue = weight === 'heavy+' ? 3.5 : weight === 'heavy' ? 3 : weight === 'medium' ? 2 : 1;
    
    const totalWeight = modules.reduce((sum, m) => {
      const w = getModuleWeightCategory(m, modules);
      return sum + (w === 'heavy+' ? 3.5 : w === 'heavy' ? 3 : w === 'medium' ? 2 : 1);
    }, 0);
    
    return Math.max(1, Math.round((weightValue / totalWeight) * studyWeeks));
  };

  // Check if override is risky
  const getOverrideRisk = (moduleId: string, weeks: number): 'safe' | 'warning' | 'danger' => {
    const suggested = getSuggestedWeeks(moduleId);
    const ratio = weeks / suggested;
    
    if (ratio < 0.5) return 'danger';
    if (ratio < 0.75 || ratio > 1.5) return 'warning';
    return 'safe';
  };

  // Calculate total overridden weeks
  const getTotalAllocatedWeeks = () => {
    const studyWeeks = Math.floor(feasibility.totalWeeks * (revisionRounds === 2 ? 0.63 : 0.75));
    let total = 0;
    
    modules.forEach(m => {
      if (moduleWeekOverrides[m.id] !== undefined) {
        total += moduleWeekOverrides[m.id];
      } else {
        total += getSuggestedWeeks(m.id);
      }
    });
    
    return { total, available: studyWeeks };
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
        <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40 rounded-xl p-5 mt-2 overflow-hidden">
          <Collapsible open={showBaselines} onOpenChange={setShowBaselines}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full p-0 h-auto hover:bg-transparent group text-left">
                <div className="flex items-start gap-2.5 w-full overflow-hidden">
                  <BookCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 overflow-hidden pr-2">
                    <span className="text-sm font-semibold text-foreground block">
                      Already Studied
                    </span>
                    <span className="text-xs text-muted-foreground block leading-relaxed break-words whitespace-normal">
                      Mark chapters you have already completed so your study plan is realistic.
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-0.5 ${showBaselines ? 'rotate-180' : ''}`} />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-5 space-y-4">
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
        </div>

        {/* Module Week Overrides - Advanced Control */}
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-5 overflow-hidden">
          <Collapsible open={showWeekOverrides} onOpenChange={setShowWeekOverrides}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full p-0 h-auto hover:bg-transparent group text-left">
                <div className="flex items-start gap-2.5 w-full overflow-hidden">
                  <Settings2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 overflow-hidden pr-2">
                    <span className="text-sm font-semibold text-foreground block">
                      Customize Week Allocation
                    </span>
                    <span className="text-xs text-muted-foreground block leading-relaxed break-words whitespace-normal">
                      Override the suggested weeks for each module (advanced).
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-0.5 ${showWeekOverrides ? 'rotate-180' : ''}`} />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-5 space-y-4">
              {/* Week allocation summary */}
              {(() => {
                const { total, available } = getTotalAllocatedWeeks();
                const isOver = total > available;
                const isUnder = total < available - 1;
                return (
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    isOver ? 'bg-red-100 dark:bg-red-950/30' : 
                    isUnder ? 'bg-amber-100 dark:bg-amber-950/30' : 
                    'bg-emerald-100 dark:bg-emerald-950/30'
                  }`}>
                    <span className="text-xs font-medium">
                      {isOver ? (
                        <span className="text-red-700 dark:text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {total - available} week(s) over budget
                        </span>
                      ) : isUnder ? (
                        <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {available - total} week(s) unallocated
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Weeks balanced
                        </span>
                      )}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {total} / {available} weeks
                    </Badge>
                  </div>
                );
              })()}

              {modules.length > 0 && (
                <div className="space-y-4">
                  {modules.map((module) => {
                    const suggested = getSuggestedWeeks(module.id);
                    const current = moduleWeekOverrides[module.id] ?? suggested;
                    const risk = getOverrideRisk(module.id, current);
                    const weight = getModuleWeightCategory(module, modules);
                    const weightLabel = weight === 'heavy+' ? 'Heavy+' : weight.charAt(0).toUpperCase() + weight.slice(1);
                    
                    return (
                      <div key={module.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{module.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {weightLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {risk === 'danger' && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            {risk === 'warning' && (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <Badge 
                              variant={risk === 'safe' ? 'secondary' : 'outline'} 
                              className={`${
                                risk === 'danger' ? 'border-red-300 text-red-700 dark:text-red-400' : 
                                risk === 'warning' ? 'border-amber-300 text-amber-700 dark:text-amber-400' : ''
                              }`}
                            >
                              {current}w
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[current]}
                            onValueChange={([value]) => {
                              if (value === suggested) {
                                setModuleWeekOverrides(prev => {
                                  const next = { ...prev };
                                  delete next[module.id];
                                  return next;
                                });
                              } else {
                                setModuleWeekOverrides(prev => ({ ...prev, [module.id]: value }));
                              }
                            }}
                            min={1}
                            max={Math.max(suggested * 2, 8)}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            (rec: {suggested}w)
                          </span>
                        </div>
                        
                        {risk === 'danger' && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            ⚠️ Dangerously short for this module's workload
                          </p>
                        )}
                        {risk === 'warning' && moduleWeekOverrides[module.id] !== undefined && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            This allocation differs significantly from recommended
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {Object.keys(moduleWeekOverrides).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModuleWeekOverrides({})}
                  className="mt-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reset to Recommended
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
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