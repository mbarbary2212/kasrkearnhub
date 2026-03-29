import { cn } from '@/lib/utils';

interface ModuleReadinessBarProps {
  /** Readiness percentage 0-100, or undefined/null if no data */
  readiness?: number | null;
}

/**
 * Slim 6px progress bar with "X% Ready" label for module cards.
 * Color rules: ≥80 green, 20-79 accent (teal), <20 amber, null = "Not started"
 */
export function ModuleReadinessBar({ readiness }: ModuleReadinessBarProps) {
  if (readiness == null || readiness <= 0) {
    return (
      <p className="text-[11px] text-muted-foreground mt-1.5">Not started</p>
    );
  }

  const barColor =
    readiness >= 80
      ? 'bg-green-500'
      : readiness >= 20
        ? 'bg-accent'
        : 'bg-amber-500';

  const labelColor =
    readiness >= 80
      ? 'text-green-600 dark:text-green-400'
      : readiness >= 20
        ? 'text-accent-foreground'
        : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="mt-1.5 space-y-0.5">
      {/* Bar track */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(readiness, 100)}%` }}
        />
      </div>
      <p className={cn('text-[11px] font-medium', labelColor)}>
        {readiness}% Ready
      </p>
    </div>
  );
}
