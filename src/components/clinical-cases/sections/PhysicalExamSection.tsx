import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhysicalExamSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';
import { BodyMap } from './BodyMap';

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
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [findingsSummary, setFindingsSummary] = useState(
    (previousAnswer?.findings_summary as string) || ''
  );

  const regionEntries = Object.entries(data.regions || {});

  const handleRegionClick = (regionKey: string) => {
    if (readOnly) return;
    // Reveal (cannot un-reveal)
    setRevealedRegions(prev => {
      const next = new Set(prev);
      next.add(regionKey);
      return next;
    });
    setSelectedRegion(regionKey);
  };

  const handleSubmit = () => {
    onSubmit({
      revealed_regions: Array.from(revealedRegions),
      findings_summary: findingsSummary.trim(),
      regions_examined: revealedRegions.size,
      total_regions: regionEntries.length,
    });
  };

  const selectedRegionData = selectedRegion ? data.regions[selectedRegion] : null;

  return (
    <div className="space-y-4">
      {data.note && (
        <p className="text-sm text-muted-foreground italic">{data.note}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Click body regions to examine. Findings appear in the panel on the right.
      </p>

      {/* Two-column: Body map + Side panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Body Map */}
        <BodyMap
          regions={data.regions || {}}
          revealedRegions={revealedRegions}
          selectedRegion={selectedRegion}
          onRegionClick={handleRegionClick}
        />

        {/* Right: Findings panel */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Examination Findings
          </Label>

          {selectedRegionData && revealedRegions.has(selectedRegion!) ? (
            <div className="border rounded-lg p-3 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-sm">{selectedRegionData.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedRegionData.finding}</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 border-dashed text-center">
              <p className="text-xs text-muted-foreground">
                Click a region on the body map to reveal findings
              </p>
            </div>
          )}

          {/* List of all revealed findings */}
          {revealedRegions.size > 0 && (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {Array.from(revealedRegions).map(key => {
                const region = data.regions[key];
                if (!region) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedRegion(key)}
                    className={cn(
                      'w-full text-left text-xs p-2 rounded border transition-colors',
                      selectedRegion === key
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <span className="font-medium">{region.label}</span>
                    <p className="text-muted-foreground truncate">{region.finding}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Findings summary textarea */}
      {revealedRegions.size > 0 && (
        <div>
          <Label className="font-medium text-sm">Summarize your key examination findings</Label>
          <Textarea
            value={findingsSummary}
            onChange={e => setFindingsSummary(e.target.value)}
            rows={4}
            className="mt-1"
            disabled={readOnly}
            placeholder="Summarize your key examination findings... (type 'pass' to skip)"
          />
        </div>
      )}

      {!readOnly && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || revealedRegions.size === 0 || !findingsSummary.trim()}
          className="w-full"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Examination ({revealedRegions.size}/{regionEntries.length} regions)
        </Button>
      )}
    </div>
  );
}
