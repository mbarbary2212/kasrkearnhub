import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (Date.now() - ts > DISMISS_DAYS * 86400000) {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  return true;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // Check viewport ≤1024
    const mql = window.matchMedia('(max-width: 1024px)');
    if (!mql.matches) return;

    if (isIOS()) {
      setIsIOSDevice(true);
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[49] bg-card border-t border-border shadow-lg animate-fade-in">
      <div className="container max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-sm text-foreground">Install KALM Hub</p>
            {isIOSDevice ? (
              <p className="text-xs text-muted-foreground">
                Tap <Share className="inline h-3 w-3 -mt-0.5" /> then <span className="font-medium">"Add to Home Screen"</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Add to your home screen for quick access</p>
            )}
          </div>

          {/* Actions */}
          {!isIOSDevice && deferredPrompt && (
            <Button size="sm" onClick={install} className="flex-shrink-0 h-8 text-xs">
              Install
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={dismiss}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
