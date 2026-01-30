import { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { cn } from '@/lib/utils';

/**
 * Sticky banner shown when admin is in impersonation or preview mode.
 * 
 * Two distinct banners:
 * - Amber banner: Real impersonation (Super Admin viewing as specific student)
 * - Blue banner: Preview Student UI (All admins, demo mode)
 * 
 * Impersonation takes priority if both are somehow active.
 */
export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    isPreviewStudentUI,
    effectiveUserName, 
    effectiveUserEmail,
    expiresAt, 
    endImpersonation,
    togglePreviewStudentUI,
    isLoading,
  } = useEffectiveUser();
  
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update countdown timer for impersonation
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

  // Priority: Impersonation > Preview
  if (isImpersonating) {
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

  // Preview Student UI Mode (Mode B)
  if (isPreviewStudentUI) {
    return (
      <div className={cn(
        "sticky top-16 z-40 w-full",
        "bg-blue-500/95 backdrop-blur-sm",
        "border-b border-blue-600",
        "py-2 px-4"
      )}>
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-blue-950">
            <Eye className="h-5 w-5 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Student UI Preview</span>
              <span className="text-blue-800 text-sm">(Demo Mode - No real data)</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={togglePreviewStudentUI}
            className="bg-white/90 hover:bg-white border-blue-600 text-blue-900 hover:text-blue-950"
          >
            <X className="h-4 w-4 mr-1" />
            Exit Preview
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
