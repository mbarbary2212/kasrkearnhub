import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileQuestion, Play, FileText, Clock, ChevronRight, ArrowRight, GalleryHorizontal, Lightbulb, Stethoscope, Eye, Brain, CheckCircle2, Circle, RotateCcw, CalendarClock, RefreshCw, Loader2 } from 'lucide-react';
import type { SuggestedItem } from '@/hooks/useStudentDashboard';
import type { AdaptiveStudyPlan } from '@/lib/studentMetrics';
import type { DailyPlan } from '@/hooks/useDailyStudyPlan';

interface DashboardTodayPlanProps {
  suggestions: SuggestedItem[];
  studyPlan?: AdaptiveStudyPlan | null;
  onNavigate: (moduleId?: string, chapterId?: string, tab?: string, subtab?: string) => void;
  confidenceInsight?: string | null;
  dailyPlan?: DailyPlan | null;
  yesterdayAdherence?: { completed: number; total: number } | null;
  availableMinutes?: number;
  onAvailableMinutesChange?: (minutes: number) => void;
  onRefreshPlan?: () => Promise<void>;
  isRefreshing?: boolean;
}

/** Maps study mode keys to icons */
const studyModeIconMap: Record<string, React.ElementType> = {
  mcq_practice: FileQuestion,
  recall_practice: Brain,
  case_scenarios: FileText,
  clinical_practice: Stethoscope,
  visual_practice: Eye,
  review: GalleryHorizontal,
};

/** Fallback icon map for legacy type field */
const legacyIconMap: Record<string, React.ElementType> = {
  read: BookOpen,
  mcq: FileQuestion,
  video: Play,
  flashcard: GalleryHorizontal,
  review: ArrowRight,
};

function getTaskIcon(item: SuggestedItem): React.ElementType {
  if (item.prescribedStudyMode?.key) {
    return studyModeIconMap[item.prescribedStudyMode.key] ?? BookOpen;
  }
  return legacyIconMap[item.type] ?? BookOpen;
}

const trendIndicator: Record<string, { icon: string; className: string }> = {
  declining: { icon: '↓', className: 'text-destructive' },
  improving: { icon: '↑', className: 'text-emerald-600 dark:text-emerald-400' },
  stable: { icon: '', className: '' },
};

/** Status indicator component */
function TaskStatusDot({ status }: { status?: string }) {
  if (status === 'completed') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
  }
  if (status === 'partial') {
    return (
      <div className="relative w-3.5 h-3.5 flex-shrink-0">
        <Circle className="w-3.5 h-3.5 text-amber-400" />
        <div className="absolute inset-0 overflow-hidden rounded-full" style={{ clipPath: 'inset(50% 0 0 0)' }}>
          <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
        </div>
      </div>
    );
  }
  return <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />;
}

/** Find task status from dailyPlan by chapter ID */
function getTaskStatus(dailyPlan: DailyPlan | null | undefined, chapterId?: string): string | undefined {
  if (!dailyPlan || !chapterId) return undefined;
  const task = dailyPlan.tasks.find(t => t.chapter_id === chapterId);
  return task?.status;
}

function isCarriedOver(dailyPlan: DailyPlan | null | undefined, chapterId?: string): boolean {
  if (!dailyPlan || !chapterId) return false;
  const task = dailyPlan.tasks.find(t => t.chapter_id === chapterId);
  return task?.is_carried_over ?? false;
}

const TIME_OPTIONS = [20, 45, 60, 90] as const;

