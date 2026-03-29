import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Info, Loader2, ShieldCheck, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAssessments,
  useAssessmentRules,
  useUpsertAssessmentRule,
  ASSESSMENT_RULE_DEFINITIONS,
  DIFFICULTY_RULE_KEY,
  DEFAULT_DIFFICULTY_DISTRIBUTION,
  type DifficultyDistribution,
} from '@/hooks/useAssessmentBlueprint';

const COMPONENT_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  short_answer_recall: 'Short Answer (Recall)',
  short_answer_case: 'Short Answer (Case)',
  osce: 'OSCE',
  long_case: 'Long Case',
  short_case: 'Short Case',
  paraclinical: 'Paraclinical',
};

interface Props {
  moduleId: string;
  canManage: boolean;
}

export function AssessmentRulesTab({ moduleId, canManage }: Props) {
  const { data: allAssessments, isLoading } = useAssessments(moduleId, '');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const { data: rules } = useAssessmentRules(selectedAssessmentId || undefined);
  const upsertRule = useUpsertAssessmentRule();

  // Difficulty distribution local state
  const [difficulty, setDifficulty] = useState<DifficultyDistribution>(DEFAULT_DIFFICULTY_DISTRIBUTION);

  // Sync difficulty from DB rules
  useEffect(() => {
    if (!rules) return;
    const stored = rules.find(r => r.rule_key === DIFFICULTY_RULE_KEY);
    if (stored && typeof stored.rule_value === 'object' && stored.rule_value !== null) {
      const val = stored.rule_value as Record<string, number>;
      setDifficulty({
        easy: val.easy ?? DEFAULT_DIFFICULTY_DISTRIBUTION.easy,
        moderate: val.moderate ?? DEFAULT_DIFFICULTY_DISTRIBUTION.moderate,
        difficult: val.difficult ?? DEFAULT_DIFFICULTY_DISTRIBUTION.difficult,
      });
    } else {
      setDifficulty(DEFAULT_DIFFICULTY_DISTRIBUTION);
    }
  }, [rules, selectedAssessmentId]);

  const getRuleValue = (ruleKey: string, defaultValue: boolean): boolean => {
    const existing = rules?.find(r => r.rule_key === ruleKey);
    if (existing) return existing.rule_value as unknown as boolean;
    return defaultValue;
  };

  const handleToggle = (ruleKey: string, description: string, checked: boolean) => {
    upsertRule.mutate({
      assessment_id: selectedAssessmentId,
      rule_key: ruleKey,
      rule_value: checked,
      description,
    });
  };

  const total = difficulty.easy + difficulty.moderate + difficulty.difficult;
  const isValid = total === 100;

  const handleDifficultyChange = (level: keyof DifficultyDistribution, value: number) => {
    const next = { ...difficulty, [level]: value };
    setDifficulty(next);

    const nextTotal = next.easy + next.moderate + next.difficult;
    if (nextTotal === 100) {
      upsertRule.mutate({
        assessment_id: selectedAssessmentId,
        rule_key: DIFFICULTY_RULE_KEY,
        rule_value: next as any,
        description: 'Target difficulty distribution for exam generation (easy/moderate/difficult percentages).',
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium block mb-1">Assessment</label>
          <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select an assessment" /></SelectTrigger>
            <SelectContent>
              {allAssessments?.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name} ({COMPONENT_LABELS[a.assessment_type] || a.assessment_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>These rules govern how questions are selected during exam generation. They are stored per assessment and enforced at generation time.</span>
      </div>

      {selectedAssessmentId && (
        <div className="space-y-6">
          {/* Boolean rules */}
          <div className="space-y-3">
            {ASSESSMENT_RULE_DEFINITIONS.map(rule => {
              const enabled = getRuleValue(rule.key, rule.defaultValue);
              return (
                <Card key={rule.key}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <ShieldCheck className={`w-5 h-5 shrink-0 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rule.label}</span>
                        <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
                          {enabled ? 'Active' : 'Off'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => handleToggle(rule.key, rule.description, v)}
                      disabled={!canManage}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Difficulty distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                Difficulty Distribution
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Target mix of question difficulty when generating exams. Applies to MCQ, Recall, and Case components. The total must equal 100%.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <DifficultySlider
                label="Easy"
                value={difficulty.easy}
                onChange={(v) => handleDifficultyChange('easy', v)}
                disabled={!canManage}
                color="text-emerald-500"
              />
              <DifficultySlider
                label="Moderate"
                value={difficulty.moderate}
                onChange={(v) => handleDifficultyChange('moderate', v)}
                disabled={!canManage}
                color="text-amber-500"
              />
              <DifficultySlider
                label="Difficult"
                value={difficulty.difficult}
                onChange={(v) => handleDifficultyChange('difficult', v)}
                disabled={!canManage}
                color="text-red-500"
              />

              <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${isValid ? 'border-border bg-muted/40 text-muted-foreground' : 'border-destructive bg-destructive/10 text-destructive'}`}>
                <span>Total</span>
                <span className="font-semibold">{total}%{!isValid && ' — must equal 100%'}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                This distribution is a target — the generator will attempt to match it based on available questions in the pool. It does not affect chapter eligibility.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedAssessmentId && (
        <p className="text-muted-foreground text-sm py-4">Select an assessment above to configure generation rules.</p>
      )}
    </div>
  );
}

function DifficultySlider({ label, value, onChange, disabled, color }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-sm font-mono tabular-nums">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={5}
        disabled={disabled}
      />
    </div>
  );
}
