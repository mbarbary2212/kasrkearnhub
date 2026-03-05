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

  const toggleTest = (testName: string) => {
    if (readOnly || showResults) return;
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testName)) next.delete(testName);
      else next.add(testName);
      return next;
    });
  };

  const handleOrder = () => {
    setShowResults(true);
  };

  const handleSubmit = () => {
    onSubmit({
      selected_tests: Array.from(selectedTests),
      total_available: data.available_labs?.length || 0,
    });
  };

  const selectedLabs = (data.available_labs || []).filter(l => selectedTests.has(l.test_name));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the lab investigations you would order for this patient.
      </p>

      {/* Test selection */}
      {!showResults && (
        <div className="grid grid-cols-2 gap-2">
          {(data.available_labs || []).map(lab => (
            <label
              key={lab.test_name}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm',
                selectedTests.has(lab.test_name) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={selectedTests.has(lab.test_name)}
                onCheckedChange={() => toggleTest(lab.test_name)}
                disabled={readOnly}
              />
              <span>{lab.test_name}</span>
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

      {/* Results table */}
      {showResults && selectedLabs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="p-2">Test</th>
                <th className="p-2">Result</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Reference</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedLabs.map((lab, i) => (
                <tr key={i} className={cn('border-t', lab.is_abnormal && 'bg-destructive/5')}>
                  <td className="p-2 font-medium">{lab.test_name}</td>
                  <td className={cn('p-2', lab.is_abnormal && 'text-destructive font-semibold')}>{lab.result}</td>
                  <td className="p-2 text-muted-foreground">{lab.unit}</td>
                  <td className="p-2 text-muted-foreground">{lab.reference_range}</td>
                  <td className="p-2">
                    <Badge variant={lab.is_abnormal ? 'destructive' : 'secondary'} className="text-xs">
                      {lab.is_abnormal ? 'Abnormal' : 'Normal'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
