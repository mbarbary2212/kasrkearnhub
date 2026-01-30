import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';

interface FlashcardDeckProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

interface GroupedDeck {
  title: string;
  cards: { front: string; back: string; resource: StudyResource }[];
}

export function FlashcardDeck({ resources, canManage, onEdit }: FlashcardDeckProps) {
  // Group flashcards by title
  const groups = useMemo(() => {
    const map = new Map<string, { front: string; back: string; resource: StudyResource }[]>();
    for (const resource of resources) {
      const content = resource.content as FlashcardContent;
      const title = resource.title;
      if (!map.has(title)) map.set(title, []);
      map.get(title)!.push({ front: content.front, back: content.back, resource });
    }
    return Array.from(map.entries()).map(([title, cards]) => ({
      title,
      cards,
    }));
  }, [resources]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No flashcards available
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <FlashcardDeckGroup
          key={group.title}
          deckTitle={group.title}
          cards={group.cards}
          canManage={canManage}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

interface FlashcardDeckGroupProps {
  deckTitle: string;
  cards: { front: string; back: string; resource: StudyResource }[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

const TIMING_OPTIONS = [
  { value: '3000', label: '3s' },
  { value: '5000', label: '5s' },
  { value: '7000', label: '7s' },
];

function FlashcardDeckGroup({ deckTitle, cards, canManage, onEdit }: FlashcardDeckGroupProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoReturn, setAutoReturn] = useState(true);
  const [autoFlipMs, setAutoFlipMs] = useState(5000);

  const current = cards[index];

  // Auto-return after showing answer
  useEffect(() => {
    if (!flipped || !autoReturn) return;
    const t = setTimeout(() => setFlipped(false), autoFlipMs);
    return () => clearTimeout(t);
  }, [flipped, autoReturn, autoFlipMs]);

  if (!cards.length) return null;

  const handlePrev = () => {
    setFlipped(false);
    setIndex((v) => (v - 1 + cards.length) % cards.length);
  };

  const handleNext = () => {
    setFlipped(false);
    setIndex((v) => (v + 1) % cards.length);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestResourceDelete('flashcard', current.resource.id, current.resource.title);
  };

  return (
    <div className="rounded-xl border bg-card p-3 max-w-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-medium text-sm text-foreground truncate">{deckTitle}</div>
        <div
          className="flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {canManage && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(current.resource);
                }}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          <span className="text-xs text-muted-foreground shrink-0 ml-1">
            {index + 1}/{cards.length}
          </span>
        </div>
      </div>

      {/* Flip Card Container */}
      <div 
        className="perspective-1000 cursor-pointer mb-3"
        onClick={() => setFlipped((v) => !v)}
      >
        <div 
          className={`relative w-full h-36 transition-transform duration-500 transform-style-3d ${
            flipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-lg border bg-primary/5 p-4 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">Question</div>
            <div className="text-sm font-medium text-foreground line-clamp-4">{current.front}</div>
          </div>
          {/* Back */}
          <div className="absolute inset-0 backface-hidden rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-4 flex flex-col items-center justify-center text-center rotate-y-180">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">Answer</div>
            <div className="text-sm font-medium text-foreground line-clamp-4">{current.back}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handlePrev}
          disabled={cards.length <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={autoReturn}
              onCheckedChange={(checked) => setAutoReturn(checked === true)}
              className="h-3.5 w-3.5"
            />
            Auto
          </label>
          <Select
            value={String(autoFlipMs)}
            onValueChange={(v) => setAutoFlipMs(Number(v))}
            disabled={!autoReturn}
          >
            <SelectTrigger className="h-6 w-14 text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleNext}
          disabled={cards.length <= 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
