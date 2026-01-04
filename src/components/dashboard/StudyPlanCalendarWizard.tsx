import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2,
  RotateCcw,
  BookOpen,
  ChevronRight,
  Eye,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { format, addWeeks, startOfWeek } from 'date-fns';
import { getModuleWeightCategory } from '@/hooks/useStudyPlan';

interface Module {
  id: string;
  name: string;
  workload_level?: 'light' | 'medium' | 'heavy' | 'heavy_plus' | null;
  page_count?: number | null;
}

interface Chapter {
  id: string;
  module_id: string;
  title: string;
  chapter_number: number;
}

interface ModuleAllocation {
  moduleId: string;
  moduleName: string;
  suggestedWeeks: number;
  allocatedWeeks: number;
  startWeek: number;
  weight: 'heavy+' | 'heavy' | 'medium' | 'light';
  pageCount: number;
}

interface StudyPlanCalendarWizardProps {
  modules: Module[];
  chapters: Chapter[];
  totalWeeks: number;
  revisionRounds: number;
  startDate: Date;
  onConfirm: (allocations: Record<string, number>) => void;
  onBack: () => void;
}

function getWeightColor(weight: 'heavy+' | 'heavy' | 'medium' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'bg-violet-500';
    case 'heavy': return 'bg-blue-500';
    case 'medium': return 'bg-teal-500';
    case 'light': return 'bg-slate-400';
  }
}

function getWeightBgColor(weight: 'heavy+' | 'heavy' | 'medium' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700';
    case 'heavy': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
    case 'medium': return 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700';
    case 'light': return 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600';
  }
}

function getWeightTextColor(weight: 'heavy+' | 'heavy' | 'medium' | 'light'): string {
  switch (weight) {
    case 'heavy+': return 'text-violet-700 dark:text-violet-300';
    case 'heavy': return 'text-blue-700 dark:text-blue-300';
    case 'medium': return 'text-teal-700 dark:text-teal-300';
    case 'light': return 'text-slate-700 dark:text-slate-300';
  }
}

