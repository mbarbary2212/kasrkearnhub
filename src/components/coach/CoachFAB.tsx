import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCoachContext } from '@/contexts/CoachContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import studyCoachIcon from '@/assets/study-coach-icon.png';

/**
 * Floating Action Button for the Study Coach
 * - Appears on desktop/tablet only (bottom-right)
 * - Hidden on mobile (uses bottom nav instead)
 * - Navigates to /progress (Study Coach page)
 * - Shows for admins when in preview/impersonation mode
 */
export function CoachFAB() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const { shouldPulse, dismissPulse } = useCoachContext();
  const { isEffectivelyStudent } = useEffectiveUser();
  const isMobile = useIsMobile();

  // Don't show FAB for mobile users or if not logged in
  // Show for students OR admins in preview/impersonation mode
  if (isMobile || !user || (isAdmin && !isEffectivelyStudent)) {
    return null;
  }

  const handleClick = () => {
    dismissPulse();
    navigate('/progress');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Fixed positioning at bottom-right
        "fixed bottom-6 right-6 z-50",
        // Size and shape
        "h-14 w-14 rounded-full",
        // Shadow and depth
        "shadow-lg hover:shadow-xl",
        // Background and border
        "bg-card border-2 border-primary/20",
        // Animation and transitions
        "transition-all duration-300",
        "hover:scale-110 hover:border-primary/40",
        "active:scale-95",
        // Pulse animation when intervention needed
        shouldPulse && "animate-pulse ring-4 ring-primary/30",
        // Overflow handling
        "overflow-hidden p-1"
      )}
      title="Study Coach"
      aria-label="Open Study Coach"
    >
      <img
        src={studyCoachIcon}
        alt="Study Coach"
        className="h-full w-full object-contain rounded-full"
      />
    </button>
  );
}
