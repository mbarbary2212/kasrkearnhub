import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Star, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StudyResource, FlashcardContent } from '@/hooks/useStudyResources';
import { useFlashcardSettings } from '@/hooks/useFlashcardSettings';
import { useCardState } from '@/hooks/useFSRS';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useFullscreen } from '@/hooks/useFullscreen';
import { FlashcardProgressBar } from './FlashcardProgressBar';
import FSRSRatingButtons from './FSRSRatingButtons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FlashcardsStudentViewProps {
  cards: StudyResource[];
  markedIds?: Set<string>;
  onToggleMark?: (id: string) => void;
  availableTopics?: string[];
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  onActiveItemChange?: (item: { item_id: string; item_label: string; item_index: number }) => void;
}

interface TopicGroup {
  topic: string;
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

export function FlashcardsStudentView({ 
  cards, 
  markedIds, 
  onToggleMark, 
  availableTopics = [],
  chapterId,
  topicId,
  onActiveItemChange,
}: FlashcardsStudentViewProps) {
  // Persisted settings - supports both chapter and topic
  const { 
    settings, 
    setSelectedTopics, 
    setShuffle 
  } = useFlashcardSettings({ chapterId, topicId });

  const [topicSectionOpen, setTopicSectionOpen] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoReturn, setAutoReturn] = useState(false);
  const [autoFlipMs, setAutoFlipMs] = useState(5000);
  const [shuffledCards, setShuffledCards] = useState<{ front: string; back: string; resource: StudyResource }[] | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(cardContainerRef);
  // Defensive: ensure cards is always an array
  const safeCards = cards ?? [];

  // Group all cards by topic
  const topicGroups = useMemo<TopicGroup[]>(() => {
    const map = new Map<string, { front: string; back: string; resource: StudyResource }[]>();
    for (const resource of safeCards) {
      const content = resource.content as FlashcardContent;
      const topic = resource.title;
      if (!map.has(topic)) map.set(topic, []);
      map.get(topic)!.push({ front: content.front, back: content.back, resource });
    }
    return Array.from(map.entries())
      .map(([topic, items]) => ({ topic, cards: items }))
      .sort((a, b) => a.topic.localeCompare(b.topic));
  }, [safeCards]);

  // All topic names
  const allTopicNames = useMemo(() => topicGroups.map(g => g.topic), [topicGroups]);

  // Selected topics from settings (empty means "all")
  const selectedTopics = useMemo(() => {
    const stored = settings.selectedTopics;
    // If empty or contains topics not in current list, select all
    if (!stored.length || !stored.some(t => allTopicNames.includes(t))) {
      return new Set(allTopicNames);
    }
    return new Set(stored.filter(t => allTopicNames.includes(t)));
  }, [settings.selectedTopics, allTopicNames]);

  // Filtered cards based on selected topics
  const filteredCards = useMemo(() => {
    return topicGroups
      .filter(g => selectedTopics.has(g.topic))
      .flatMap(g => g.cards);
  }, [topicGroups, selectedTopics]);

  // Display cards (shuffled or not)
  const displayCards = shuffledCards ?? filteredCards;
  const currentCard = displayCards[cardIndex];
  const isCurrentMarked = currentCard && markedIds?.has(currentCard.resource.id);
  const { data: fsrsState } = useCardState(currentCard?.resource?.id);

  // Report active card to parent for position tracking
  useEffect(() => {
    if (currentCard && onActiveItemChange) {
      onActiveItemChange({
        item_id: currentCard.resource.id,
        item_label: currentCard.front || 'Flashcard',
        item_index: cardIndex,
      });
    }
  }, [currentCard?.resource?.id, cardIndex, onActiveItemChange]);

