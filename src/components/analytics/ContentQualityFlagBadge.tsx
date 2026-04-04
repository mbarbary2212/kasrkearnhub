import { Badge } from '@/components/ui/badge';
import type { QualitySignals } from '@/hooks/useContentQualitySignals';
import {
  computeContentQualityFlag,
  getQualityFlagLabel,
  getQualityFlagColor,
} from '@/lib/contentQualityScoring';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ContentQualityFlagBadgeProps {
  signals?: QualitySignals | null;
  className?: string;
}

export function ContentQualityFlagBadge({ signals, className }: ContentQualityFlagBadgeProps) {
  const { flag } = computeContentQualityFlag(signals);

  if (flag === 'normal') return null;

  const Icon = flag === 'high_priority' ? AlertCircle : AlertTriangle;

  return (
    <Badge variant="outline" className={`${getQualityFlagColor(flag)} text-[10px] h-5 px-1.5 gap-0.5 ${className ?? ''}`}>
      <Icon className="h-3 w-3" />
      {getQualityFlagLabel(flag)}
    </Badge>
  );
}
