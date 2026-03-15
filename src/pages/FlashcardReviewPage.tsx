import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashcardProgressBar } from '@/components/study/FlashcardProgressBar';
import { useDueReviews, useMarkReviewsComplete } from '@/hooks/useScheduledReviews';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useFullscreen } from '@/hooks/useFullscreen';
import { FlashcardContent } from '@/hooks/useStudyResources';
import { Skeleton } from '@/components/ui/skeleton';
import { FlashcardRatingButtons } from '@/components/study/FlashcardRatingButtons';

export default function FlashcardReviewPage() {
  const navigate = useNavigate();
  const { data: dueReviews, isLoading } = useDueReviews();
  const markComplete = useMarkReviewsComplete();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(containerRef);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [completed, setCompleted] = useState(false);

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

  const handleNext = useCallback(() => {
    if (transitioning || !cards.length) return;
    if (currentIndex >= cards.length - 1) {
      // Complete
      const reviewIds = cards.map(c => c.reviewId);
      markComplete.mutate(reviewIds);
      setCompleted(true);
      return;
    }
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [currentIndex, cards, transitioning, markComplete]);

  const handlePrev = useCallback(() => {
    if (transitioning || !cards.length || currentIndex === 0) return;
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => setCurrentIndex(prev => prev - 1), 250);
    setTimeout(() => setTransitioning(false), 400);
  }, [currentIndex, cards, transitioning]);

  useSwipeGesture(containerRef, { onSwipeLeft: handleNext, onSwipeRight: handlePrev });

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4">
        <p className="text-lg text-muted-foreground">No cards due for review! 🎉</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  if (completed) {
    // Find next due date from all scheduled reviews
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-foreground">Revision complete!</h2>
        <p className="text-muted-foreground">You reviewed {cards.length} card{cards.length > 1 ? 's' : ''}.</p>
        <Button size="lg" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const current = cards[currentIndex];
  const content = current.content as unknown as FlashcardContent;

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

          <FlashcardRatingButtons cardId={current.cardId} visible={true} />

          <FlashcardProgressBar current={currentIndex + 1} total={cards.length} />

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
              ← Prev
            </Button>
            <Button onClick={handleNext}>
              {currentIndex === cards.length - 1 ? 'Finish →' : 'Next →'}
            </Button>
          </div>
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
