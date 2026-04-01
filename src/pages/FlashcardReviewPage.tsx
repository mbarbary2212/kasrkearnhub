import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Maximize2, Minimize2, CalendarClock, BookOpen, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashcardProgressBar } from '@/components/study/FlashcardProgressBar';
import { useDueCards, useUpcomingCardCounts } from '@/hooks/useFSRS';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useFullscreen } from '@/hooks/useFullscreen';
import { FlashcardContent } from '@/hooks/useStudyResources';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/AuthContext';
import FSRSRatingButtons from '@/components/study/FSRSRatingButtons';
import { MaterialReactionRow } from '@/components/shared/MaterialReactionRow';

export default function FlashcardReviewPage() {
  const navigate = useNavigate();
  const { data: dueReviews, isLoading } = useDueCards();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(containerRef);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [ratingCounts, setRatingCounts] = useState<Record<string, number>>({
    Again: 0, Hard: 0, Good: 0, Easy: 0,
  });

  const cards = useMemo(() => dueReviews ?? [], [dueReviews]);

  // Chapter breakdown tags
  const chapterBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    cards.forEach(c => {
      const label = c.chapterTitle || 'General';
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [cards]);

  const advanceToNext = useCallback(() => {
    if (!cards.length) return;
    if (currentIndex >= cards.length - 1) {
      setCompleted(true);
      return;
    }
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [currentIndex, cards]);

  const handlePrev = useCallback(() => {
    if (transitioning || !cards.length || currentIndex === 0) return;
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => setCurrentIndex(prev => prev - 1), 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [currentIndex, cards, transitioning]);

  useSwipeGesture(containerRef, { onSwipeLeft: advanceToNext, onSwipeRight: handlePrev });

  const handleExit = async () => {
    if (isFullscreen) await exitFullscreen();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (!cards.length && !completed) {
    return <NoCardsDueScreen />;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-foreground">Revision complete!</h2>
        <p className="text-muted-foreground">You reviewed {cards.length} card{cards.length > 1 ? 's' : ''}.</p>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="text-red-500 font-medium">{ratingCounts.Again} Again</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-orange-500 font-medium">{ratingCounts.Hard} Hard</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-green-500 font-medium">{ratingCounts.Good} Good</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-blue-500 font-medium">{ratingCounts.Easy} Easy</span>
        </div>
        <Button size="lg" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const current = cards[currentIndex];
  const content = current.content as unknown as FlashcardContent;

  // Build fsrsState object for FSRSRatingButtons (needs DB row shape)
  const fsrsState = {
    due: current.due,
    stability: current.stability,
    difficulty: current.difficulty,
    elapsed_days: current.elapsedDays,
    scheduled_days: current.scheduledDays,
    reps: current.reps,
    lapses: current.lapses,
    state: current.fsrsState,
    last_review: current.lastReview,
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 border-b bg-background z-50">
        <Button variant="ghost" size="sm" onClick={handleExit} className="gap-1.5">
          <XCircle className="w-4 h-4" /> Exit
        </Button>
        <div className="flex items-center gap-1.5 flex-wrap justify-center flex-1 px-2">
          {chapterBreakdown.map(([ch, count]) => (
            <span key={ch} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              {ch} ({count})
            </span>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={isFullscreen ? exitFullscreen : enterFullscreen}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-full max-w-md">
          {/* Flip Card */}
          <div className="perspective-1000 cursor-pointer relative">
            <div
              className={`absolute inset-0 bg-background rounded-xl z-10 transition-opacity duration-150 ${
                transitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
            <div
              onClick={() => setFlipped(v => !v)}
              className={`relative w-full min-h-56 transform-style-3d ${
                transitioning ? 'invisible' : 'visible'
              } ${flipped ? 'rotate-y-180' : ''}`}
              style={{ transition: transitioning ? 'none' : 'transform 500ms' }}
            >
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-card shadow-lg p-6 flex flex-col items-center justify-start text-center overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Question</div>
                <div className="text-base font-medium text-foreground whitespace-pre-wrap pb-4">{content.front}</div>
              </div>
              <div className="absolute inset-0 backface-hidden rounded-xl border-2 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg p-6 flex flex-col items-center justify-start text-center rotate-y-180 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2 shrink-0">Answer</div>
                <div className="text-base font-medium text-foreground whitespace-pre-wrap pb-4">{content.back}</div>
              </div>
            </div>
          </div>

          <FlashcardProgressBar current={currentIndex + 1} total={cards.length} />

          {/* Rating buttons - shown after flip */}
          {flipped ? (
            <FSRSRatingButtons
              cardId={current.cardId}
              fsrsState={fsrsState}
              visible={flipped}
              onRated={(rating) => {
                setRatingCounts(prev => ({ ...prev, [rating]: (prev[rating] || 0) + 1 }));
                advanceToNext();
              }}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground mt-4">Tap card to reveal answer</p>
          )}
        </div>
      </div>

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

// ─── No Cards Due Screen ──────────────────────────────────────
function NoCardsDueScreen() {
  const navigate = useNavigate();
  const { data: upcoming } = useUpcomingCardCounts();

  const totalUpcoming = (upcoming?.tomorrow ?? 0) + (upcoming?.inWeek ?? 0) + (upcoming?.inMonth ?? 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6 text-center">
      <CalendarClock className="w-12 h-12 text-muted-foreground" />
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">No cards due right now 🎉</h2>
        {totalUpcoming > 0 && (
          <p className="text-muted-foreground">
            You have upcoming reviews scheduled.
          </p>
        )}
      </div>

      {totalUpcoming > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {(upcoming?.tomorrow ?? 0) > 0 && (
            <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
              <span className="font-semibold">{upcoming!.tomorrow}</span> tomorrow
            </div>
          )}
          {(upcoming?.inWeek ?? 0) > 0 && (
            <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
              <span className="font-semibold">{upcoming!.inWeek}</span> this week
            </div>
          )}
          {(upcoming?.inMonth ?? 0) > 0 && (
            <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
              <span className="font-semibold">{upcoming!.inMonth}</span> this month
            </div>
          )}
        </div>
      )}

      <Button onClick={() => navigate('/')} className="gap-2 mt-2">
        <Home className="w-4 h-4" /> Go Home
      </Button>
    </div>
  );
}
