import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';

interface FlashcardsStudentViewProps {
  cards: StudyResource[];
}

interface GroupedDeck {
  title: string;
  cards: { front: string; back: string; resource: StudyResource }[];
}

const TIMING_OPTIONS = [
  { value: '3000', label: '3s' },
  { value: '5000', label: '5s' },
  { value: '7000', label: '7s' },
];

export function FlashcardsStudentView({ cards }: FlashcardsStudentViewProps) {
  // Group flashcards by title into decks
  const groups = useMemo(() => {
    const map = new Map<string, { front: string; back: string; resource: StudyResource }[]>();
    for (const resource of cards) {
      const content = resource.content as FlashcardContent;
      const title = resource.title;
      if (!map.has(title)) map.set(title, []);
      map.get(title)!.push({ front: content.front, back: content.back, resource });
    }
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      cards: items,
    }));
  }, [cards]);

  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoReturn, setAutoReturn] = useState(true);
  const [autoFlipMs, setAutoFlipMs] = useState(5000);

  const activeDeck = groups[activeDeckIndex];
  const currentCard = activeDeck?.cards[cardIndex];

  // Reset card index when switching decks
  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
  }, [activeDeckIndex]);

  // Auto-return after showing answer
  useEffect(() => {
    if (!flipped || !autoReturn) return;
    const t = setTimeout(() => setFlipped(false), autoFlipMs);
    return () => clearTimeout(t);
  }, [flipped, autoReturn, autoFlipMs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDeck?.cards.length]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No flashcards available
      </div>
    );
  }

  const handlePrev = () => {
    if (!activeDeck) return;
    setFlipped(false);
    setCardIndex((v) => (v - 1 + activeDeck.cards.length) % activeDeck.cards.length);
  };

  const handleNext = () => {
    if (!activeDeck) return;
    setFlipped(false);
    setCardIndex((v) => (v + 1) % activeDeck.cards.length);
  };

  const handleReset = () => {
    setCardIndex(0);
    setFlipped(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Deck selector (if multiple decks) */}
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {groups.map((group, i) => (
            <Button
              key={group.title}
              variant={i === activeDeckIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveDeckIndex(i)}
              className="text-xs"
            >
              {group.title} ({group.cards.length})
            </Button>
          ))}
        </div>
      )}

      {/* Single deck title */}
      {groups.length === 1 && (
        <div className="text-lg font-semibold text-foreground">{activeDeck?.title}</div>
      )}

      {/* Main flashcard */}
      {currentCard && (
        <div className="w-full max-w-md">
          {/* Flip Card */}
          <div
            className="perspective-1000 cursor-pointer"
            onClick={() => setFlipped((v) => !v)}
          >
            <div
              className={`relative w-full h-56 transition-transform duration-500 transform-style-3d ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-card shadow-lg p-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Question</div>
                <div className="text-base font-medium text-foreground">{currentCard.front}</div>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg p-6 flex flex-col items-center justify-center text-center rotate-y-180">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Answer</div>
                <div className="text-base font-medium text-foreground">{currentCard.back}</div>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            Card {cardIndex + 1} of {activeDeck?.cards.length}
          </div>

          {/* Navigation controls */}
          <div className="flex items-center justify-between mt-4 gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={!activeDeck || activeDeck.cards.length <= 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={autoReturn}
                  onCheckedChange={(checked) => setAutoReturn(checked === true)}
                  className="h-3.5 w-3.5"
                />
                Auto-flip
              </label>
              <Select
                value={String(autoFlipMs)}
                onValueChange={(v) => setAutoFlipMs(Number(v))}
                disabled={!autoReturn}
              >
                <SelectTrigger className="h-7 w-16 text-xs px-2">
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
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={!activeDeck || activeDeck.cards.length <= 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Keyboard hint */}
          <div className="text-center text-xs text-muted-foreground mt-4">
            Use arrow keys to navigate • Space/Enter to flip
          </div>
        </div>
      )}
    </div>
  );
}
