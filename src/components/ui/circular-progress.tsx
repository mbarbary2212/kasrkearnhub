import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  strokeWidth?: number;
}

const sizeConfig = {
  sm: { size: 48, fontSize: 'text-xs', labelSize: 'text-[8px]', defaultStroke: 5 },
  md: { size: 96, fontSize: 'text-xl', labelSize: 'text-xs', defaultStroke: 8 },
  lg: { size: 128, fontSize: 'text-2xl', labelSize: 'text-sm', defaultStroke: 10 },
};

export function CircularProgress({
  value,
  size = 'md',
  showLabel = true,
  label,
  className,
  strokeWidth,
}: CircularProgressProps) {
  const config = sizeConfig[size];
  const actualStrokeWidth = strokeWidth ?? config.defaultStroke;
  const radius = (config.size - actualStrokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  // Color based on value ranges
  const getColor = () => {
    if (value >= 70) return 'stroke-accent';
    if (value >= 40) return 'stroke-amber-500';
    return 'stroke-destructive';
  };

  const getGlowColor = () => {
    if (value >= 70) return 'drop-shadow-[0_0_6px_hsl(var(--accent))]';
    if (value >= 40) return 'drop-shadow-[0_0_6px_hsl(25_95%_53%)]';
    return '';
  };

  return (
    <div 
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: config.size, height: config.size }}
    >
      <svg
        className={cn(
          "transform -rotate-90 transition-all duration-500",
          value === 100 && "animate-pulse-glow",
          value >= 70 && getGlowColor()
        )}
        width={config.size}
        height={config.size}
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={actualStrokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          strokeWidth={actualStrokeWidth}
          strokeLinecap="round"
          className={cn(getColor(), "transition-all duration-700 ease-out")}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      
      {/* Center content */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold font-heading", config.fontSize)}>
            {Math.round(value)}%
          </span>
          {label && (
            <span className={cn("text-muted-foreground", config.labelSize)}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
