import { ClassifiedChapter } from '@/lib/classifyChapters';
import { AggregatedClassification } from '@/hooks/useYearClassification';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getStudyMode, type StudyMode } from '@/lib/studyModes';

interface ClassificationDashboardProps {
  classification: AggregatedClassification;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

/** Resolve the CTA label and tab from prescribed_study_mode, with category-aware fallbacks */
function resolveStudyAction(ch: ClassifiedChapter, fallbackLabel: string, fallbackTab: string): { label: string; tab: string } {
  if (ch.prescribed_study_mode) {
    return { label: ch.prescribed_study_mode.label, tab: ch.prescribed_study_mode.tab };
  }
  return { label: fallbackLabel, tab: fallbackTab };
}

function CompactItem({ ch, chapterTitleMap, moduleNameMap, cta, onNavigate, tab, ctaClassName }: {
  ch: ClassifiedChapter;
  chapterTitleMap: Map<string, string>;
  moduleNameMap: Map<string, string>;
  cta: string;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
  tab?: string;
  ctaClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-2 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-snug">
          {chapterTitleMap.get(ch.chapter_id) || 'Chapter'}
        </p>
        <p className="text-[11px] text-muted-foreground truncate leading-snug mt-0.5">
          {moduleNameMap.get(ch.module_id) || ''}
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
  const items: { chapter: ClassifiedChapter; cta: string; tab: string; ctaClassName?: string }[] = [];

  for (const ch of classification.review_due) {
    if (items.length >= 3) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id)) {
      const action = resolveStudyAction(ch, 'Review', 'resources');
      items.push({ chapter: ch, cta: action.label, tab: action.tab });
    }
  }
  for (const ch of classification.weaknesses) {
    if (items.length >= 3) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id)) {
      const action = resolveStudyAction(ch, 'Practice', 'practice');
      items.push({ chapter: ch, cta: action.label, tab: action.tab, ctaClassName: 'border-destructive/30 text-destructive hover:bg-destructive/10' });
    }
  }
  for (const ch of classification.improve) {
    if (items.length >= 3) break;
    if (!items.find(i => i.chapter.chapter_id === ch.chapter_id)) {
      const action = resolveStudyAction(ch, 'Revise', 'resources');
      items.push({ chapter: ch, cta: action.label, tab: action.tab });
    }
  }

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Today's Plan</h3>
      <div className="space-y-0.5">
        {items.map(({ chapter, cta, tab, ctaClassName }) => (
          <CompactItem
            key={chapter.chapter_id}
            ch={chapter}
            chapterTitleMap={chapterTitleMap}
            moduleNameMap={moduleNameMap}
            cta={cta}
            ctaClassName={ctaClassName}
            onNavigate={onNavigate}
            tab={tab}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Needs Attention ───────────────────────────────────────────

function NeedsAttention({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { weaknesses } = classification;
  if (weaknesses.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive/80 mb-2">Needs Attention</h3>
      <div className="space-y-0.5">
        {weaknesses.slice(0, 3).map(ch => {
          const action = resolveStudyAction(ch, 'Practice', 'practice');
          return (
            <CompactItem
              key={ch.chapter_id}
              ch={ch}
              chapterTitleMap={chapterTitleMap}
              moduleNameMap={moduleNameMap}
              cta={action.label}
              ctaClassName="border-destructive/30 text-destructive hover:bg-destructive/10"
              onNavigate={onNavigate}
              tab={action.tab}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Improve ───────────────────────────────────────────────────

function Improve({ classification, chapterTitleMap, moduleNameMap, onNavigate }: ClassificationDashboardProps) {
  const { improve } = classification;
  if (improve.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Improve</h3>
      <div className="space-y-0.5">
        {improve.slice(0, 2).map(ch => {
          const action = resolveStudyAction(ch, 'Revise', 'resources');
          return (
            <CompactItem
              key={ch.chapter_id}
              ch={ch}
              chapterTitleMap={chapterTitleMap}
              moduleNameMap={moduleNameMap}
              cta={action.label}
              onNavigate={onNavigate}
              tab={action.tab}
            />
          );
        })}
      </div>
    </div>
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
    <div className="space-y-6">
      <TodaysPlan {...props} />
      <NeedsAttention {...props} />
      <Improve {...props} />
    </div>
  );
}
