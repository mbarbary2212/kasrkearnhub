import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, Square, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';

// Global admin constant: time to show question before auto-flip to answer
const QUESTION_TIME_BEFORE_FLIP_SECONDS = 3;

interface FlashcardsSlideshowModeProps {
  cards: StudyResource[];
}

const CARD_COUNT_OPTIONS = [
  { value: '10', label: '10 cards' },
  { value: '20', label: '20 cards' },
  { value: '30', label: '30 cards' },
  { value: 'all', label: 'All cards' },
];

const INTERVAL_OPTIONS = [
  { value: '3', label: '3s' },
  { value: '5', label: '5s' },
  { value: '7', label: '7s' },
  { value: '10', label: '10s' },
  { value: '15', label: '15s' },
];

type SlideshowState = 'idle' | 'playing' | 'paused' | 'completed';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FlashcardsSlideshowMode({ cards }: FlashcardsSlideshowModeProps) {
  // Settings
  const [cardCountSelection, setCardCountSelection] = useState<string>('20');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(7);
  const [shuffleEnabled, setSuffleEnabled] = useState<boolean>(false);

  // Slideshow state
  const [state, setState] = useState<SlideshowState>('idle');
  const [sessionCards, setSessionCards] = useState<StudyResource[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Timer refs
  const flipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten all cards
  const allCards = useMemo(() => {
    return cards.map(card => ({
      ...card,
      content: card.content as FlashcardContent,
    }));
  }, [cards]);

  // Calculate flip time based on interval
  const getFlipTime = useCallback((interval: number): number => {
    if (interval <= QUESTION_TIME_BEFORE_FLIP_SECONDS) {
      return Math.max(1, interval - 1);
    }
    return QUESTION_TIME_BEFORE_FLIP_SECONDS;
  }, []);

  const flipTime = getFlipTime(intervalSeconds);
  const answerTime = intervalSeconds - flipTime;

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  // Handle visibility change - pause when tab becomes inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state === 'playing') {
        handlePause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Start slideshow
  const handleStart = useCallback(() => {
    if (allCards.length === 0) return;

    let cardsToUse = [...allCards];
    
    // Apply shuffle if enabled
    if (shuffleEnabled) {
      cardsToUse = shuffleArray(cardsToUse);
    }

    // Apply card count limit
    const cardCount = cardCountSelection === 'all' 
      ? cardsToUse.length 
      : Math.min(parseInt(cardCountSelection), cardsToUse.length);
    
    cardsToUse = cardsToUse.slice(0, cardCount);

    setSessionCards(cardsToUse);
    setCurrentIndex(0);
    setFlipped(false);
    setState('playing');
  }, [allCards, shuffleEnabled, cardCountSelection]);

  // Pause slideshow
  const handlePause = useCallback(() => {
    clearTimers();
    setState('paused');
  }, [clearTimers]);

  // Resume slideshow
  const handleResume = useCallback(() => {
    setState('playing');
  }, []);

  // Stop slideshow
  const handleStop = useCallback(() => {
    clearTimers();
    setState('idle');
    setCurrentIndex(0);
    setFlipped(false);
    setSessionCards([]);
  }, [clearTimers]);

  // Advance to next card or complete
  const advanceToNext = useCallback(() => {
    if (currentIndex >= sessionCards.length - 1) {
      clearTimers();
      setState('completed');
    } else {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    }
  }, [currentIndex, sessionCards.length, clearTimers]);

  // Handle card timing when playing
  useEffect(() => {
    if (state !== 'playing' || sessionCards.length === 0) return;

    // Set timer to flip card
    flipTimerRef.current = setTimeout(() => {
      setFlipped(true);
    }, flipTime * 1000);

    // Set timer to advance to next card
    advanceTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, intervalSeconds * 1000);

    return () => clearTimers();
  }, [state, currentIndex, sessionCards.length, flipTime, intervalSeconds, advanceToNext, clearTimers]);

  const currentCard = sessionCards[currentIndex]?.content as FlashcardContent | undefined;
  const currentTitle = sessionCards[currentIndex]?.title;
  const progressPercent = sessionCards.length > 0 ? ((currentIndex + 1) / sessionCards.length) * 100 : 0;

  const canStart = allCards.length > 0;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Settings (only when idle) */}
      {state === 'idle' && (
        <div className="w-full max-w-md space-y-4">
          <div className="text-center text-lg font-semibold text-foreground mb-4">
            Slideshow Revision Mode
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Number of Cards</label>
              <Select value={cardCountSelection} onValueChange={setCardCountSelection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_COUNT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === 'all' ? `All (${allCards.length})` : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Interval per Card</label>
              <Select value={String(intervalSeconds)} onValueChange={(v) => setIntervalSeconds(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="shuffle"
              checked={shuffleEnabled}
              onCheckedChange={(checked) => setSuffleEnabled(checked === true)}
            />
            <label htmlFor="shuffle" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle cards
            </label>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Question: {flipTime}s → Answer: {answerTime}s → Next card
          </div>

          <Button 
            onClick={handleStart} 
            disabled={!canStart}
            className="w-full"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Slideshow
          </Button>

          {!canStart && (
            <div className="text-center text-sm text-muted-foreground">
              No cards available
            </div>
          )}
        </div>
      )}

      {/* Playing / Paused state */}
      {(state === 'playing' || state === 'paused') && currentCard && (
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{currentTitle}</span>
              <span>Card {currentIndex + 1} of {sessionCards.length}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Card */}
          <div className="perspective-1000">
            <div
              className={`relative w-full h-64 transition-transform duration-500 transform-style-3d ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front (Question) */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-card shadow-lg p-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Question</div>
                <div className="text-lg font-medium text-foreground">{currentCard.front}</div>
              </div>
              {/* Back (Answer) */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg p-6 flex flex-col items-center justify-center text-center rotate-y-180">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Answer</div>
                <div className="text-lg font-medium text-foreground">{currentCard.back}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {state === 'playing' ? (
              <Button onClick={handlePause} variant="outline" size="lg">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={handleResume} variant="outline" size="lg">
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
            <Button onClick={handleStop} variant="destructive" size="lg">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>

          {state === 'paused' && (
            <div className="text-center text-sm text-muted-foreground mt-3">
              Slideshow paused
            </div>
          )}
        </div>
      )}

      {/* Completed state */}
      {state === 'completed' && (
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-2xl font-semibold text-foreground">
            Slideshow completed!
          </div>
          <div className="text-muted-foreground">
            You reviewed {sessionCards.length} cards
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleStart} size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Again
            </Button>
            <Button onClick={handleStop} variant="outline" size="lg">
              Back to Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
