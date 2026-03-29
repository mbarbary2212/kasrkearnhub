import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Info, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useAssessments,
  useAssessmentRules,
  useUpsertAssessmentRule,
  ASSESSMENT_RULE_DEFINITIONS,
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
      )}

      {!selectedAssessmentId && (
        <p className="text-muted-foreground text-sm py-4">Select an assessment above to configure generation rules.</p>
      )}
    </div>
  );
}
