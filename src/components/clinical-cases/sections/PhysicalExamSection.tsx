import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhysicalExamSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function PhysicalExamSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<PhysicalExamSectionData>) {
  const [revealedRegions, setRevealedRegions] = useState<Set<string>>(
    new Set((previousAnswer?.revealed_regions as string[]) || [])
  );

  const regionEntries = Object.entries(data.regions || {});

  const toggleRegion = (regionKey: string) => {
    if (readOnly) return;
    setRevealedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionKey)) next.delete(regionKey);
      else next.add(regionKey);
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit({
      revealed_regions: Array.from(revealedRegions),
      regions_examined: revealedRegions.size,
      total_regions: regionEntries.length,
    });
  };

  return (
    <div className="space-y-4">
      {data.note && (
        <p className="text-sm text-muted-foreground italic">{data.note}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Select body regions to examine. Findings will be revealed when you click on a region.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {regionEntries.map(([key, region]) => {
          const revealed = revealedRegions.has(key);

          return (
            <button
              key={key}
              onClick={() => toggleRegion(key)}
              className={cn(
                'text-left p-3 rounded-lg border transition-all text-sm',
                revealed
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50',
                readOnly && 'pointer-events-none'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{region.label}</span>
                {revealed ? (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              {revealed && (
                <p className="text-xs text-muted-foreground mt-2">{region.finding}</p>
              )}
            </button>
          );
        })}
      </div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || revealedRegions.size === 0} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Examination ({revealedRegions.size}/{regionEntries.length} regions)
        </Button>
      )}
    </div>
  );
}
