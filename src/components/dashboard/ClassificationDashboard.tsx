import { ClassifiedChapter } from '@/lib/classifyChapters';
import { AggregatedClassification } from '@/hooks/useYearClassification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, RotateCcw, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, formatDistanceToNow } from 'date-fns';

interface ClassificationDashboardProps {
  classification: AggregatedClassification;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

function CompactItem({ ch, chapterTitleMap, moduleNameMap, label, cta, onNavigate, tab, ctaClassName }: {
  ch: ClassifiedChapter;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
  label?: string;
  cta: string;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
  tab?: string;
  ctaClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">
          {chapterTitleMap.get(ch.chapter_id) || 'Chapter'}
        </p>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {moduleNameMap.get(ch.module_id) || ''}
          {label && <span className="ml-1">· {label}</span>}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className={cn('shrink-0 h-7 text-[11px] px-2.5', ctaClassName)}
        onClick={() => onNavigate(ch.module_id, ch.chapter_id, tab)}
      >
        {cta}
      </Button>
    </div>
  );
}

// ─── Today's Plan ──────────────────────────────────────────────

function TodaysPlan({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const items: { chapter: ClassifiedChapter; tag: string; cta: string; tab: string }[] = [];

  for (const ch of classification.review_due) {
    if (items.length >= 3) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id))
      items.push({ chapter: ch, tag: 'Review', cta: 'Review', tab: 'resources' });
  }
  for (const ch of classification.weaknesses) {
    if (items.length >= 3) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id))
      items.push({ chapter: ch, tag: 'Weak', cta: 'Practice', tab: 'practice' });
  }
  for (const ch of classification.improve) {
    if (items.length >= 3) break;
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
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-1">
        <Target className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's Plan</h3>
      </div>
      {items.map(({ chapter, tag, cta, tab }) => (
        <div key={chapter.chapter_id} className="flex items-center gap-2 py-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">
              {chapterTitleMap.get(chapter.chapter_id) || 'Chapter'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className={cn('text-[9px] px-1.5 py-0 h-4', tagColor[tag])}>
                {tag}
              </Badge>
              <span className="text-[10px] text-muted-foreground truncate">
                {moduleNameMap.get(chapter.module_id) || ''}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            className="shrink-0 h-7 text-[11px] px-2.5"
            onClick={() => onNavigate(chapter.module_id, chapter.chapter_id, tab)}
          >
            {cta}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Needs Attention ───────────────────────────────────────────

function NeedsAttention({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { weaknesses } = classification;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-1">
        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs Attention</h3>
      </div>
      {weaknesses.length === 0 ? (
        <div className="flex items-center gap-1.5 py-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs text-muted-foreground">You're doing well. Keep progressing.</p>
        </div>
      ) : (
        weaknesses.slice(0, 3).map(ch => (
          <CompactItem
            key={ch.chapter_id}
            ch={ch}
            chapterTitleMap={chapterTitleMap}
            moduleNameMap={moduleNameMap}
            label="Low accuracy"
            cta="Practice"
            ctaClassName="border-destructive/30 text-destructive hover:bg-destructive/10"
            onNavigate={onNavigate}
            tab="practice"
          />
        ))
      )}
    </div>
  );
}

// ─── Improve / Review ──────────────────────────────────────────

function ImproveReview({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { improve, review_due } = classification;
  
  // Merge improve + review_due, deduplicated, max 3
  const seen = new Set<string>();
  const items: { ch: ClassifiedChapter; label: string; cta: string; tab: string; ctaClassName?: string }[] = [];

  for (const ch of review_due) {
    if (items.length >= 3) break;
    if (seen.has(ch.chapter_id)) continue;
    seen.add(ch.chapter_id);
    const reviewDate = ch.next_review_at ? new Date(ch.next_review_at) : null;
    const isOverdue = reviewDate ? isPast(reviewDate) : false;
    const timeLabel = reviewDate
      ? isOverdue ? `Overdue · ${formatDistanceToNow(reviewDate, { addSuffix: false })} ago` : 'Due today'
      : 'Due today';
    items.push({
      ch,
      label: timeLabel,
      cta: 'Review',
      tab: 'resources',
      ctaClassName: 'border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400',
    });
  }

  for (const ch of improve) {
    if (items.length >= 3) break;
    if (seen.has(ch.chapter_id)) continue;
    seen.add(ch.chapter_id);
    items.push({ ch, label: 'Strengthen', cta: 'Revise', tab: 'resources' });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-1">
        <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Improve & Review</h3>
      </div>
      {items.map(({ ch, label, cta, tab, ctaClassName }) => (
        <CompactItem
          key={ch.chapter_id}
          ch={ch}
          chapterTitleMap={chapterTitleMap}
          moduleNameMap={moduleNameMap}
          label={label}
          cta={cta}
          ctaClassName={ctaClassName}
          onNavigate={onNavigate}
          tab={tab}
        />
      ))}
    </div>
  );
}

// ─── Main Dashboard (compact, for right column) ────────────────

export function ClassificationDashboard({
  classification,
  chapterTitleMap,
  moduleNameMap,
  onNavigate,
}: ClassificationDashboardProps) {
  const props = { classification, chapterTitleMap, moduleNameMap, onNavigate };

  return (
    <div className="space-y-4 divide-y divide-border/50">
      <TodaysPlan {...props} />
      <div className="pt-3"><NeedsAttention {...props} /></div>
      <div className="pt-3"><ImproveReview {...props} /></div>
    </div>
  );
}
