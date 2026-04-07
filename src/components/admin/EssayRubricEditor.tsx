import { useState, useCallback } from 'react';
import { Sparkles, ChevronDown, Loader2, Plus, Trash2, GripVertical, Shield, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { type StructuredRubric, type RubricConcept, parseRubric, rubricToJson } from '@/types/essayRubric';

// ── Legacy compat types (for parent components still using old interface) ──

interface LegacyRubricData {
  requiredConcepts: string;
  optionalConcepts: string;
  criticalOmissions: string;
  passThreshold: number;
  acceptablePhrases: Record<string, string[]>;
}

/** Parse old flat rubric_json → LegacyRubricData for backward compat */
export function parseRubricJson(rubricJson: unknown): LegacyRubricData {
  const defaults: LegacyRubricData = {
    requiredConcepts: '',
    optionalConcepts: '',
    criticalOmissions: '',
    passThreshold: 60,
    acceptablePhrases: {},
  };
  if (!rubricJson || typeof rubricJson !== 'object') return defaults;
  const r = rubricJson as Record<string, unknown>;

  // New structured format
  const parsed = parseRubric(rubricJson);
  if (parsed) {
    return {
      requiredConcepts: parsed.required_concepts.map(c => c.label).join('\n'),
      optionalConcepts: parsed.optional_concepts.map(c => c.label).join('\n'),
      criticalOmissions: parsed.required_concepts.filter(c => c.is_critical).map(c => c.label).join('\n'),
      passThreshold: parsed.pass_threshold ?? 60,
      acceptablePhrases: parsed.acceptable_phrases ?? {},
    };
  }

  return {
    requiredConcepts: Array.isArray(r.required_concepts) ? (r.required_concepts as string[]).join('\n') : '',
    optionalConcepts: Array.isArray(r.optional_concepts) ? (r.optional_concepts as string[]).join('\n') : '',
    criticalOmissions: Array.isArray(r.critical_omissions) ? (r.critical_omissions as string[]).join('\n') : '',
    passThreshold: typeof r.pass_threshold === 'number' ? r.pass_threshold : 60,
    acceptablePhrases: (r.acceptable_phrases && typeof r.acceptable_phrases === 'object')
      ? r.acceptable_phrases as Record<string, string[]>
      : {},
  };
}

/** Build rubric_json from LegacyRubricData — now outputs new structured format */
export function buildRubricJson(data: LegacyRubricData): Record<string, unknown> {
  const toArray = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);
  const required = toArray(data.requiredConcepts);
  const critical = toArray(data.criticalOmissions);

  const requiredConcepts: RubricConcept[] = required.map(label => ({
    label,
    is_critical: critical.some(c => c.toLowerCase() === label.toLowerCase()),
    acceptable_phrases: data.acceptablePhrases[label.toLowerCase()] || [],
  }));

  // Add critical items not already in required
  const extraCritical = critical
    .filter(c => !required.some(r => r.toLowerCase() === c.toLowerCase()))
    .map(label => ({ label, is_critical: true, acceptable_phrases: [] as string[] }));

  const optionalConcepts: RubricConcept[] = toArray(data.optionalConcepts).map(label => ({
    label,
    acceptable_phrases: data.acceptablePhrases[label.toLowerCase()] || [],
  }));

  return {
    rubric_version: 1,
    expected_points: requiredConcepts.length + extraCritical.length,
    required_concepts: [...requiredConcepts, ...extraCritical],
    optional_concepts: optionalConcepts,
    grading_notes: '',
    model_structure: [],
    rubric_source: 'admin',
    rubric_status: 'draft',
    pass_threshold: data.passThreshold,
    acceptable_phrases: data.acceptablePhrases,
  };
}

// ── Props ──

interface EssayRubricEditorProps {
  rubricData: LegacyRubricData;
  onRubricChange: (data: Partial<LegacyRubricData>) => void;
  question: string;
  modelAnswer: string;
  keywords: string;
  /** Full rubric JSON from DB — used to read structured fields */
  rubricJson?: unknown;
  /** Called with full structured rubric when saving */
  onStructuredRubricChange?: (rubric: StructuredRubric) => void;
}

// ── Component ──

