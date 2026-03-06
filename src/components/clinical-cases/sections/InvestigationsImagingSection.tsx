import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImagingSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function InvestigationsImagingSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<ImagingSectionData>) {
  const [selectedStudies, setSelectedStudies] = useState<Set<string>>(
    new Set((previousAnswer?.selected_studies as string[]) || [])
  );
  const [showResults, setShowResults] = useState(!!previousAnswer);

  const imagingEntries = Object.entries(data.available_imaging || {});

  const toggleStudy = (key: string) => {
    if (readOnly || showResults) return;
    setSelectedStudies(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleOrder = () => setShowResults(true);

  const handleSubmit = () => {
    onSubmit({
      selected_studies: Array.from(selectedStudies),
      total_available: imagingEntries.length,
    });
  };

  const selectedEntries = imagingEntries.filter(([key]) => selectedStudies.has(key));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the imaging studies you would order.
      </p>

      {!showResults ? (
        <>
          <div className="space-y-2">
            {imagingEntries.map(([key, study]) => (
              <label
                key={key}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedStudies.has(key) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'
                )}
              >
                <Checkbox
                  checked={selectedStudies.has(key)}
                  onCheckedChange={() => toggleStudy(key)}
                  disabled={readOnly}
                />
                <span className="text-sm font-medium">{study.label}</span>
              </label>
            ))}
          </div>

          {!readOnly && (
            <Button onClick={handleOrder} disabled={selectedStudies.size === 0} variant="outline" className="w-full">
              <ScanLine className="w-4 h-4 mr-2" />
              Order {selectedStudies.size} Stud{selectedStudies.size !== 1 ? 'ies' : 'y'}
            </Button>
          )}
        </>
      ) : (
        /* Side panel layout */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: ordered list */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
              Studies Ordered ({selectedEntries.length})
            </Label>
            <div className="space-y-1">
              {imagingEntries.map(([key, study]) => (
                <div
                  key={key}
                  className={cn(
                    'text-xs px-2 py-1.5 rounded',
                    selectedStudies.has(key)
                      ? 'bg-primary/5 text-foreground font-medium'
                      : 'text-muted-foreground/50 line-through'
                  )}
                >
                  {study.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: results */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
              Results
            </Label>
            {selectedEntries.map(([key, study]) => (
              <div key={key} className={cn('border rounded-lg p-3', study.is_key && 'border-primary/30')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{study.label}</span>
                  {study.is_key && <Badge variant="default" className="text-[10px]">Key</Badge>}
                </div>
                <p className="text-sm">{study.result}</p>
                <p className="text-xs text-muted-foreground mt-1">{study.interpretation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && !readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Continue
        </Button>
      )}
    </div>
  );
}