  // Reset when filtered cards change
  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
    setShuffledCards(null);
  }, [filteredCards.length]);

  // Apply shuffle from settings
  useEffect(() => {
    if (settings.shuffle && filteredCards.length > 0) {
      setShuffledCards(shuffleArray(filteredCards));
    } else {
      setShuffledCards(null);
    }
  }, [settings.shuffle, filteredCards]);

  // Toggle topic selection
  const toggleTopic = useCallback((topic: string) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(topic)) {
      newSet.delete(topic);
    } else {
      newSet.add(topic);
    }
    // If all selected or none selected, store empty array (means "all")
    if (newSet.size === allTopicNames.length || newSet.size === 0) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics([...newSet]);
    }
  }, [selectedTopics, allTopicNames.length, setSelectedTopics]);

  // Select/deselect all topics
  const toggleAllTopics = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics([]);
    }
  }, [setSelectedTopics]);

  // Auto-flip logic
  useEffect(() => {
    if (!autoReturn || displayCards.length <= 1) return;
    
    const questionTime = Math.round(autoFlipMs * (2 / 3));
    const answerTime = autoFlipMs - questionTime;
    
    if (!flipped) {
      const t = setTimeout(() => setFlipped(true), questionTime);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setTransitioning(true);
        setFlipped(false);
        
        setTimeout(() => {
          setCardIndex((v) => (v + 1) % displayCards.length);
        }, 250);
        
        setTimeout(() => {
          setTransitioning(false);
        }, 400);
      }, answerTime);
      return () => clearTimeout(t);
    }
  }, [flipped, autoReturn, autoFlipMs, cardIndex, displayCards.length]);

  const handleShuffle = useCallback(() => {
    if (filteredCards.length === 0) return;
    const shuffled = shuffleArray(filteredCards);
    setShuffledCards(shuffled);
    setShuffle(true);
    setCardIndex(0);
    setFlipped(false);
  }, [filteredCards, setShuffle]);

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
      if (e.key === 'm' || e.key === 'M') {
        if (currentCard && onToggleMark) {
          onToggleMark(currentCard.resource.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayCards.length, handleShuffle, currentCard, onToggleMark]);

  const handlePrev = () => {
    if (!displayCards.length || transitioning) return;
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => {
      setCardIndex((v) => (v - 1 + displayCards.length) % displayCards.length);
    }, 250);
    setTimeout(() => {
      setTransitioning(false);
    }, 400);
  };

  const handleNext = () => {
    if (!displayCards.length || transitioning) return;
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => {
      setCardIndex((v) => (v + 1) % displayCards.length);
    }, 250);
    setTimeout(() => {
      setTransitioning(false);
    }, 400);
  };

  const handleReset = () => {
    setCardIndex(0);
    setFlipped(false);
    setShuffledCards(null);
    setShuffle(false);
  };

  // Swipe gesture - must be after handler declarations
  useSwipeGesture(cardContainerRef, {
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  if (safeCards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No flashcards available
      </div>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No cards match your current topic selection.</p>
        <Button variant="link" onClick={() => setSelectedTopics([])}>
          Show all topics
        </Button>
      </div>
    );
  }

  return (
    <div ref={cardContainerRef} className={cn("flex flex-col items-center gap-6 py-4", isFullscreen && "min-h-screen justify-center bg-background")}>
      {/* Topic selector (like slideshow) */}
      {allTopicNames.length > 1 && (
        <div className="w-full max-w-md">
          <Collapsible open={topicSectionOpen} onOpenChange={setTopicSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" size="sm">
                <span className="text-sm">
                  {selectedTopics.size === allTopicNames.length 
                    ? 'All Topics' 
                    : `${selectedTopics.size} of ${allTopicNames.length} Topics`}
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
                    <div
                      key={group.topic}
                      className="flex items-center gap-2 py-1"
                    >
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
        </div>
      )}

      {/* Main flashcard */}
      {currentCard && (
        <div className="w-full max-w-md">
          {/* Flip Card */}
          <div className="perspective-1000 cursor-pointer relative">
            {/* Mark for Review star */}
            <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1">
              {onToggleMark && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMark(currentCard.resource.id);
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
              onClick={() => setFlipped((v) => !v)}
              className={`relative w-full min-h-56 transform-style-3d ${
                transitioning ? 'invisible' : 'visible'
              } ${flipped ? 'rotate-y-180' : ''}`}
              style={{ transition: transitioning ? 'none' : 'transform 500ms' }}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-card shadow-lg p-6 flex flex-col items-center justify-start text-center overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Question</div>
                <div className="text-base font-medium text-foreground whitespace-pre-wrap pb-4">{currentCard.front}</div>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg p-6 flex flex-col items-center justify-start text-center rotate-y-180 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Answer</div>
                <div className="text-base font-medium text-foreground whitespace-pre-wrap pb-4">{currentCard.back}</div>
                {(currentCard.resource.content as FlashcardContent)?.extra && (
                  <div className="mt-2 w-full p-3 bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-500 rounded text-sm text-left">
                    <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">Extra:</span>
                    <div className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{(currentCard.resource.content as FlashcardContent).extra}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <FlashcardProgressBar current={cardIndex + 1} total={displayCards.length} />
          
          {/* Rating buttons - shown when card is flipped */}
          <FSRSRatingButtons
            cardId={currentCard?.resource?.id}
            fsrsState={fsrsState ?? null}
            visible={flipped}
            onRated={(rating) => {
              // Show next-due toast
              const due = fsrsState?.due;
              if (due) {
                const daysUntil = Math.round((new Date(due).getTime() - Date.now()) / 86400000);
                if (daysUntil <= 0) toast.success('Next review: today');
                else if (daysUntil === 1) toast.success('Next review: tomorrow');
                else toast.success(`Next review in ${daysUntil} days`);
              }
              handleNext();
            }}
          />
          {shuffledCards && <p className="text-center text-xs text-primary">(Shuffled)</p>}
          {isCurrentMarked && <p className="text-center text-xs text-amber-500">★ Marked</p>}

          {/* Navigation controls */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-between mt-4 gap-2">
              <Button
                variant="default"
                size="icon"
                onClick={handlePrev}
                disabled={displayCards.length <= 1}
                className="h-16 w-16 md:h-10 md:w-10 shrink-0 rounded-xl shadow-lg"
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
                      variant={shuffledCards ? 'secondary' : 'ghost'}
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
                className="h-16 w-16 md:h-10 md:w-10 shrink-0 rounded-xl shadow-lg"
              >
                <ChevronRight className="w-10 h-10 md:w-5 md:h-5" />
              </Button>
            </div>
          </TooltipProvider>

          {/* Keyboard hint */}
          <div className="hidden md:block text-center text-xs text-muted-foreground mt-4">
            Arrow keys to navigate • Space/Enter to flip • S to shuffle • M to mark
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