export default function EssayRubricEditor({
  rubricData,
  onRubricChange,
  question,
  modelAnswer,
  keywords,
  rubricJson,
  onStructuredRubricChange,
}: EssayRubricEditorProps) {
  // Parse into structured rubric for editing
  const initialRubric = parseRubric(rubricJson) || parseRubric(buildRubricJson(rubricData));

  const [rubric, setRubric] = useState<StructuredRubric | null>(initialRubric);
  const [isOpen, setIsOpen] = useState(
    !!(rubric && rubric.required_concepts.length > 0)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const isApproved = rubric?.rubric_status === 'approved';
  const isLocked = isApproved;

  const updateRubric = useCallback((updates: Partial<StructuredRubric>) => {
    setRubric(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Sync back to legacy format for parent
      onRubricChange({
        requiredConcepts: updated.required_concepts.map(c => c.label).join('\n'),
        optionalConcepts: updated.optional_concepts.map(c => c.label).join('\n'),
        criticalOmissions: updated.required_concepts.filter(c => c.is_critical).map(c => c.label).join('\n'),
        passThreshold: updated.pass_threshold ?? 60,
      });
      onStructuredRubricChange?.(updated);
      return updated;
    });
  }, [onRubricChange, onStructuredRubricChange]);

  const addRequiredConcept = () => {
    if (!rubric || isLocked) return;
    updateRubric({
      required_concepts: [...rubric.required_concepts, { label: '', is_critical: false, acceptable_phrases: [] }],
    });
  };

  const removeRequiredConcept = (index: number) => {
    if (!rubric || isLocked) return;
    updateRubric({
      required_concepts: rubric.required_concepts.filter((_, i) => i !== index),
    });
  };

  const updateRequiredConcept = (index: number, updates: Partial<RubricConcept>) => {
    if (!rubric || isLocked) return;
    const concepts = [...rubric.required_concepts];
    concepts[index] = { ...concepts[index], ...updates };
    updateRubric({ required_concepts: concepts });
  };

  const addOptionalConcept = () => {
    if (!rubric || isLocked) return;
    updateRubric({
      optional_concepts: [...rubric.optional_concepts, { label: '', acceptable_phrases: [] }],
    });
  };

  const removeOptionalConcept = (index: number) => {
    if (!rubric || isLocked) return;
    updateRubric({
      optional_concepts: rubric.optional_concepts.filter((_, i) => i !== index),
    });
  };

  const updateOptionalConcept = (index: number, updates: Partial<RubricConcept>) => {
    if (!rubric || isLocked) return;
    const concepts = [...rubric.optional_concepts];
    concepts[index] = { ...concepts[index], ...updates };
    updateRubric({ optional_concepts: concepts });
  };

  const handleGenerate = async () => {
    if (isApproved) {
      setConfirmRegenerate(true);
      return;
    }
    await doGenerate();
  };

  const doGenerate = async () => {
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

      // Set the structured rubric from AI
      const newRubric: StructuredRubric = {
        rubric_version: 1,
        expected_points: data.expected_points || data.required_concepts?.length || 4,
        required_concepts: data.required_concepts || [],
        optional_concepts: data.optional_concepts || [],
        grading_notes: data.grading_notes || '',
        model_structure: data.model_structure || [],
        rubric_source: 'ai',
        rubric_status: 'draft',
        pass_threshold: data.pass_threshold || 60,
        acceptable_phrases: data.acceptable_phrases || {},
      };

      setRubric(newRubric);
      // Sync to legacy
      onRubricChange({
        requiredConcepts: newRubric.required_concepts.map(c => c.label).join('\n'),
        optionalConcepts: newRubric.optional_concepts.map(c => c.label).join('\n'),
        criticalOmissions: newRubric.required_concepts.filter(c => c.is_critical).map(c => c.label).join('\n'),
        passThreshold: newRubric.pass_threshold ?? 60,
        acceptablePhrases: newRubric.acceptable_phrases ?? {},
      });
      onStructuredRubricChange?.(newRubric);

      setIsOpen(true);
      toast.success('Rubric generated! Review and edit before saving.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate rubric');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (!rubric) return;
    const hasEmptyLabels = rubric.required_concepts.some(c => !c.label.trim());
    if (hasEmptyLabels) {
      toast.error('All required concepts must have a label before approval');
      return;
    }
    if (rubric.required_concepts.length === 0) {
      toast.error('At least one required concept is needed before approval');
      return;
    }
    updateRubric({ rubric_status: 'approved', rubric_source: 'admin' });
    toast.success('Rubric approved and locked');
  };

  const handleReset = () => {
    const empty: StructuredRubric = {
      rubric_version: 1,
      expected_points: 0,
      required_concepts: [],
      optional_concepts: [],
      grading_notes: '',
      model_structure: [],
      rubric_source: 'admin',
      rubric_status: 'draft',
      pass_threshold: 60,
    };
    setRubric(empty);
    onRubricChange({
      requiredConcepts: '',
      optionalConcepts: '',
      criticalOmissions: '',
      passThreshold: 60,
      acceptablePhrases: {},
    });
    onStructuredRubricChange?.(empty);
    toast.info('Rubric reset');
  };

  // Validation warnings
  const warnings: string[] = [];
  if (rubric) {
    if (rubric.required_concepts.length === 0) warnings.push('No required concepts defined');
    if (!rubric.expected_points || rubric.expected_points < 1) warnings.push('Expected points not set');
    if (rubric.required_concepts.some(c => !c.label.trim())) warnings.push('Some concepts have empty labels');
    if (!rubric.required_concepts.some(c => c.is_critical)) warnings.push('No critical concepts identified');
  }

  const statusBadge = rubric && (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        rubric.rubric_status === 'approved' && 'border-emerald-500 text-emerald-700 bg-emerald-50',
        rubric.rubric_status === 'needs_review' && 'border-amber-500 text-amber-700 bg-amber-50',
        rubric.rubric_status === 'draft' && 'border-muted-foreground/30',
      )}
    >
      {rubric.rubric_status === 'approved' && <ShieldCheck className="h-3 w-3 mr-1" />}
      {rubric.rubric_status === 'needs_review' && <ShieldAlert className="h-3 w-3 mr-1" />}
      {rubric.rubric_status === 'draft' && <Shield className="h-3 w-3 mr-1" />}
      {rubric.rubric_status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
    </Badge>
  );

  const sourceBadge = rubric && (
    <Badge variant="secondary" className="text-xs">
      {rubric.rubric_source === 'ai' ? '🤖 AI' : '👤 Admin'}
    </Badge>
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            Marking Rubric
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            {statusBadge}
            {sourceBadge}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-1.5"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isGenerating ? 'Generating...' : rubric?.required_concepts?.length ? 'Regenerate' : 'AI Generate'}
            </Button>
          </div>
        </div>

        <CollapsibleContent className="space-y-4 pt-3">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}

          {/* Expected Points */}
          <div>
            <Label className="text-xs">Expected Key Points</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={rubric?.expected_points ?? ''}
              onChange={e => updateRubric({ expected_points: parseInt(e.target.value) || 0 })}
              disabled={isLocked}
              className="mt-1 w-24"
              placeholder="e.g. 4"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many points the student should cover.
            </p>
          </div>

          {/* Required Concepts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Required Concepts ({rubric?.required_concepts?.length || 0})</Label>
              {!isLocked && (
                <Button type="button" variant="ghost" size="sm" onClick={addRequiredConcept} className="h-7 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            {rubric?.required_concepts?.map((concept, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/30 rounded-md p-2">
                <GripVertical className="h-4 w-4 mt-2 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={concept.label}
                    onChange={e => updateRequiredConcept(i, { label: e.target.value })}
                    disabled={isLocked}
                    placeholder="Concept label"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={concept.description || ''}
                    onChange={e => updateRequiredConcept(i, { description: e.target.value })}
                    disabled={isLocked}
                    placeholder="Description (optional)"
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={concept.is_critical ?? false}
                        onCheckedChange={checked => updateRequiredConcept(i, { is_critical: checked })}
                        disabled={isLocked}
                        className="h-4 w-7"
                      />
                      <span className="text-xs text-muted-foreground">Critical</span>
                    </div>
                    <Input
                      value={concept.acceptable_phrases?.join(', ') || ''}
                      onChange={e => updateRequiredConcept(i, {
                        acceptable_phrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                      })}
                      disabled={isLocked}
                      placeholder="Synonyms (comma-separated)"
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                </div>
                {!isLocked && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRequiredConcept(i)} className="h-7 w-7 shrink-0 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Optional Concepts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Optional Concepts ({rubric?.optional_concepts?.length || 0})</Label>
              {!isLocked && (
                <Button type="button" variant="ghost" size="sm" onClick={addOptionalConcept} className="h-7 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            {rubric?.optional_concepts?.map((concept, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/30 rounded-md p-2">
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={concept.label}
                    onChange={e => updateOptionalConcept(i, { label: e.target.value })}
                    disabled={isLocked}
                    placeholder="Optional concept"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={concept.acceptable_phrases?.join(', ') || ''}
                    onChange={e => updateOptionalConcept(i, {
                      acceptable_phrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                    })}
                    disabled={isLocked}
                    placeholder="Synonyms (comma-separated)"
                    className="h-7 text-xs"
                  />
                </div>
                {!isLocked && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOptionalConcept(i)} className="h-7 w-7 shrink-0 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Grading Notes */}
          <div>
            <Label className="text-xs">Grading Notes (internal)</Label>
            <Textarea
              value={rubric?.grading_notes || ''}
              onChange={e => updateRubric({ grading_notes: e.target.value })}
              disabled={isLocked}
              placeholder="Internal notes for grading, not shown to students..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>

          {/* Pass Threshold */}
          <div>
            <Label className="text-xs">Pass Threshold: {rubric?.pass_threshold ?? 60}%</Label>
            <Slider
              value={[rubric?.pass_threshold ?? 60]}
              onValueChange={([v]) => updateRubric({ pass_threshold: v })}
              min={0}
              max={100}
              step={5}
              disabled={isLocked}
              className="mt-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {!isApproved ? (
              <Button type="button" variant="default" size="sm" onClick={handleApprove} className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve Rubric
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => updateRubric({ rubric_status: 'draft' })} className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Unlock for Editing
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-destructive">
              Reset
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Regenerate confirmation for approved rubrics */}
      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate approved rubric?</AlertDialogTitle>
            <AlertDialogDescription>
              This rubric is approved and locked. Regenerating will replace it with a new AI-generated draft. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmRegenerate(false); doGenerate(); }}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
