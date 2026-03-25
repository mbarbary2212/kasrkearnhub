import { cn } from '@/lib/utils';
import { getModuleStatus } from '@/lib/readinessLabels';

interface ModuleReadinessBarProps {
  /** Readiness percentage 0-100, or undefined/null if no data */
  readiness?: number | null;
}

/**
 * Slim 6px progress bar with "X% Ready" label and status badge for module cards.
 * Color rules: ≥80 green, 20-79 accent (teal), <20 amber, null = "Not started"
 */
export function ModuleReadinessBar({ readiness }: ModuleReadinessBarProps) {
  const status = getModuleStatus(readiness);

  if (readiness == null || readiness <= 0) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5">
        <p className="text-[11px] text-muted-foreground">Not started</p>
      </div>
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

  const statusColors = {
    default: 'text-muted-foreground',
    weak: 'text-amber-600 dark:text-amber-400',
    strong: 'text-green-600 dark:text-green-400',
    progress: 'text-accent-foreground',
  };

  return (
    <div className="mt-1.5 space-y-0.5">
      {/* Bar track */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(readiness, 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <p className={cn('text-[11px] font-medium', labelColor)}>
          {readiness}% Ready
        </p>
        <span className={cn('text-[10px]', statusColors[status.variant])}>
          · {status.label}
        </span>
      </div>
    </div>
  );
}
