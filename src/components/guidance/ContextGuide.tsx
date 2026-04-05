import { useState } from 'react';
import { X, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContextGuideProps {
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  variant?: 'info' | 'warning' | 'success';
  storageKey?: string;
  alwaysShow?: boolean;
}

const variantConfig = {
  info: {
    bg: 'bg-primary/5 border-primary/20',
    icon: Lightbulb,
    iconColor: 'text-primary',
  },
  warning: {
    bg: 'bg-amber-500/5 border-amber-500/20',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  success: {
    bg: 'bg-emerald-500/5 border-emerald-500/20',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
};

export function ContextGuide({
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'info',
  storageKey,
  alwaysShow = false,
}: ContextGuideProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (alwaysShow) return false;
    if (storageKey) return localStorage.getItem(storageKey) === 'true';
    return false;
  });

  if (dismissed) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleDismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  return (
    <div className={cn('relative rounded-xl border p-4 mb-4 animate-fade-in', config.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          {(primaryAction || secondaryAction) && (
            <div className="flex items-center gap-2 mt-2.5">
              {primaryAction && (
                <Button size="sm" className="h-7 text-xs px-3" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
        {storageKey && !alwaysShow && (
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
