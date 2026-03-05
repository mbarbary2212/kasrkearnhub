import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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

  const studyKey = (modality: string, bodyPart: string) => `${modality}__${bodyPart}`;

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
      total_available: data.available_imaging?.length || 0,
    });
  };

  const selectedImaging = (data.available_imaging || []).filter(img =>
    selectedStudies.has(studyKey(img.modality, img.body_part))
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the imaging studies you would order.
      </p>

      {!showResults && (
        <div className="space-y-2">
          {(data.available_imaging || []).map((img, i) => {
            const key = studyKey(img.modality, img.body_part);
            return (
              <label
                key={i}
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
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{img.modality}</Badge>
                    <span className="text-sm font-medium">{img.body_part}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {!showResults && !readOnly && (
        <Button onClick={handleOrder} disabled={selectedStudies.size === 0} variant="outline" className="w-full">
          <ScanLine className="w-4 h-4 mr-2" />
          Order {selectedStudies.size} Stud{selectedStudies.size !== 1 ? 'ies' : 'y'}
        </Button>
      )}

      {showResults && selectedImaging.length > 0 && (
        <div className="space-y-3">
          {selectedImaging.map((img, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">{img.modality}</Badge>
                <span className="font-medium text-sm">{img.body_part}</span>
              </div>
              <p className="text-sm text-muted-foreground">{img.finding}</p>
              {img.image_url && (
                <img src={img.image_url} alt={`${img.modality} ${img.body_part}`} className="mt-2 rounded max-h-48 object-contain" />
              )}
            </div>
          ))}
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
