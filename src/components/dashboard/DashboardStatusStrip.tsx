import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { StreakHeatMap } from './StreakHeatMap';
import { TrendingUp, BookOpen, Calendar, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  type ReadinessResult, 
  getCapMessage,
  READINESS_WEIGHTS,
} from '@/lib/readinessCalculator';

interface DashboardStatusStripProps {
  examReadiness: number;
  coveragePercent: number;
  coverageCompleted: number;
  coverageTotal: number;
  chaptersStarted: number;
  chaptersTotal: number;
  studyStreak: number;
  readinessResult?: ReadinessResult;
  /** Optional: Array of dates when user studied (for heat map) */
  activityDates?: string[];
}

export function DashboardStatusStrip({
  examReadiness,
  coveragePercent,
  coverageCompleted,
  coverageTotal,
  chaptersStarted,
  chaptersTotal,
  studyStreak,
  readinessResult,
  activityDates,
}: DashboardStatusStripProps) {
  const [streakExpanded, setStreakExpanded] = useState(false);
  const capMessage = readinessResult?.cap ? getCapMessage(readinessResult.cap) : null;
  const hasDetailedBreakdown = !!readinessResult;

  return (
    <Card className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exam Readiness - Circular Gauge */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <CircularProgress 
              value={examReadiness} 
              size="md"
              showLabel={true}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Exam Readiness</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    {hasDetailedBreakdown ? (
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">Readiness Breakdown:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Coverage ({Math.round(READINESS_WEIGHTS.coverage * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.coverage}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Performance ({Math.round(READINESS_WEIGHTS.performance * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.performance}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Improvement ({Math.round(READINESS_WEIGHTS.improvement * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.improvement}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Consistency ({Math.round(READINESS_WEIGHTS.consistency * 100)}%)</span>
                            <span className="font-mono">{readinessResult.components.consistency}%</span>
                          </div>
                        </div>
                        {capMessage && (
                          <div className="flex items-start gap-1.5 pt-2 border-t text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{capMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">
                        Readiness reflects preparedness based on coverage, performance, improvement, and consistency.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {capMessage ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Capped
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                Based on coverage, performance & consistency
              </p>
            )}
          </div>
        </div>

        {/* Coverage Progress - with mini circular indicator */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <CircularProgress 
              value={coveragePercent} 
              size="sm"
              showLabel={true}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Coverage
              </span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {coverageCompleted} of {coverageTotal} items completed
            </p>
            {chaptersTotal > 0 && (
              <p className="text-xs text-muted-foreground/70">
                {chaptersStarted} of {chaptersTotal} chapters started
              </p>
            )}
          </div>
        </div>

        {/* Study Streak - Expandable with Heat Map */}
        <Collapsible open={streakExpanded} onOpenChange={setStreakExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-4 cursor-pointer group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Calendar className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-heading font-bold text-foreground">
                    {studyStreak}
                  </span>
                  <span className="text-sm text-muted-foreground">days</span>
                  {streakExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Study Streak
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {studyStreak > 0 ? 'Keep it going!' : 'Start today'}
                </p>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 pt-4 border-t">
            <StreakHeatMap 
              activityDates={activityDates} 
              streakDays={studyStreak}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}
