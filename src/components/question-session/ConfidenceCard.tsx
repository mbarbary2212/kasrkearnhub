import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ConfidenceCardProps {
  questionId: string;
}

export function ConfidenceCard({ questionId }: ConfidenceCardProps) {
  const storageKey = `confidence_${questionId}`;

  const [confidence, setConfidence] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(storageKey) || '';
  });

  useEffect(() => {
    if (confidence) {
      localStorage.setItem(storageKey, confidence);
    }
  }, [confidence, storageKey]);

  return (
    <Card>
      <CardHeader className="py-2.5 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Confidence
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <ToggleGroup
          type="single"
          value={confidence}
          onValueChange={(val) => val && setConfidence(val)}
          className="justify-start gap-2"
        >
          <ToggleGroupItem
            value="low"
            className="text-xs px-4 py-1.5 h-auto rounded-full data-[state=on]:bg-red-100 data-[state=on]:text-red-700 dark:data-[state=on]:bg-red-900/30 dark:data-[state=on]:text-red-400"
          >
            Low
          </ToggleGroupItem>
          <ToggleGroupItem
            value="medium"
            className="text-xs px-4 py-1.5 h-auto rounded-full data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-900/30 dark:data-[state=on]:text-amber-400"
          >
            Medium
          </ToggleGroupItem>
          <ToggleGroupItem
            value="high"
            className="text-xs px-4 py-1.5 h-auto rounded-full data-[state=on]:bg-green-100 data-[state=on]:text-green-700 dark:data-[state=on]:bg-green-900/30 dark:data-[state=on]:text-green-400"
          >
            High
          </ToggleGroupItem>
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}
