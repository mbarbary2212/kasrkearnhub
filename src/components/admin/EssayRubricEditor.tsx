import { useState } from 'react';
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RubricData {
  requiredConcepts: string;
  optionalConcepts: string;
  criticalOmissions: string;
  passThreshold: number;
  acceptablePhrases: Record<string, string[]>;
}

interface EssayRubricEditorProps {
  rubricData: RubricData;
  onRubricChange: (data: Partial<RubricData>) => void;
  question: string;
  modelAnswer: string;
  keywords: string;
}

export function parseRubricJson(rubricJson: unknown): RubricData {
  const defaults: RubricData = {
    requiredConcepts: '',
    optionalConcepts: '',
    criticalOmissions: '',
    passThreshold: 60,
    acceptablePhrases: {},
  };

  if (!rubricJson || typeof rubricJson !== 'object') return defaults;

  const r = rubricJson as Record<string, unknown>;
  return {
    requiredConcepts: Array.isArray(r.required_concepts) ? r.required_concepts.join('\n') : '',
    optionalConcepts: Array.isArray(r.optional_concepts) ? r.optional_concepts.join('\n') : '',
    criticalOmissions: Array.isArray(r.critical_omissions) ? r.critical_omissions.join('\n') : '',
    passThreshold: typeof r.pass_threshold === 'number' ? r.pass_threshold : 60,
    acceptablePhrases: (r.acceptable_phrases && typeof r.acceptable_phrases === 'object') 
      ? r.acceptable_phrases as Record<string, string[]> 
      : {},
  };
}

export function buildRubricJson(data: RubricData): Record<string, unknown> {
  const toArray = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);
  return {
    required_concepts: toArray(data.requiredConcepts),
    optional_concepts: toArray(data.optionalConcepts),
    critical_omissions: toArray(data.criticalOmissions),
    pass_threshold: data.passThreshold,
    acceptable_phrases: data.acceptablePhrases,
  };
}

export default function EssayRubricEditor({
  rubricData,
  onRubricChange,
  question,
  modelAnswer,
  keywords,
}: EssayRubricEditorProps) {
  const [isOpen, setIsOpen] = useState(
    !!(rubricData.requiredConcepts || rubricData.optionalConcepts || rubricData.criticalOmissions)
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!question.trim()) {
      toast.error('Question text is required to generate a rubric');
      return;
    }

    setIsGenerating(true);
    try {
      const kw = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke('generate-essay-rubric', {
        body: { question, model_answer: modelAnswer || null, keywords: kw.length ? kw : null },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onRubricChange({
        requiredConcepts: Array.isArray(data.required_concepts) ? data.required_concepts.join('\n') : '',
        optionalConcepts: Array.isArray(data.optional_concepts) ? data.optional_concepts.join('\n') : '',
        criticalOmissions: Array.isArray(data.critical_omissions) ? data.critical_omissions.join('\n') : '',
        passThreshold: typeof data.pass_threshold === 'number' ? data.pass_threshold : 60,
        acceptablePhrases: data.acceptable_phrases || {},
      });

      setIsOpen(true);
      toast.success('Rubric generated! Review and edit before saving.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate rubric');
    } finally {
      setIsGenerating(false);
    }
  };

  const phraseEntries = Object.entries(rubricData.acceptablePhrases || {});

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          Marking Rubric
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-1.5"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isGenerating ? 'Generating...' : 'AI Generate'}
        </Button>
      </div>

      <CollapsibleContent className="space-y-3 pt-3">
        <div>
          <Label className="text-xs">Required Concepts (one per line)</Label>
          <Textarea
            value={rubricData.requiredConcepts}
            onChange={e => onRubricChange({ requiredConcepts: e.target.value })}
            placeholder="Concept the student MUST mention..."
            rows={3}
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs">Optional Concepts (one per line)</Label>
          <Textarea
            value={rubricData.optionalConcepts}
            onChange={e => onRubricChange({ optionalConcepts: e.target.value })}
            placeholder="Bonus concepts..."
            rows={2}
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs">Critical Omissions (one per line)</Label>
          <Textarea
            value={rubricData.criticalOmissions}
            onChange={e => onRubricChange({ criticalOmissions: e.target.value })}
            placeholder="If missing → auto fail..."
            rows={2}
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs">Pass Threshold: {rubricData.passThreshold}%</Label>
          <Slider
            value={[rubricData.passThreshold]}
            onValueChange={([v]) => onRubricChange({ passThreshold: v })}
            min={0}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {phraseEntries.length > 0 && (
          <div>
            <Label className="text-xs">Acceptable Phrases (read-only)</Label>
            <div className="mt-1 space-y-1">
              {phraseEntries.map(([term, synonyms]) => (
                <div key={term} className="text-xs text-muted-foreground">
                  <span className="font-medium">{term}</span>: {Array.isArray(synonyms) ? synonyms.join(', ') : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
