import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
  const [shuffledCards, setShuffledCards] = useState<typeof groups[0]['cards'] | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);

  const activeDeck = groups[activeDeckIndex];
  const displayCards = shuffledCards || activeDeck?.cards || [];
  const currentCard = displayCards[cardIndex];

  // Reset card index and shuffle state when switching decks
  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
    setShuffledCards(null);
    setIsShuffled(false);
  }, [activeDeckIndex]);

  // Auto-return after showing answer
  useEffect(() => {
    if (!flipped || !autoReturn) return;
    const t = setTimeout(() => setFlipped(false), autoFlipMs);
    return () => clearTimeout(t);
  }, [flipped, autoReturn, autoFlipMs]);

  const handleShuffle = useCallback(() => {
    if (!activeDeck) return;
    const shuffled = shuffleArray(activeDeck.cards);
    setShuffledCards(shuffled);
    setIsShuffled(true);
    setCardIndex(0);
    setFlipped(false);
  }, [activeDeck]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((v) => !v);
      }
      if (e.key === 's' || e.key === 'S') {
        handleShuffle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayCards.length, handleShuffle]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No flashcards available
      </div>
    );
  }

  const handlePrev = () => {
    if (!displayCards.length) return;
    setFlipped(false);
    setCardIndex((v) => (v - 1 + displayCards.length) % displayCards.length);
  };

  const handleNext = () => {
    if (!displayCards.length) return;
    setFlipped(false);
    setCardIndex((v) => (v + 1) % displayCards.length);
  };

  const handleReset = () => {
    setCardIndex(0);
    setFlipped(false);
    setShuffledCards(null);
    setIsShuffled(false);
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
            Card {cardIndex + 1} of {displayCards.length}
            {isShuffled && <span className="ml-2 text-primary">(Shuffled)</span>}
          </div>

          {/* Navigation controls */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-between mt-4 gap-2">
              <Button
                variant="default"
                size="icon"
                onClick={handlePrev}
                disabled={displayCards.length <= 1}
                className="h-16 w-16 md:h-10 md:w-10 shrink-0 rounded-full shadow-lg"
              >
                <ChevronLeft className="w-10 h-10 md:w-5 md:h-5" />
              </Button>

              <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReset}
                      className="h-10 w-10 md:h-9 md:w-auto md:px-3"
                    >
                      <RotateCcw className="w-5 h-5 md:w-3.5 md:h-3.5" />
                      <span className="hidden md:inline md:ml-1 text-xs">Reset</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Reset</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isShuffled ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={handleShuffle}
                      disabled={displayCards.length <= 1}
                      className="h-10 w-10 md:h-9 md:w-auto md:px-3"
                    >
                      <Shuffle className="w-5 h-5 md:w-3.5 md:h-3.5" />
                      <span className="hidden md:inline md:ml-1 text-xs">Shuffle</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Shuffle</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer h-10 px-2">
                      <Checkbox
                        checked={autoReturn}
                        onCheckedChange={(checked) => setAutoReturn(checked === true)}
                        className="h-4 w-4 md:h-3.5 md:w-3.5"
                      />
                      <span className="hidden md:inline">Auto-flip</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Auto-flip</TooltipContent>
                </Tooltip>
                
                <Select
                  value={String(autoFlipMs)}
                  onValueChange={(v) => setAutoFlipMs(Number(v))}
                  disabled={!autoReturn}
                >
                  <SelectTrigger className="h-8 w-14 text-xs px-2">
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
                variant="default"
                size="icon"
                onClick={handleNext}
                disabled={displayCards.length <= 1}
                className="h-16 w-16 md:h-10 md:w-10 shrink-0 rounded-full shadow-lg"
              >
                <ChevronRight className="w-10 h-10 md:w-5 md:h-5" />
              </Button>
            </div>
          </TooltipProvider>

          {/* Keyboard hint - hide on mobile */}
          <div className="hidden md:block text-center text-xs text-muted-foreground mt-4">
            Arrow keys to navigate • Space/Enter to flip • S to shuffle
          </div>
        </div>
      )}
    </div>
  );
}
