import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
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
            <CardContent className="py-3 px-3 sm:px-6">
              <div className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg ${
                weekDifference > 0 ? 'bg-red-100 dark:bg-red-950/30' : 
                weekDifference < -1 ? 'bg-amber-100 dark:bg-amber-950/30' : 
                'bg-emerald-100 dark:bg-emerald-950/30'
              }`}>
                <div className="flex items-center gap-2">
                  {weekDifference > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  ) : weekDifference < -1 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant="secondary" className="text-xs sm:text-sm whitespace-nowrap">
                    {totalAllocatedWeeks} / {studyWeeks} study weeks
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 sm:px-3">
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid View - with bi-directional scroll */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Scrollable container */}
              <div 
                className="overflow-auto max-h-[400px]"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div 
                  className="min-w-max p-4"
                  style={{ minWidth: `calc(${Math.min(totalWeeks, 40)} * 2.5rem + 10rem)` }}
                >
                  {/* Week numbers header - sticky */}
                  <div className="flex gap-1 mb-3 sticky top-0 bg-card z-10 pb-2">
                    <div className="w-28 sm:w-36 shrink-0" /> {/* Spacer for module names */}
                    {Array.from({ length: totalWeeks }, (_, i) => (
                      <div 
                        key={i} 
                        className="w-8 sm:w-9 text-center text-xs text-muted-foreground font-medium shrink-0"
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Module rows */}
                  <div className="space-y-2">
                    {allocationsWithPositions.map((alloc) => (
                      <div 
                        key={alloc.moduleId}
                        className="flex items-center gap-2 group"
                      >
                        {/* Module label - sticky on left */}
                        <div 
                          className="w-28 sm:w-36 shrink-0 text-xs sm:text-sm font-medium truncate sticky left-0 bg-card pr-2 z-[5]"
                          title={alloc.moduleName}
                        >
                          {alloc.moduleName}
                        </div>

                        {/* Visual timeline bar */}
                        <div className="flex gap-1 items-center">
                          {Array.from({ length: totalWeeks }, (_, weekIdx) => {
                            const isInModule = weekIdx >= alloc.startWeek && weekIdx < alloc.startWeek + alloc.allocatedWeeks;
                            const isFirstWeek = weekIdx === alloc.startWeek;
                            const isLastWeek = weekIdx === alloc.startWeek + alloc.allocatedWeeks - 1;
                            
                            if (!isInModule) {
                              return (
                                <div 
                                  key={weekIdx}
                                  className="w-8 sm:w-9 h-10 bg-muted/30 rounded-sm shrink-0"
                                />
                              );
                            }
                            
                            return (
                              <div
                                key={weekIdx}
                                className={`w-8 sm:w-9 h-10 shrink-0 ${getWeightBgColor(alloc.weight)} 
                                  cursor-pointer hover:shadow-md transition-all flex items-center justify-center
                                  ${isFirstWeek ? 'rounded-l-md border-l-2' : 'border-l-0'} 
                                  ${isLastWeek ? 'rounded-r-md border-r-2' : 'border-r-0'}
                                  border-t-2 border-b-2`}
                                onClick={() => setSelectedModuleId(alloc.moduleId)}
                              >
                                {/* Show week count in middle of block */}
                                {isFirstWeek && (
                                  <span className={`text-xs font-semibold ${getWeightTextColor(alloc.weight)} whitespace-nowrap`}>
                                    {alloc.allocatedWeeks}w
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Revision blocks */}
                    {revision1Weeks > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-28 sm:w-36 shrink-0 text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400 sticky left-0 bg-card pr-2 z-[5]">
                          Revision 1
                        </div>
                        <div className="flex gap-1 items-center">
                          {Array.from({ length: totalWeeks }, (_, weekIdx) => {
                            const rev1Start = totalAllocatedWeeks;
                            const isInRevision = weekIdx >= rev1Start && weekIdx < rev1Start + revision1Weeks;
                            const isFirst = weekIdx === rev1Start;
                            const isLast = weekIdx === rev1Start + revision1Weeks - 1;
                            
                            if (!isInRevision) {
                              return <div key={weekIdx} className="w-8 sm:w-9 h-10 bg-muted/30 rounded-sm shrink-0" />;
                            }
                            
                            return (
                              <div
                                key={weekIdx}
                                className={`w-8 sm:w-9 h-10 shrink-0 border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-900/20 flex items-center justify-center
                                  ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''}`}
                              >
                                {isFirst && (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                    {revision1Weeks}w
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="w-28 sm:w-36 shrink-0 text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-400 sticky left-0 bg-card pr-2 z-[5]">
                        Final Revision
                      </div>
                      <div className="flex gap-1 items-center">
                        {Array.from({ length: totalWeeks }, (_, weekIdx) => {
                          const finalStart = totalAllocatedWeeks + revision1Weeks;
                          const isInFinal = weekIdx >= finalStart && weekIdx < finalStart + finalRevisionWeeks;
                          const isFirst = weekIdx === finalStart;
                          const isLast = weekIdx === finalStart + finalRevisionWeeks - 1;
                          
                          if (!isInFinal) {
                            return <div key={weekIdx} className="w-8 sm:w-9 h-10 bg-muted/30 rounded-sm shrink-0" />;
                          }
                          
                          return (
                            <div
                              key={weekIdx}
                              className={`w-8 sm:w-9 h-10 shrink-0 border-2 border-dashed border-purple-400 bg-purple-50/50 dark:bg-purple-900/20 flex items-center justify-center
                                ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''}`}
                            >
                              {isFirst && (
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                  {finalRevisionWeeks}w
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scroll hint for mobile */}
              <div className="sm:hidden p-2 text-center text-xs text-muted-foreground border-t">
                ← Scroll horizontally and vertically to see all weeks →
              </div>
            </CardContent>
          </Card>

          {/* Module Controls */}
          <Card>
            <CardHeader className="pb-3 px-3 sm:px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                Adjust Week Allocations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-3 sm:px-6">
              {allocationsWithPositions.map((alloc) => {
                const isOverAllocated = alloc.allocatedWeeks > alloc.suggestedWeeks * 1.5;
                const isUnderAllocated = alloc.allocatedWeeks < alloc.suggestedWeeks * 0.5;
                
                return (
                  <div key={alloc.moduleId} className="space-y-2">
                    {/* Mobile-friendly header */}
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${getWeightColor(alloc.weight)}`} />
                        <span className="text-sm font-medium break-words max-w-[140px] sm:max-w-none">
                          {alloc.moduleName}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {alloc.weight === 'heavy+' ? 'Heavy+' : 
                           alloc.weight.charAt(0).toUpperCase() + alloc.weight.slice(1)}
                        </Badge>
                        {alloc.pageCount > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            ({alloc.pageCount} pages)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                        {isUnderAllocated && (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        {isOverAllocated && (
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <Badge 
                          variant={alloc.allocatedWeeks === alloc.suggestedWeeks ? 'secondary' : 'outline'}
                          className={`text-xs sm:text-sm whitespace-nowrap ${
                            isUnderAllocated ? 'border-red-300 text-red-700' : 
                            isOverAllocated ? 'border-amber-300 text-amber-700' : ''
                          }`}
                        >
                          {alloc.allocatedWeeks} weeks
                          <span className="text-muted-foreground ml-1">
                            (rec: {alloc.suggestedWeeks})
                          </span>
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 sm:w-auto sm:px-2 p-0"
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
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Dangerously low - may not cover all chapters</span>
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
