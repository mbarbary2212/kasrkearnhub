import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LabsSectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

export function InvestigationsLabsSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<LabsSectionData>) {
  const [selectedTests, setSelectedTests] = useState<Set<string>>(
    new Set((previousAnswer?.selected_tests as string[]) || [])
  );
  const [showResults, setShowResults] = useState(!!previousAnswer);

  const testEntries = Object.entries(data.available_tests || {});

  const toggleTest = (testKey: string) => {
    if (readOnly || showResults) return;
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testKey)) next.delete(testKey);
      else next.add(testKey);
      return next;
    });
  };

  const handleOrder = () => setShowResults(true);

  const handleSubmit = () => {
    onSubmit({
      selected_tests: Array.from(selectedTests),
      total_available: testEntries.length,
    });
  };

  const selectedEntries = testEntries.filter(([key]) => selectedTests.has(key));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the lab investigations you would order for this patient.
      </p>

      {!showResults && (
        <div className="grid grid-cols-2 gap-2">
          {testEntries.map(([key, test]) => (
            <label
              key={key}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm',
                selectedTests.has(key) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={selectedTests.has(key)}
                onCheckedChange={() => toggleTest(key)}
                disabled={readOnly}
              />
              <span>{test.label}</span>
            </label>
          ))}
        </div>
      )}

      {!showResults && !readOnly && (
        <Button onClick={handleOrder} disabled={selectedTests.size === 0} variant="outline" className="w-full">
          <FlaskConical className="w-4 h-4 mr-2" />
          Order {selectedTests.size} Test{selectedTests.size !== 1 ? 's' : ''}
        </Button>
      )}

      {showResults && selectedEntries.length > 0 && (
        <div className="space-y-3">
          {selectedEntries.map(([key, test]) => (
            <div key={key} className={cn('border rounded-lg p-3', test.is_key && 'border-primary/30')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{test.label}</span>
                {test.is_key && <Badge variant="default" className="text-[10px]">Key</Badge>}
              </div>
              <p className="text-sm">{test.result}</p>
              <p className="text-xs text-muted-foreground mt-1">{test.interpretation}</p>
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
