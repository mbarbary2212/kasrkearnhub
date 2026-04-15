import { useNavigate } from 'react-router-dom';
import { useCoachPlan, type MaintenanceTask } from '@/hooks/useCoachPlan';
import { computeGoalsProgress } from '@/hooks/useStudentGoals';
import { useStudentGoals } from '@/hooks/useStudentGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList,
  ArrowRight,
  Stethoscope,
  CalendarClock,
  Target,
  BookOpen,
  Brain,
  FileQuestion,
  Eye,
  RotateCcw,
  Star,
} from 'lucide-react';
import type { DayMode } from '@/hooks/useCoachPlan';

interface CoachPlanTabProps {
  onSwitchToGoals: () => void;
}

// ── Study mode colour + icon map ──────────────────────────────────
const MODE_STYLE: Record<string, { colour: string; icon: React.ReactNode }> = {
  mcq_practice:      { colour: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       icon: <Brain className="h-3.5 w-3.5" /> },
  recall_practice:   { colour: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <RotateCcw className="h-3.5 w-3.5" /> },
  case_scenarios:    { colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',       icon: <FileQuestion className="h-3.5 w-3.5" /> },
  case_practice:     { colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',       icon: <FileQuestion className="h-3.5 w-3.5" /> },
  clinical_practice: { colour: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',       icon: <Stethoscope className="h-3.5 w-3.5" /> },
  visual_practice:   { colour: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   icon: <Eye className="h-3.5 w-3.5" /> },
  review:            { colour: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',       icon: <BookOpen className="h-3.5 w-3.5" /> },
};

const DEFAULT_STYLE = { colour: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', icon: <BookOpen className="h-3.5 w-3.5" /> };

// ── Day mode colours for the week strip ───────────────────────────
const DAY_MODE_STYLE: Record<DayMode, { dot: string; label: string }> = {
  normal:    { dot: 'bg-emerald-500',  label: '' },
  rotation:  { dot: 'bg-amber-400',    label: 'Rotation' },
  intensive: { dot: 'bg-orange-500',   label: 'Exam soon' },
  exam_day:  { dot: 'bg-rose-600',     label: 'EXAM' },
};

export function CoachPlanTab({ onSwitchToGoals }: CoachPlanTabProps) {
  const navigate = useNavigate();
  const { data: goals } = useStudentGoals();
  const {
    plan,
    isOnRotation,
    rotationDept,
    nearestExam,
    weekSchedule,
    goalsComplete,
    isLoading,
    maintenanceTasks,
    activeModuleName,
  } = useCoachPlan();

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4 animate-pulse" />
          <span>Building your plan…</span>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  // ── Goals incomplete state ────────────────────────────────────
  if (!goalsComplete) {
    const progress = computeGoalsProgress(goals ?? null);
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold">Set up your goals first</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {progress === 0
                    ? "Tell us your daily study hours so we can build a personalised schedule."
                    : "Add your daily study hours to unlock your personalised plan."}
                </p>
              </div>
              <Button onClick={onSwitchToGoals} className="gap-1.5">
                {progress === 0 ? 'Set Up Goals' : 'Complete Goals'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Context banners ───────────────────────────────────────────
  const showExamBanner = nearestExam && nearestExam.daysLeft <= 14;
  const examBannerColour = nearestExam && nearestExam.daysLeft <= 7
    ? 'border-rose-500/30 bg-rose-500/5'
    : 'border-orange-500/30 bg-orange-500/5';

  // ── Task navigation helper ────────────────────────────────────
  const startTask = (moduleId?: string, chapterId?: string, tab?: string, subtab?: string) => {
    if (!moduleId || !chapterId) {
      navigate('/review/flashcards');
      return;
    }
    const subtabParam = subtab ? `&subtab=${subtab}` : '';
    navigate(`/module/${moduleId}/chapter/${chapterId}?section=${tab || 'resources'}${subtabParam}`);
  };

  return (
    <div className="space-y-5">

      {/* ── Context banners ─────────────────────────────────── */}
      {isOnRotation && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
          <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm">
            <span className="font-medium text-amber-700 dark:text-amber-300">
              On Rotation: {rotationDept}
            </span>
            {' '}— session capped at 45 min
          </p>
        </div>
      )}

      {showExamBanner && nearestExam && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${examBannerColour}`}>
          <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">
              Exam in {nearestExam.daysLeft} day{nearestExam.daysLeft !== 1 ? 's' : ''}:
            </span>
            {' '}{nearestExam.name}
          </p>
        </div>
      )}

      {/* ── Today's Plan ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Today's Plan
          </CardTitle>
          {plan && (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{plan.planLabel}</p>
              <p className="text-xs text-muted-foreground">{plan.rationale}</p>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {(!plan || plan.tasks.length === 0) && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tasks could be generated — make sure you have module content available.
            </p>
          )}

          {plan?.tasks.map((task, idx) => {
            const modeKey = task.prescribedStudyMode?.key ?? task.type ?? 'review';
            const style = MODE_STYLE[modeKey] ?? DEFAULT_STYLE;
            // Strip the " — Mode (detail)" suffix to show only the chapter name
            const chapterName = task.title.split(' — ')[0];
            const modeLabel = task.prescribedStudyMode?.label ?? modeKey;
            const canStart = !!(task.moduleId && task.chapterId);

            return (
              <div
                key={`${task.chapterId}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Mode pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={`text-[11px] gap-1 ${style.colour}`}>
                      {style.icon}
                      {modeLabel}
                    </Badge>
                    {task.isPrimary && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-400/50 text-amber-600 dark:text-amber-400">
                        <Star className="h-2.5 w-2.5" />
                        Priority
                      </Badge>
                    )}
                  </div>
                  {/* Chapter name */}
                  <p className="text-sm font-medium truncate">{chapterName}</p>
                  {/* Reason */}
                  {task.reason && (
                    <p className="text-xs text-muted-foreground">{task.reason}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {task.estimatedMinutes} min
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={!canStart}
                    onClick={() => {
                      const tab = task.prescribedStudyMode?.tab || task.tab || 'resources';
                      startTask(task.moduleId, task.chapterId, tab, task.subtab);
                    }}
                  >
                    Start <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {plan && plan.tasks.length > 0 && (
            <p className="text-xs text-muted-foreground text-right pt-1">
              Total: {plan.totalEstimatedMinutes} min today
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Maintenance ─────────────────────────────────────── */}
      {maintenanceTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4" />
              Maintenance
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Keep previous modules from fading — 15 min included in your daily total
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenanceTasks.map((task, idx) => (
              <div
                key={`${task.chapterId}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[11px] gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      <RotateCcw className="h-3.5 w-3.5" />
                      {task.reviewType === 'flashcard' ? 'Flashcards' : 'MCQ Review'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{task.chapterTitle}</p>
                  <p className="text-xs text-muted-foreground">{task.moduleName} · {task.reason}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {task.estimatedMinutes} min
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => navigate('/review/flashcards')}
                  >
                    Start <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── This Week ───────────────────────────────────────── */}
      {weekSchedule.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2">
              <div className="flex gap-1 px-2 min-w-max">
                {weekSchedule.map((day, idx) => {
                  const modeStyle = DAY_MODE_STYLE[day.mode] ?? DAY_MODE_STYLE.normal;
                  const isToday = idx === 0;

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 min-w-[60px] text-center ${
                        isToday ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'
                      }`}
                    >
                      {/* Day label */}
                      <span className={`text-[11px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {day.label}
                      </span>

                      {/* Mode dot */}
                      <span className={`h-2 w-2 rounded-full ${modeStyle.dot}`} />

                      {/* Mode label or minutes */}
                      {day.mode === 'exam_day' ? (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          EXAM
                        </span>
                      ) : (
                        <span className="text-xs tabular-nums text-foreground">
                          {day.estimatedMinutes}m
                        </span>
                      )}

                      {/* Exam name hint */}
                      {day.examName && day.mode !== 'normal' && (
                        <span className="text-[9px] text-muted-foreground truncate max-w-[56px]">
                          {day.examName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-foreground">
              {[
                { dot: 'bg-emerald-500',  text: 'Normal' },
                { dot: 'bg-amber-400',    text: 'Rotation' },
                { dot: 'bg-orange-500',   text: 'Exam soon' },
                { dot: 'bg-rose-600',     text: 'Exam day' },
              ].map(({ dot, text }) => (
                <span key={text} className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {text}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
