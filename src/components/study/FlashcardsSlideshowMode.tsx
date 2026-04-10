import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Pause, Square, Shuffle, ChevronDown, ChevronUp, Star, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';
import { useFlashcardSettings } from '@/hooks/useFlashcardSettings';
import { useCardState } from '@/hooks/useFSRS';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useFullscreen } from '@/hooks/useFullscreen';
import { FlashcardProgressBar } from './FlashcardProgressBar';
import FSRSRatingButtons from './FSRSRatingButtons';
import { cn } from '@/lib/utils';

// Global admin constant: time to show question before auto-flip to answer
const QUESTION_TIME_BEFORE_FLIP_SECONDS = 3;

interface TopicGroup {
  topic: string;
  cards: StudyResource[];
}

interface FlashcardsSlideshowModeProps {
  cards: StudyResource[];
  markedIds?: Set<string>;
  onToggleMark?: (id: string) => void;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
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

export function FlashcardsSlideshowMode({ cards, markedIds, onToggleMark, chapterId, topicId }: FlashcardsSlideshowModeProps) {
  // Defensive: ensure cards is always an array
  const safeCards = cards ?? [];

  // Persisted settings - supports both chapter and topic
  const {
    settings,
    setSelectedTopics,
    setNumberOfCards,
    setIntervalSeconds,
    setShuffle,
  } = useFlashcardSettings({ chapterId, topicId });

  const [topicSectionOpen, setTopicSectionOpen] = useState<boolean>(false);
  const [state, setState] = useState<SlideshowState>('idle');
  const [sessionCards, setSessionCards] = useState<StudyResource[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(cardContainerRef);

  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived values needed for hooks
  const currentResource = sessionCards[currentIndex];
  const { data: slideshowFsrsState } = useCardState(currentResource?.id);

  // Swipe gestures for manual nav when paused
  const handleSwipePrev = useCallback(() => {
    if (state !== 'paused' || !sessionCards.length || currentIndex === 0) return;
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => setCurrentIndex(prev => prev - 1), 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [state, sessionCards.length, currentIndex]);

  const handleSwipeNext = useCallback(() => {
    if (state !== 'paused' || !sessionCards.length) return;
    if (currentIndex >= sessionCards.length - 1) return;
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [state, sessionCards.length, currentIndex]);

  useSwipeGesture(cardContainerRef, { onSwipeLeft: handleSwipeNext, onSwipeRight: handleSwipePrev });

  // Group cards by title (topic)
  const topicGroups = useMemo<TopicGroup[]>(() => {
    const groupMap = new Map<string, TopicGroup>();
    
    safeCards.forEach(card => {
      const topic = card.title;
      if (!groupMap.has(topic)) {
        groupMap.set(topic, { topic, cards: [] });
      }
      groupMap.get(topic)!.cards.push(card);
    });
    
    return Array.from(groupMap.values()).sort((a, b) => a.topic.localeCompare(b.topic));
  }, [safeCards]);

  const allTopicNames = useMemo(() => topicGroups.map(g => g.topic), [topicGroups]);

  // Selected topics from persisted settings
  const selectedTopics = useMemo(() => {
    const stored = settings.selectedTopics;
    // If empty or contains topics not in current list, select all
    if (!stored.length || !stored.some(t => allTopicNames.includes(t))) {
      return new Set(allTopicNames);
    }
    return new Set(stored.filter(t => allTopicNames.includes(t)));
  }, [settings.selectedTopics, allTopicNames]);

  // Flatten all cards based on selected topics
  const allCards = useMemo(() => {
    return safeCards
      .filter(card => selectedTopics.has(card.title))
      .map(card => ({
        ...card,
        content: card.content as FlashcardContent,
      }));
  }, [safeCards, selectedTopics]);

  // Toggle topic selection
  const toggleTopic = useCallback((topic: string) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(topic)) {
      newSet.delete(topic);
    } else {
      newSet.add(topic);
    }
    if (newSet.size === allTopicNames.length || newSet.size === 0) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics([...newSet]);
    }
  }, [selectedTopics, allTopicNames.length, setSelectedTopics]);

  // Select/deselect all topics
  const toggleAllTopics = useCallback((selectAll: boolean) => {
    setSelectedTopics([]);
  }, [setSelectedTopics]);

  // Calculate flip time based on interval
  const getFlipTime = useCallback((interval: number): number => {
    if (interval <= QUESTION_TIME_BEFORE_FLIP_SECONDS) {
      return Math.max(1, interval - 1);
    }
    return QUESTION_TIME_BEFORE_FLIP_SECONDS;
  }, []);

  const flipTime = getFlipTime(settings.intervalSeconds);
  const answerTime = settings.intervalSeconds - flipTime;

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
    if (settings.shuffle) {
      cardsToUse = shuffleArray(cardsToUse);
    }

    // Apply card count limit
    const cardCount = settings.numberOfCards === 'all' 
      ? cardsToUse.length 
      : Math.min(parseInt(settings.numberOfCards), cardsToUse.length);
    
    cardsToUse = cardsToUse.slice(0, cardCount);

    setSessionCards(cardsToUse);
    setCurrentIndex(0);
    setFlipped(false);
    setState('playing');
  }, [allCards, settings.shuffle, settings.numberOfCards]);

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
      setTransitioning(true);
      setFlipped(false);
      
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 250);
      
      setTimeout(() => {
        setTransitioning(false);
      }, 400);
    }
  }, [currentIndex, sessionCards.length, clearTimers]);

  // Handle card timing when playing
  useEffect(() => {
    if (state !== 'playing' || sessionCards.length === 0) return;

    flipTimerRef.current = setTimeout(() => {
      setFlipped(true);
    }, flipTime * 1000);

    advanceTimerRef.current = setTimeout(() => {
      advanceToNext();
    }, settings.intervalSeconds * 1000);

    return () => clearTimers();
  }, [state, currentIndex, sessionCards.length, flipTime, settings.intervalSeconds, advanceToNext, clearTimers]);

  const currentCard = sessionCards[currentIndex]?.content as FlashcardContent | undefined;
  const currentTitle = sessionCards[currentIndex]?.title;
  const progressPercent = sessionCards.length > 0 ? ((currentIndex + 1) / sessionCards.length) * 100 : 0;
  const isCurrentMarked = currentResource && markedIds?.has(currentResource.id);

  const canStart = allCards.length > 0;

  return (
    <div ref={cardContainerRef} className={cn("flex flex-col items-center gap-6 py-4", isFullscreen && "min-h-screen justify-center bg-background")}>
      {/* Settings (only when idle) */}
      {state === 'idle' && (
        <div className="w-full max-w-md space-y-4">
          <div className="text-center text-lg font-semibold text-foreground mb-4">
            Slideshow Revision Mode
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Number of Cards</label>
              <Select value={settings.numberOfCards} onValueChange={setNumberOfCards}>
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
              <Select value={String(settings.intervalSeconds)} onValueChange={(v) => setIntervalSeconds(Number(v))}>
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

          {/* Topic Selection */}
          {topicGroups.length > 1 && (
            <Collapsible open={topicSectionOpen} onOpenChange={setTopicSectionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" size="sm">
                  <span className="text-sm">
                    {selectedTopics.size === allTopicNames.length
                      ? 'All Topics'
                      : `${selectedTopics.size} of ${topicGroups.length} Topics`}
                  </span>
                  {topicSectionOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-xs text-muted-foreground">Quick actions:</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => toggleAllTopics(true)}
                      >
                        Select All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {topicGroups.map((group) => (
                      <div key={group.topic} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`topic-${group.topic}`}
                          checked={selectedTopics.has(group.topic)}
                          onCheckedChange={() => toggleTopic(group.topic)}
                        />
                        <label
                          htmlFor={`topic-${group.topic}`}
                          className="text-sm cursor-pointer flex-1 flex items-center justify-between"
                        >
                          <span className="truncate">{group.topic}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {group.cards.length} cards
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="shuffle"
              checked={settings.shuffle}
              onCheckedChange={(checked) => setShuffle(checked === true)}
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
      {(state === 'playing' || state === 'paused') && currentCard && currentResource && (
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                {currentTitle}
                {isCurrentMarked && <Star className="w-3 h-3 text-amber-500 fill-current" />}
              </span>
              <span>Card {currentIndex + 1} of {sessionCards.length}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="perspective-1000 relative">
            {/* Star + Fullscreen icons */}
            <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1">
              {onToggleMark && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMark(currentResource.id);
                  }}
                  className={cn(
                    'p-2 rounded-full transition-colors bg-background border shadow-sm hover:bg-muted',
                    isCurrentMarked ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                  )}
                  title={isCurrentMarked ? 'Remove from review' : 'Mark for review'}
                >
                  <Star className={cn('h-5 w-5', isCurrentMarked && 'fill-current')} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isFullscreen ? exitFullscreen() : enterFullscreen();
                }}
                className="p-2 rounded-full transition-colors bg-background border shadow-sm hover:bg-muted text-muted-foreground/60 hover:text-foreground"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            </div>

            {/* Transition blackout overlay */}
            <div 
              className={`absolute inset-0 bg-background rounded-xl z-10 transition-opacity duration-150 ${
                transitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
            
            <div
              className={`relative w-full min-h-64 transform-style-3d ${
                transitioning ? 'invisible' : 'visible'
              } ${flipped ? 'rotate-y-180' : ''}`}
              style={{ transition: transitioning ? 'none' : 'transform 500ms' }}
            >
              {/* Front (Question) */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-card shadow-lg p-6 flex flex-col items-center justify-start text-center overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Question</div>
                <div className="text-lg font-medium text-foreground whitespace-pre-wrap pb-4">{currentCard.front}</div>
              </div>
              {/* Back (Answer) */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg p-6 flex flex-col items-center justify-start text-center rotate-y-180 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Answer</div>
                <div className="text-lg font-medium text-foreground whitespace-pre-wrap pb-4">{currentCard.back}</div>
                {currentCard.extra && (
                  <div className="mt-2 w-full p-3 bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-500 rounded text-sm text-left">
                    <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">Extra:</span>
                    <div className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{currentCard.extra}</div>
                  </div>
                )}
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

          {/* FSRS Rating buttons - shown when paused and flipped */}
          <FSRSRatingButtons
            cardId={currentResource?.id}
            fsrsState={slideshowFsrsState ?? null}
            visible={state === 'paused' && flipped}
            onRated={() => handleResume()}
          />
        </div>
      )}

      {/* Completed state */}
      {state === 'completed' && (
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-2xl font-bold text-foreground">🎉 Well Done!</div>
          <p className="text-muted-foreground">
            You've reviewed all {sessionCards.length} cards.
          </p>
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

      {/* Floating Exit Fullscreen pill */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border shadow-lg rounded-full px-5 py-2 text-sm font-medium z-[10000] hover:bg-muted transition-colors"
        >
          ✕ Exit Fullscreen
        </button>
      )}
    </div>
  );
}
