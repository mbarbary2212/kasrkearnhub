import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';

interface FlashcardDeckProps {
  resources: StudyResource[];
  autoFlipBackMs?: number;
}

interface GroupedDeck {
  title: string;
  cards: { front: string; back: string }[];
}

export function FlashcardDeck({ resources, autoFlipBackMs = 5000 }: FlashcardDeckProps) {
  // Group flashcards by title
  const groups = useMemo(() => {
    const map = new Map<string, { front: string; back: string }[]>();
    for (const resource of resources) {
      const content = resource.content as FlashcardContent;
      const title = resource.title;
      if (!map.has(title)) map.set(title, []);
      map.get(title)!.push({ front: content.front, back: content.back });
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
    <div className="space-y-4">
      {groups.map((group) => (
        <FlashcardDeckGroup
          key={group.title}
          deckTitle={group.title}
          cards={group.cards}
          autoFlipBackMs={autoFlipBackMs}
        />
      ))}
    </div>
  );
}

interface FlashcardDeckGroupProps {
  deckTitle: string;
  cards: { front: string; back: string }[];
  autoFlipBackMs: number;
}

function FlashcardDeckGroup({ deckTitle, cards, autoFlipBackMs }: FlashcardDeckGroupProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoReturn, setAutoReturn] = useState(true);

  const current = cards[index];

  // Auto-return after showing answer
  useEffect(() => {
    if (!flipped || !autoReturn) return;
    const t = setTimeout(() => setFlipped(false), autoFlipBackMs);
    return () => clearTimeout(t);
  }, [flipped, autoReturn, autoFlipBackMs]);

  if (!cards.length) return null;

  const handlePrev = () => {
    setFlipped(false);
    setIndex((v) => (v - 1 + cards.length) % cards.length);
  };

  const handleNext = () => {
    setFlipped(false);
    setIndex((v) => (v + 1) % cards.length);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-foreground">{deckTitle}</div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={autoReturn}
            onCheckedChange={(checked) => setAutoReturn(checked === true)}
          />
          Auto-return
        </label>
      </div>

      <div
        className="cursor-pointer select-none rounded-xl border bg-primary/5 p-6 text-center transition-all hover:bg-primary/10"
        onClick={() => setFlipped((v) => !v)}
      >
        <div className="text-xs uppercase text-muted-foreground tracking-wide">
          {flipped ? 'Answer' : 'Question'}
        </div>
        <div className="mt-3 text-lg font-medium text-foreground min-h-[60px] flex items-center justify-center">
          {flipped ? current.back : current.front}
        </div>
        <div className="mt-3 text-sm text-muted-foreground">Click to flip</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={cards.length <= 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Prev
        </Button>
        <div className="text-sm text-muted-foreground">
          {index + 1} / {cards.length}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={cards.length <= 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