export function DashboardTodayPlan({ suggestions, studyPlan, onNavigate, confidenceInsight, dailyPlan, yesterdayAdherence, availableMinutes = 60, onAvailableMinutesChange, onRefreshPlan, isRefreshing }: DashboardTodayPlanProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Today's Study Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No suggestions available yet. Start exploring your course content to receive personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const primarySuggestion = suggestions.find(s => s.isPrimary);
  const otherSuggestions = suggestions.filter(s => !s.isPrimary);
  const planLabel = studyPlan?.planLabel;
  const rationale = studyPlan?.rationale;
  const totalMinutes = studyPlan?.totalEstimatedMinutes ?? suggestions.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
  const insight = studyPlan?.confidenceInsight ?? confidenceInsight;
  const examMode = studyPlan?.examMode;
  const daysUntilExam = studyPlan?.daysUntilExam;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Today's Study Plan</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {planLabel && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {planLabel}
                </span>
              )}
              {/* Exam mode badge */}
              {examMode && examMode !== 'normal' && daysUntilExam !== null && daysUntilExam !== undefined && (
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  examMode === 'intensive'
                    ? 'text-destructive bg-destructive/10'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                }`}>
                  <CalendarClock className="w-3 h-3" />
                  Exam in {daysUntilExam}d
                </span>
              )}
              {totalMinutes > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />~{totalMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>
        {rationale && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{rationale}</p>
        )}
        {/* Yesterday adherence */}
        {yesterdayAdherence && yesterdayAdherence.total > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Yesterday: {yesterdayAdherence.completed}/{yesterdayAdherence.total} completed
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Time available picker */}
        {onAvailableMinutesChange && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-foreground">Time available today:</span>
              <div className="flex gap-1.5">
                {TIME_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => onAvailableMinutesChange(mins)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      availableMinutes === mins
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Your plan for today is already set. This will apply tomorrow, or if you refresh your plan.
            </p>
          </div>
        )}
        {/* Start Here — Primary Action */}
        {primarySuggestion && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group bg-primary/5 hover:bg-primary/10 border border-primary/20"
            onClick={() => {
              const tab = primarySuggestion.prescribedStudyMode?.tab || primarySuggestion.tab || 'resources';
              onNavigate(primarySuggestion.moduleId, primarySuggestion.chapterId, tab, primarySuggestion.subtab);
            }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
              {(() => { const Icon = getTaskIcon(primarySuggestion); return <Icon className="w-5 h-5 text-primary" />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <TaskStatusDot status={getTaskStatus(dailyPlan, primarySuggestion.chapterId)} />
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">▶ Start Here</p>
                {isCarriedOver(dailyPlan, primarySuggestion.chapterId) && (
                  <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <RotateCcw className="w-2.5 h-2.5" />carried
                  </span>
                )}
              </div>
              <p className="font-medium truncate text-foreground">{primarySuggestion.title}</p>
              {primarySuggestion.reason && (
                <p className="text-xs text-muted-foreground">
                  {primarySuggestion.trend && primarySuggestion.trend !== 'stable' && (
                    <span className={`font-medium ${trendIndicator[primarySuggestion.trend]?.className || ''} mr-1`}>
                      {trendIndicator[primarySuggestion.trend]?.icon}
                    </span>
                  )}
                  {primarySuggestion.reason}{primarySuggestion.estimatedMinutes ? ` · ~${primarySuggestion.estimatedMinutes} min` : ''}</p>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </div>
        )}

        {/* Other suggestions */}
        {otherSuggestions.length > 0 && (
          <div className="space-y-1.5">
            {otherSuggestions.map((item, idx) => {
              const Icon = getTaskIcon(item);
              const taskStatus = getTaskStatus(dailyPlan, item.chapterId);
              const carried = isCarriedOver(dailyPlan, item.chapterId);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors group ${
                    taskStatus === 'completed' ? 'bg-muted/30 opacity-60' : 'bg-muted/50 hover:bg-muted'
                  }`}
                  onClick={() => {
                    const tab = item.prescribedStudyMode?.tab || item.tab || 'resources';
                    onNavigate(item.moduleId, item.chapterId, tab, item.subtab);
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-secondary">
                    <Icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <TaskStatusDot status={taskStatus} />
                      <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
                      {carried && (
                        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                          <RotateCcw className="w-2.5 h-2.5" />carried
                        </span>
                      )}
                    </div>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.trend && item.trend !== 'stable' && (
                          <span className={`font-medium ${trendIndicator[item.trend]?.className || ''} mr-1`}>
                            {trendIndicator[item.trend]?.icon}
                          </span>
                        )}
                        {item.reason}{item.estimatedMinutes ? ` · ~${item.estimatedMinutes} min` : ''}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* Confidence Insight */}
        {insight && (
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/50 border border-accent">
            <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground/80 leading-relaxed">{insight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
