import { ClassifiedChapter, ModuleClassification } from '@/lib/classifyChapters';
import { AggregatedClassification } from '@/hooks/useYearClassification';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, RotateCcw, Sparkles, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast } from 'date-fns';

interface ClassificationDashboardProps {
  classification: AggregatedClassification;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

function ChapterItem({ ch, chapterTitleMap, moduleNameMap, label, cta, ctaClassName, bgClassName, onNavigate, tab }: {
  ch: ClassifiedChapter;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
  label?: string;
  cta: string;
  ctaClassName?: string;
  bgClassName?: string;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
  tab?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg transition-colors', bgClassName || 'bg-muted/40 hover:bg-muted/60')}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {chapterTitleMap.get(ch.chapter_id) || 'Chapter'}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {moduleNameMap.get(ch.module_id) || ''}
        </p>
        {label && <p className="text-xs text-muted-foreground mt-0.5">{label}</p>}
      </div>
      <Button
        size="sm"
        variant="outline"
        className={cn('shrink-0 h-8 text-xs', ctaClassName)}
        onClick={() => onNavigate(ch.module_id, ch.chapter_id, tab)}
      >
        {cta}
      </Button>
    </div>
  );
}

// ─── Today's Focus ─────────────────────────────────────────────

function TodaysFocus({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const items: { chapter: ClassifiedChapter; tag: string; cta: string; tab: string }[] = [];

  for (const ch of classification.review_due) {
    if (items.length >= 2) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id))
      items.push({ chapter: ch, tag: 'Review', cta: 'Review', tab: 'resources' });
  }
  for (const ch of classification.weaknesses) {
    if (items.length >= 2) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id))
      items.push({ chapter: ch, tag: 'Weak', cta: 'Practice', tab: 'practice' });
  }
  for (const ch of classification.improve) {
    if (items.length >= 2) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id))
      items.push({ chapter: ch, tag: 'Improve', cta: 'Revise', tab: 'resources' });
  }

  if (items.length === 0) return null;

  const tagColor: Record<string, string> = {
    Review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    Weak: 'bg-destructive/10 text-destructive',
    Improve: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today's Focus</h3>
        </div>
        <div className="space-y-2">
          {items.map(({ chapter, tag, cta, tab }) => (
            <div
              key={chapter.chapter_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {chapterTitleMap.get(chapter.chapter_id) || 'Chapter'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {moduleNameMap.get(chapter.module_id) || ''}
                </p>
                <Badge variant="secondary" className={cn('text-[10px] mt-1', tagColor[tag])}>
                  {tag}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="default"
                className="shrink-0 h-8 text-xs"
                onClick={() => onNavigate(chapter.module_id, chapter.chapter_id, tab)}
              >
                {cta}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Needs Attention (Weaknesses) ──────────────────────────────

function NeedsAttention({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { weaknesses } = classification;

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Needs Attention</h3>
        </div>
        {weaknesses.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-muted-foreground">You're doing well. Keep progressing.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weaknesses.slice(0, 3).map(ch => (
              <ChapterItem
                key={ch.chapter_id}
                ch={ch}
                chapterTitleMap={chapterTitleMap}
                moduleNameMap={moduleNameMap}
                label="Low accuracy"
                cta="Practice"
                ctaClassName="border-destructive/30 text-destructive hover:bg-destructive/10"
                bgClassName="bg-destructive/5 hover:bg-destructive/10"
                onNavigate={onNavigate}
                tab="practice"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Improve Now ───────────────────────────────────────────────

function ImproveNow({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { improve } = classification;
  if (improve.length === 0) return null;

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Improve Now</h3>
        </div>
        <div className="space-y-2">
          {improve.slice(0, 3).map(ch => (
            <ChapterItem
              key={ch.chapter_id}
              ch={ch}
              chapterTitleMap={chapterTitleMap}
              moduleNameMap={moduleNameMap}
              label="Strengthen understanding"
              cta="Revise"
              bgClassName="bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
              onNavigate={onNavigate}
              tab="resources"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Good Progress (Emerging Strengths) ────────────────────────

function GoodProgress({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { emerging_strengths } = classification;
  if (emerging_strengths.length === 0) return null;

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Good Progress</h3>
        </div>
        <div className="space-y-2">
          {emerging_strengths.slice(0, 3).map(ch => (
            <ChapterItem
              key={ch.chapter_id}
              ch={ch}
              chapterTitleMap={chapterTitleMap}
              moduleNameMap={moduleNameMap}
              label="Almost mastered"
              cta="Keep going"
              ctaClassName="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
              bgClassName="bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Review Due ────────────────────────────────────────────────

function ReviewDueSection({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { review_due } = classification;

  return (
    <Card>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review Due</h3>
        </div>
        {review_due.length === 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-muted-foreground">No reviews due today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {review_due.slice(0, 3).map(ch => {
              const reviewDate = ch.next_review_at ? new Date(ch.next_review_at) : null;
              const isOverdue = reviewDate ? isPast(reviewDate) : false;
              const timeLabel = reviewDate
                ? isOverdue
                  ? `Overdue · ${formatDistanceToNow(reviewDate, { addSuffix: false })} ago`
                  : 'Due today'
                : 'Due today';

              return (
                <div
                  key={ch.chapter_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-orange-50/50 hover:bg-orange-50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {chapterTitleMap.get(ch.chapter_id) || 'Chapter'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {moduleNameMap.get(ch.module_id) || ''}
                    </p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      isOverdue ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground'
                    )}>
                      {timeLabel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/40"
                    onClick={() => onNavigate(ch.module_id, ch.chapter_id, 'resources')}
                  >
                    Review
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────

export function ClassificationDashboard({
  classification,
  chapterTitleMap,
  moduleNameMap,
  onNavigate,
}: ClassificationDashboardProps) {
  const props = { classification, chapterTitleMap, moduleNameMap, onNavigate };

  return (
    <div className="space-y-4">
      <TodaysFocus {...props} />
      <NeedsAttention {...props} />
      <ImproveNow {...props} />
      <GoodProgress {...props} />
      <ReviewDueSection {...props} />
    </div>
  );
}
