import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhysicalExamSectionData, ExamFinding } from '@/types/structuredCase';
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
  const [notes, setNotes] = useState<Record<string, string>>(
    (previousAnswer?.notes as Record<string, string>) || {}
  );

  const regions = [...new Set((data.findings || []).map(f => f.region))];

  const toggleRegion = (region: string) => {
    if (readOnly) return;
    setRevealedRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const findingsForRegion = (region: string) =>
    (data.findings || []).filter(f => f.region === region);

  const handleSubmit = () => {
    onSubmit({
      revealed_regions: Array.from(revealedRegions),
      notes,
      regions_examined: revealedRegions.size,
      total_regions: regions.length,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select body regions to examine. Findings will be revealed when you click on a region.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {regions.map(region => {
          const revealed = revealedRegions.has(region);
          const findings = findingsForRegion(region);
          const hasAbnormal = findings.some(f => f.is_abnormal);

          return (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={cn(
                'text-left p-3 rounded-lg border transition-all text-sm',
                revealed
                  ? hasAbnormal
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-primary/30 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50',
                readOnly && 'pointer-events-none'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{region}</span>
                {revealed ? (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              {revealed && (
                <div className="space-y-1 mt-2">
                  {findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Badge
                        variant={f.is_abnormal ? 'destructive' : 'secondary'}
                        className="text-[10px] shrink-0 mt-0.5"
                      >
                        {f.is_abnormal ? 'ABN' : 'NAD'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{f.finding}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || revealedRegions.size === 0} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Examination ({revealedRegions.size}/{regions.length} regions)
        </Button>
      )}
    </div>
  );
}
