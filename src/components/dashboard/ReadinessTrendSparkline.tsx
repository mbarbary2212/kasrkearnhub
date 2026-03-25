import { cn } from '@/lib/utils';

interface ReadinessTrendSparklineProps {
  /** Array of readiness scores (most recent last), up to 14 data points */
  dataPoints: number[];
  className?: string;
}

export function ReadinessTrendSparkline({ dataPoints, className }: ReadinessTrendSparklineProps) {
  if (dataPoints.length < 2) return null;

  const width = 80;
  const height = 24;
  const padding = 2;
  const min = Math.max(0, Math.min(...dataPoints) - 5);
  const max = Math.min(100, Math.max(...dataPoints) + 5);
  const range = max - min || 1;

  const points = dataPoints.map((v, i) => {
    const x = padding + (i / (dataPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Fill area under the line
  const firstX = padding;
  const lastX = padding + ((dataPoints.length - 1) / (dataPoints.length - 1)) * (width - padding * 2);
  const areaPath = `M ${firstX},${height - padding} L ${polyline} L ${lastX},${height - padding} Z`;

  // Determine trend color
  const last = dataPoints[dataPoints.length - 1];
  const prev = dataPoints[dataPoints.length - 2];
  const trending = last > prev ? 'up' : last < prev ? 'down' : 'flat';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('inline-block', className)}
    >
      <path
        d={areaPath}
        fill={trending === 'down' ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--accent) / 0.15)'}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={trending === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current point dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="2"
        fill={trending === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'}
      />
    </svg>
  );
}
