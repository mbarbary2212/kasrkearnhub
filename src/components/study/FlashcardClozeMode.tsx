import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Star, ChevronDown, ChevronUp, Maximize2, Minimize2, Eye, PenLine } from 'lucide-react';
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

interface FlashcardClozeModeProps {
  cards: StudyResource[];
  markedIds?: Set<string>;
  onToggleMark?: (id: string) => void;
  availableTopics?: string[];
  chapterId?: string;
  topicId?: string;
  /** When true, only show cloze cards and display empty state if none exist */
  clozeOnly?: boolean;
}

interface TopicGroup {
  topic: string;
  cards: { front: string; back: string; resource: StudyResource }[];
}

const CLOZE_REGEX = /\{\{c\d+::(.+?)\}\}/g;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isClozeCard(content: FlashcardContent): boolean {
  return content.card_type === 'cloze' && !!content.cloze_text && CLOZE_REGEX.test(content.cloze_text);
}

function renderClozeText(clozeText: string, revealed: boolean): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\{\{c\d+::(.+?)\}\}/g;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(clozeText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{clozeText.slice(lastIndex, match.index)}</span>);
    }
    if (revealed) {
      parts.push(
        <span key={key++} className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-semibold">
          {match[1]}
        </span>
      );
    } else {
      parts.push(
        <span key={key++} className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-sm">
          [...]
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < clozeText.length) {
    parts.push(<span key={key++}>{clozeText.slice(lastIndex)}</span>);
  }

  return parts;
}

