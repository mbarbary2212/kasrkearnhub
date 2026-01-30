import { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { cn } from '@/lib/utils';

/**
 * Sticky banner shown when admin is impersonating a student.
 * - Always visible during impersonation
 * - Shows student name and "View-Only Mode" indicator
 * - Countdown timer to session expiry
 * - Exit button to end impersonation
 */
export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    effectiveUserName, 
    effectiveUserEmail,
    expiresAt, 
    endImpersonation,
    isLoading,
  } = useEffectiveUser();
  
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update countdown timer
  useEffect(() => {
    if (!isImpersonating || !expiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isImpersonating, expiresAt]);

  if (!isImpersonating) {
    return null;
  }

  const displayName = effectiveUserName || effectiveUserEmail || 'Student';

  return (
    <div className={cn(
      "sticky top-16 z-40 w-full",
      "bg-amber-500/95 backdrop-blur-sm",
      "border-b border-amber-600",
      "py-2 px-4"
    )}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-amber-950">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">Viewing as:</span>
            <span className="font-medium">{displayName}</span>
            <span className="text-amber-800 text-sm">(View-Only Mode)</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {timeRemaining && (
            <div className="flex items-center gap-1.5 text-amber-900 text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{timeRemaining}</span>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={endImpersonation}
            disabled={isLoading}
            className="bg-white/90 hover:bg-white border-amber-600 text-amber-900 hover:text-amber-950"
          >
            <X className="h-4 w-4 mr-1" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
