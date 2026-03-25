import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useMcqAnalyticsById } from '@/hooks/useMcqAnalytics';
import type { Mcq, McqChoice } from '@/hooks/useMcqs';
import type { OsceQuestion } from '@/hooks/useOsceQuestions';

interface QuestionStatsCardProps {
  questionId: string;
  questionType: 'mcq' | 'sba' | 'osce';
  isCorrect: boolean | null;
  wasSkipped: boolean;
  question: Mcq | OsceQuestion;
}

const COLORS = {
  correct: 'hsl(142 71% 45%)',   // medical-green
  wrong: 'hsl(0 84% 60%)',       // destructive
  skipped: 'hsl(215 16% 47%)',   // muted-foreground
};

function MiniDonut({
  data,
  label,
  sublabel,
}: {
  data: { name: string; value: number; color: string }[];
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={22}
              outerRadius={36}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-foreground">{label}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{sublabel}</span>
    </div>
  );
}

export function QuestionStatsCard({
  questionId,
  questionType,
  isCorrect,
  wasSkipped,
  question,
}: QuestionStatsCardProps) {
  const { data: analytics } = useMcqAnalyticsById(
    questionType !== 'osce' ? questionId : undefined
  );

  // User donut data
  const userDonut = useMemo(() => {
    if (wasSkipped) {
      return [
        { name: 'Skipped', value: 1, color: COLORS.skipped },
      ];
    }
    if (isCorrect) {
      return [{ name: 'Correct', value: 1, color: COLORS.correct }];
    }
    return [{ name: 'Wrong', value: 1, color: COLORS.wrong }];
  }, [isCorrect, wasSkipped]);

  const userLabel = wasSkipped ? 'Skip' : isCorrect ? '✓' : '✗';
  const userSublabel = wasSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Wrong';

  // Cohort donut data (MCQ/SBA only)
  const cohortDonut = useMemo(() => {
    if (!analytics || questionType === 'osce') return null;
    const facility = analytics.facility_index;
    if (facility === null || facility === undefined) return null;
    const correctPct = Math.round(facility * 100);
    const wrongPct = 100 - correctPct;
    return [
      { name: 'Correct', value: correctPct, color: COLORS.correct },
      { name: 'Wrong', value: wrongPct, color: COLORS.wrong },
    ];
  }, [analytics, questionType]);

  const cohortLabel = cohortDonut
    ? `${cohortDonut[0].value}%`
    : '—';

  // Option distribution (MCQ/SBA only)
  const distribution = useMemo(() => {
    if (!analytics?.distractor_analysis || questionType === 'osce') return null;
    const dist = analytics.distractor_analysis as Record<string, number>;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const mcq = question as Mcq;
    const entries = Object.entries(dist)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        key,
        count,
        percentage: Math.round((count / total) * 100),
        isCorrect: key === mcq.correct_key,
      }));

    const mostSelected = entries.reduce((max, e) => e.count > max.count ? e : max, entries[0]);

    return { entries, mostSelected: mostSelected?.key, total };
  }, [analytics, questionType, question]);

  return (
    <Card>
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Question Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-4 space-y-4">
        {/* Donut comparison */}
        <div className="flex items-center justify-center gap-6">
          <MiniDonut data={userDonut} label={userLabel} sublabel={`You: ${userSublabel}`} />
          {cohortDonut ? (
            <MiniDonut data={cohortDonut} label={cohortLabel} sublabel="Students" />
          ) : questionType === 'osce' ? (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Score-based</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">No cohort data</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.correct }} />
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.wrong }} />
            Wrong
          </span>
          {wasSkipped && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.skipped }} />
              Skipped
            </span>
          )}
        </div>

        {/* Option distribution - MCQ/SBA only */}
        {questionType !== 'osce' && distribution ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Response Distribution
            </p>
            {distribution.entries.map((entry) => {
              const mcq = question as Mcq;
              return (
                <div key={entry.key} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    'w-5 font-semibold text-center',
                    entry.isCorrect && 'text-green-600 dark:text-green-400',
                  )}>
                    {entry.key}
                  </span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        entry.isCorrect ? 'bg-green-500/60' : 'bg-primary/30',
                      )}
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                  <span className={cn(
                    'text-[10px] w-8 text-right tabular-nums',
                    entry.key === distribution.mostSelected && 'font-bold',
                  )}>
                    {entry.percentage}%
                  </span>
                </div>
              );
            })}
            {analytics?.total_attempts && (
              <p className="text-[10px] text-muted-foreground text-right">
                {analytics.total_attempts} total responses
              </p>
            )}
          </div>
        ) : questionType !== 'osce' ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Response statistics not yet available
          </p>
        ) : null}

        {/* OSCE score-based feedback */}
        {questionType === 'osce' && (
          <p className="text-xs text-muted-foreground text-center py-1">
            Score-based analytics for OSCE questions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