export function StudyPlanCalendarWizard({
  modules,
  chapters,
  totalWeeks,
  revisionRounds,
  startDate,
  onConfirm,
  onBack,
}: StudyPlanCalendarWizardProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
  // Calculate revision weeks
  const revision1Weeks = revisionRounds === 2 ? Math.ceil(totalWeeks * 0.25) : 0;
  const finalRevisionWeeks = revisionRounds === 2 ? Math.ceil(totalWeeks * 0.12) : Math.ceil(totalWeeks * 0.25);
  const studyWeeks = totalWeeks - revision1Weeks - finalRevisionWeeks;

  // Calculate initial allocations
  const initialAllocations = useMemo(() => {
    const totalWeight = modules.reduce((sum, m) => {
      const w = getModuleWeightCategory(m, modules);
      return sum + (w === 'heavy+' ? 3.5 : w === 'heavy' ? 3 : w === 'medium' ? 2 : 1);
    }, 0);

    let currentWeek = 0;
    return modules.map(module => {
      const weight = getModuleWeightCategory(module, modules);
      const weightValue = weight === 'heavy+' ? 3.5 : weight === 'heavy' ? 3 : weight === 'medium' ? 2 : 1;
      const suggestedWeeks = Math.max(1, Math.round((weightValue / totalWeight) * studyWeeks));
      
      const allocation: ModuleAllocation = {
        moduleId: module.id,
        moduleName: module.name,
        suggestedWeeks,
        allocatedWeeks: suggestedWeeks,
        startWeek: currentWeek,
        weight,
        pageCount: module.page_count || 0,
      };
      
      currentWeek += suggestedWeeks;
      return allocation;
    });
  }, [modules, studyWeeks]);

  const [allocations, setAllocations] = useState<ModuleAllocation[]>(initialAllocations);

  // Recalculate start weeks when allocations change
  const allocationsWithPositions = useMemo(() => {
    let currentWeek = 0;
    return allocations.map(alloc => ({
      ...alloc,
      startWeek: currentWeek,
      endWeek: (currentWeek += alloc.allocatedWeeks) - 1,
    }));
  }, [allocations]);

  const totalAllocatedWeeks = allocations.reduce((sum, a) => sum + a.allocatedWeeks, 0);
  const weekDifference = totalAllocatedWeeks - studyWeeks;

  const handleWeekChange = (moduleId: string, newWeeks: number) => {
    setAllocations(prev => 
      prev.map(a => a.moduleId === moduleId ? { ...a, allocatedWeeks: newWeeks } : a)
    );
  };

  const handleReset = () => {
    setAllocations(initialAllocations);
  };

  const handleConfirm = () => {
    const overrides: Record<string, number> = {};
    allocations.forEach(a => {
      if (a.allocatedWeeks !== a.suggestedWeeks) {
        overrides[a.moduleId] = a.allocatedWeeks;
      }
    });
    onConfirm(overrides);
  };

  // Get chapters for selected module with distribution info
  const selectedModuleChapters = useMemo(() => {
    if (!selectedModuleId) return [];
    const moduleAlloc = allocationsWithPositions.find(a => a.moduleId === selectedModuleId);
    if (!moduleAlloc) return [];

    const moduleChapters = chapters.filter(c => c.module_id === selectedModuleId);
    const chaptersPerWeek = Math.ceil(moduleChapters.length / moduleAlloc.allocatedWeeks);

    return moduleChapters.map((chapter, idx) => ({
      ...chapter,
      weekOffset: Math.floor(idx / chaptersPerWeek),
      weekNumber: moduleAlloc.startWeek + Math.floor(idx / chaptersPerWeek) + 1,
    }));
  }, [selectedModuleId, chapters, allocationsWithPositions]);

  const selectedModule = allocationsWithPositions.find(a => a.moduleId === selectedModuleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              {selectedModuleId ? 'Week Details' : 'Customize Week Allocation'}
            </CardTitle>
            {selectedModuleId && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedModuleId(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Overview
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {!selectedModuleId ? (
        <>
          {/* Week Budget Summary */}
          <Card>
            <CardContent className="py-4">
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                weekDifference > 0 ? 'bg-red-100 dark:bg-red-950/30' : 
                weekDifference < -1 ? 'bg-amber-100 dark:bg-amber-950/30' : 
                'bg-emerald-100 dark:bg-emerald-950/30'
              }`}>
                <div className="flex items-center gap-2">
                  {weekDifference > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : weekDifference < -1 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {weekDifference > 0 
                        ? `${weekDifference} week${weekDifference > 1 ? 's' : ''} over budget`
                        : weekDifference < -1 
                        ? `${Math.abs(weekDifference)} week${Math.abs(weekDifference) > 1 ? 's' : ''} unallocated`
                        : 'Weeks balanced perfectly!'
                      }
                    </p>
                    {weekDifference > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Reduce some modules to fit your timeline
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm">
                    {totalAllocatedWeeks} / {studyWeeks} study weeks
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid View */}
          <Card>
            <CardContent className="py-4">
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  {/* Week numbers header */}
                  <div className="flex gap-1 mb-3 pl-4">
                    {Array.from({ length: Math.min(totalWeeks, 30) }, (_, i) => (
                      <div 
                        key={i} 
                        className="w-8 text-center text-xs text-muted-foreground"
                      >
                        {i + 1}
                      </div>
                    ))}
                    {totalWeeks > 30 && (
                      <div className="text-xs text-muted-foreground">...</div>
                    )}
                  </div>

                  {/* Module rows */}
                  <div className="space-y-2">
                    {allocationsWithPositions.map((alloc) => (
                      <div 
                        key={alloc.moduleId}
                        className="flex items-center gap-2 group"
                      >
                        {/* Module label */}
                        <div className="w-32 shrink-0 truncate text-sm font-medium">
                          {alloc.moduleName}
                        </div>

                        {/* Visual timeline bar */}
                        <div className="flex-1 relative h-10">
                          {/* Background grid */}
                          <div className="absolute inset-0 flex gap-1">
                            {Array.from({ length: Math.min(totalWeeks, 30) }, (_, i) => (
                              <div 
                                key={i}
                                className="w-8 h-full bg-muted/30 rounded-sm"
                              />
                            ))}
                          </div>

                          {/* Module block */}
                          <div
                            className={`absolute h-full rounded-md border-2 ${getWeightBgColor(alloc.weight)} 
                              cursor-pointer hover:shadow-md transition-shadow flex items-center justify-center gap-1`}
                            style={{
                              left: `calc(${alloc.startWeek} * (2rem + 0.25rem))`,
                              width: `calc(${alloc.allocatedWeeks} * 2rem + ${alloc.allocatedWeeks - 1} * 0.25rem)`,
                            }}
                            onClick={() => setSelectedModuleId(alloc.moduleId)}
                          >
                            <span className={`text-xs font-medium ${getWeightTextColor(alloc.weight)} truncate px-1`}>
                              {alloc.allocatedWeeks}w
                            </span>
                            <Eye className={`w-3 h-3 ${getWeightTextColor(alloc.weight)} opacity-0 group-hover:opacity-100 transition-opacity`} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Revision blocks */}
                    {revision1Weeks > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 shrink-0 text-sm font-medium text-amber-700 dark:text-amber-400">
                          Revision 1
                        </div>
                        <div className="flex-1 relative h-10">
                          <div className="absolute inset-0 flex gap-1">
                            {Array.from({ length: Math.min(totalWeeks, 30) }, (_, i) => (
                              <div key={i} className="w-8 h-full bg-muted/30 rounded-sm" />
                            ))}
                          </div>
                          <div
                            className="absolute h-full rounded-md border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-900/20 flex items-center justify-center"
                            style={{
                              left: `calc(${totalAllocatedWeeks} * (2rem + 0.25rem))`,
                              width: `calc(${revision1Weeks} * 2rem + ${revision1Weeks - 1} * 0.25rem)`,
                            }}
                          >
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                              {revision1Weeks}w
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="w-32 shrink-0 text-sm font-medium text-purple-700 dark:text-purple-400">
                        Final Revision
                      </div>
                      <div className="flex-1 relative h-10">
                        <div className="absolute inset-0 flex gap-1">
                          {Array.from({ length: Math.min(totalWeeks, 30) }, (_, i) => (
                            <div key={i} className="w-8 h-full bg-muted/30 rounded-sm" />
                          ))}
                        </div>
                        <div
                          className="absolute h-full rounded-md border-2 border-dashed border-purple-400 bg-purple-50/50 dark:bg-purple-900/20 flex items-center justify-center"
                          style={{
                            left: `calc(${totalAllocatedWeeks + revision1Weeks} * (2rem + 0.25rem))`,
                            width: `calc(${finalRevisionWeeks} * 2rem + ${finalRevisionWeeks - 1} * 0.25rem)`,
                          }}
                        >
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {finalRevisionWeeks}w
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Module Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                Adjust Week Allocations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {allocationsWithPositions.map((alloc) => {
                const isOverAllocated = alloc.allocatedWeeks > alloc.suggestedWeeks * 1.5;
                const isUnderAllocated = alloc.allocatedWeeks < alloc.suggestedWeeks * 0.5;
                
                return (
                  <div key={alloc.moduleId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getWeightColor(alloc.weight)}`} />
                        <span className="text-sm font-medium">{alloc.moduleName}</span>
                        <Badge variant="outline" className="text-xs">
                          {alloc.weight === 'heavy+' ? 'Heavy+' : 
                           alloc.weight.charAt(0).toUpperCase() + alloc.weight.slice(1)}
                        </Badge>
                        {alloc.pageCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({alloc.pageCount} pages)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isUnderAllocated && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {isOverAllocated && (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                        <Badge 
                          variant={alloc.allocatedWeeks === alloc.suggestedWeeks ? 'secondary' : 'outline'}
                          className={isUnderAllocated ? 'border-red-300 text-red-700' : 
                                     isOverAllocated ? 'border-amber-300 text-amber-700' : ''}
                        >
                          {alloc.allocatedWeeks} weeks
                          {alloc.allocatedWeeks !== alloc.suggestedWeeks && (
                            <span className="text-muted-foreground ml-1">
                              (rec: {alloc.suggestedWeeks})
                            </span>
                          )}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setSelectedModuleId(alloc.moduleId)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[alloc.allocatedWeeks]}
                      onValueChange={([value]) => handleWeekChange(alloc.moduleId, value)}
                      min={1}
                      max={Math.max(alloc.suggestedWeeks * 2, studyWeeks / 2)}
                      step={1}
                      className="w-full"
                    />
                    {isUnderAllocated && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Dangerously low - may not have enough time to cover all chapters
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={weekDifference > 0}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Plan
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        /* Week Detail View */
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${getWeightColor(selectedModule?.weight || 'light')}`} />
                  {selectedModule?.moduleName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedModule?.allocatedWeeks} weeks allocated
                  </Badge>
                  <Badge variant="secondary">
                    Weeks {(selectedModule?.startWeek || 0) + 1} - {(selectedModule?.endWeek || 0) + 1}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Based on {selectedModuleChapters.length} chapters distributed across {selectedModule?.allocatedWeeks} weeks.
                Each chapter is assigned proportionally based on content volume.
              </p>

              {/* Week-by-week breakdown */}
              <div className="space-y-4">
                {Array.from({ length: selectedModule?.allocatedWeeks || 0 }, (_, weekIdx) => {
                  const weekChapters = selectedModuleChapters.filter(c => c.weekOffset === weekIdx);
                  const weekDate = addWeeks(startOfWeek(startDate), (selectedModule?.startWeek || 0) + weekIdx);
                  
                  return (
                    <div key={weekIdx} className={`p-4 rounded-lg border ${getWeightBgColor(selectedModule?.weight || 'light')}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Week {(selectedModule?.startWeek || 0) + weekIdx + 1}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(weekDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                        <Badge variant="outline">
                          {weekChapters.length} chapter{weekChapters.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {weekChapters.length > 0 ? (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {weekChapters.map((chapter) => (
                            <div 
                              key={chapter.id}
                              className="flex items-center gap-2 p-2 bg-background/60 rounded-md"
                            >
                              <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate">{chapter.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No chapters defined for this module yet
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSelectedModuleId(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Overview
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
