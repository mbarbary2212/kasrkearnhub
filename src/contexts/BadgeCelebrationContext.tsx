import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Badge } from '@/hooks/useBadges';

interface BadgeCelebrationContextType {
  celebrateBadge: (badge: Badge) => void;
  currentBadge: Badge | null;
  isShowing: boolean;
  dismiss: () => void;
  badgeQueue: Badge[];
}

const BadgeCelebrationContext = createContext<BadgeCelebrationContextType | undefined>(undefined);

export function BadgeCelebrationProvider({ children }: { children: ReactNode }) {
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [isShowing, setIsShowing] = useState(false);

  const showNextBadge = useCallback(() => {
    setBadgeQueue((queue) => {
      if (queue.length === 0) {
        setCurrentBadge(null);
        setIsShowing(false);
        return [];
      }
      const [next, ...rest] = queue;
      setCurrentBadge(next);
      setIsShowing(true);
      return rest;
    });
  }, []);

  const celebrateBadge = useCallback((badge: Badge) => {
    setBadgeQueue((queue) => {
      const newQueue = [...queue, badge];
      // If not currently showing, start showing
      if (!currentBadge) {
        setCurrentBadge(badge);
        setIsShowing(true);
        return queue; // Don't add to queue if we're showing it immediately
      }
      return newQueue;
    });
  }, [currentBadge]);

  const dismiss = useCallback(() => {
    setIsShowing(false);
    // Show next badge after a short delay
    setTimeout(() => {
      showNextBadge();
    }, 300);
  }, [showNextBadge]);

  return (
    <BadgeCelebrationContext.Provider value={{ celebrateBadge, currentBadge, isShowing, dismiss, badgeQueue }}>
      {children}
    </BadgeCelebrationContext.Provider>
  );
}

export function useBadgeCelebration() {
  const context = useContext(BadgeCelebrationContext);
  if (!context) {
    throw new Error('useBadgeCelebration must be used within a BadgeCelebrationProvider');
  }
  return context;
}