export function FlashcardClozeMode({
  cards,
  markedIds,
  onToggleMark,
  availableTopics = [],
  chapterId,
  topicId,
  clozeOnly = false,
}: FlashcardClozeModeProps) {
  const { settings, setSelectedTopics, setShuffle } = useFlashcardSettings({ chapterId, topicId });

  const [topicSectionOpen, setTopicSectionOpen] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flipped, setFlipped] = useState(false); // for non-cloze fallback
  const [shuffledCards, setShuffledCards] = useState<{ front: string; back: string; resource: StudyResource }[] | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(cardContainerRef);
  
  // Filter to cloze-only cards when clozeOnly is true
  const safeCards = useMemo(() => {
    const base = cards ?? [];
    if (!clozeOnly) return base;
    return base.filter(r => {
      const content = r.content as FlashcardContent;
      return content.card_type === 'cloze' && !!content.cloze_text && /\{\{c\d+::(.+?)\}\}/.test(content.cloze_text);
    });
  }, [cards, clozeOnly]);

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

  const allTopicNames = useMemo(() => topicGroups.map(g => g.topic), [topicGroups]);

  const selectedTopics = useMemo(() => {
    const stored = settings.selectedTopics;
    if (!stored.length || !stored.some(t => allTopicNames.includes(t))) {
      return new Set(allTopicNames);
    }
    return new Set(stored.filter(t => allTopicNames.includes(t)));
  }, [settings.selectedTopics, allTopicNames]);

  const filteredCards = useMemo(() => {
    return topicGroups
      .filter(g => selectedTopics.has(g.topic))
      .flatMap(g => g.cards);
  }, [topicGroups, selectedTopics]);

  const displayCards = shuffledCards ?? filteredCards;
  const currentCard = displayCards[cardIndex];
  const currentContent = currentCard?.resource?.content as FlashcardContent | undefined;
  const isCurrentCloze = currentContent ? isClozeCard(currentContent) : false;
  const isCurrentMarked = currentCard && markedIds?.has(currentCard.resource.id);
  const { data: fsrsState } = useCardState(currentCard?.resource?.id);

  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
    setRevealed(false);
    setShuffledCards(null);
  }, [filteredCards.length]);

  useEffect(() => {
    if (settings.shuffle && filteredCards.length > 0) {
      setShuffledCards(shuffleArray(filteredCards));
    } else {
      setShuffledCards(null);
    }
  }, [settings.shuffle, filteredCards]);

  const toggleTopic = useCallback((topic: string) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(topic)) newSet.delete(topic);
    else newSet.add(topic);
    if (newSet.size === allTopicNames.length || newSet.size === 0) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics([...newSet]);
    }
  }, [selectedTopics, allTopicNames.length, setSelectedTopics]);

  const toggleAllTopics = useCallback((selectAll: boolean) => {
    setSelectedTopics([]);
  }, [setSelectedTopics]);

  const handlePrev = useCallback(() => {
    if (!displayCards.length || transitioning) return;
    setTransitioning(true);
    setFlipped(false);
    setRevealed(false);
    setTimeout(() => {
      setCardIndex((v) => (v - 1 + displayCards.length) % displayCards.length);
    }, 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [displayCards.length, transitioning]);

  const handleNext = useCallback(() => {
    if (!displayCards.length || transitioning) return;
    setTransitioning(true);
    setFlipped(false);
    setRevealed(false);
    setTimeout(() => {
      setCardIndex((v) => (v + 1) % displayCards.length);
    }, 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [displayCards.length, transitioning]);

  const handleShuffle = useCallback(() => {
    if (filteredCards.length === 0) return;
    setShuffledCards(shuffleArray(filteredCards));
    setShuffle(true);
    setCardIndex(0);
    setFlipped(false);
    setRevealed(false);
  }, [filteredCards, setShuffle]);

  const handleReset = () => {
    setCardIndex(0);
    setFlipped(false);
    setRevealed(false);
    setShuffledCards(null);
    setShuffle(false);
  };

  const handleReveal = useCallback(() => {
    if (!revealed) setRevealed(true);
  }, [revealed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isCurrentCloze) {
          handleReveal();
        } else {
          setFlipped(v => !v);
        }
      }
      if (e.key === 's' || e.key === 'S') handleShuffle();
      if (e.key === 'm' || e.key === 'M') {
        if (currentCard && onToggleMark) onToggleMark(currentCard.resource.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, handleShuffle, handleReveal, isCurrentCloze, currentCard, onToggleMark]);

  useSwipeGesture(cardContainerRef, {
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  if (safeCards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <PenLine className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
        <p>{clozeOnly ? 'No cloze cards available in this chapter.' : 'No flashcards available'}</p>
        {clozeOnly && (
          <p className="text-sm mt-1">Cloze cards use the <code className="bg-muted px-1 rounded text-xs">{'{{c1::answer}}'}</code> syntax. Upload them via Bulk Upload.</p>
        )}
      </div>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No cards match your current topic selection.</p>
        <Button variant="link" onClick={() => setSelectedTopics([])}>Show all topics</Button>
      </div>
    );
  }

  return (
    <div ref={cardContainerRef} className={cn("flex flex-col items-center gap-6 py-4", isFullscreen && "min-h-screen justify-center bg-background")}>
      {/* Topic selector */}
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
                {topicSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-xs text-muted-foreground">Quick actions:</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleAllTopics(true)}>
                    Select All
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {topicGroups.map((group) => (
                    <div key={group.topic} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`cloze-topic-${group.topic}`}
                        checked={selectedTopics.has(group.topic)}
                        onCheckedChange={() => toggleTopic(group.topic)}
                      />
                      <label htmlFor={`cloze-topic-${group.topic}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                        <span className="truncate">{group.topic}</span>
                        <span className="text-xs text-muted-foreground ml-2">{group.cards.length} cards</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Main card area */}
      {currentCard && (
        <div className="w-full max-w-md">
          <div className="perspective-1000 relative">
            {/* Star + fullscreen buttons */}
            <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1">
              {onToggleMark && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleMark(currentCard.resource.id); }}
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
                onClick={(e) => { e.stopPropagation(); isFullscreen ? exitFullscreen() : enterFullscreen(); }}
                className="p-2 rounded-full transition-colors bg-background border shadow-sm hover:bg-muted text-muted-foreground/60 hover:text-foreground"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
            </div>

            {/* Transition overlay */}
            <div className={`absolute inset-0 bg-background rounded-xl z-10 transition-opacity duration-150 ${transitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

            {isCurrentCloze ? (
              /* ========== CLOZE CARD ========== */
              <div className="rounded-xl border-2 bg-card shadow-lg p-6 min-h-56 flex flex-col">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-3 text-center shrink-0">Fill in the blank</div>
                <div className="text-base font-medium text-foreground leading-relaxed flex-1 whitespace-pre-wrap">
                  {renderClozeText(currentContent!.cloze_text!, revealed)}
                </div>

                {!revealed && (
                  <Button onClick={handleReveal} className="mt-4 gap-2 self-center" variant="default">
                    <Eye className="w-4 h-4" />
                    Reveal Answer
                  </Button>
                )}

                {revealed && currentContent?.extra && (
                  <div className="mt-4">
                    <div className="text-xs uppercase text-amber-600 dark:text-amber-400 tracking-wide font-medium mb-1">Extra</div>
                    <div className="border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-muted-foreground rounded-r-md">
                      {currentContent.extra}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ========== NON-CLOZE FLIP CARD ========== */
              <div
                onClick={() => setFlipped(v => !v)}
                className={`relative w-full min-h-56 transform-style-3d cursor-pointer ${transitioning ? 'invisible' : 'visible'} ${flipped ? 'rotate-y-180' : ''}`}
                style={{ transition: transitioning ? 'none' : 'transform 500ms' }}
              >
                <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-card shadow-lg p-6 flex flex-col items-center justify-start text-center overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                  <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Question</div>
                  <div className="text-base font-medium text-foreground whitespace-pre-wrap pb-4">{currentCard.front}</div>
                </div>
                <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg p-6 flex flex-col items-center justify-start text-center rotate-y-180 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                  <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Answer</div>
                  <div className="text-base font-medium text-foreground whitespace-pre-wrap pb-4">{currentCard.back}</div>
                </div>
              </div>
            )}
          </div>

          <FlashcardProgressBar current={cardIndex + 1} total={displayCards.length} />

          {/* FSRS Rating */}
          <FSRSRatingButtons
            cardId={currentCard?.resource?.id}
            fsrsState={fsrsState ?? null}
            visible={isCurrentCloze ? revealed : flipped}
            onRated={(rating) => {
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
              <Button variant="default" size="icon" onClick={handlePrev} disabled={displayCards.length <= 1} className="h-16 w-16 md:h-10 md:w-10 shrink-0 rounded-xl shadow-lg">
                <ChevronLeft className="w-10 h-10 md:w-5 md:h-5" />
              </Button>

              <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleReset} className="h-10 w-10 md:h-9 md:w-auto md:px-3">
                      <RotateCcw className="w-5 h-5 md:w-3.5 md:h-3.5" />
                      <span className="hidden md:inline md:ml-1 text-xs">Reset</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Reset</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={shuffledCards ? 'secondary' : 'ghost'} size="icon" onClick={handleShuffle} disabled={displayCards.length <= 1} className="h-10 w-10 md:h-9 md:w-auto md:px-3">
                      <Shuffle className="w-5 h-5 md:w-3.5 md:h-3.5" />
                      <span className="hidden md:inline md:ml-1 text-xs">Shuffle</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">Shuffle</TooltipContent>
                </Tooltip>
              </div>

              <Button variant="default" size="icon" onClick={handleNext} disabled={displayCards.length <= 1} className="h-16 w-16 md:h-10 md:w-10 shrink-0 rounded-xl shadow-lg">
                <ChevronRight className="w-10 h-10 md:w-5 md:h-5" />
              </Button>
            </div>
          </TooltipProvider>

          <div className="hidden md:block text-center text-xs text-muted-foreground mt-4">
            Arrow keys to navigate • Space/Enter to {isCurrentCloze ? 'reveal' : 'flip'} • S to shuffle • M to mark
          </div>
        </div>
      )}

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
