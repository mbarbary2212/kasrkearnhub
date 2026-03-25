import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';

interface ConfidenceCardProps {
  questionId: string;
}

const confidenceValueMap: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function ConfidenceCard({ questionId }: ConfidenceCardProps) {
  const storageKey = `confidence_${questionId}`;

  const [confidence, setConfidence] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(storageKey) || '';
  });

  // Save to DB when confidence changes
  const saveConfidenceToDB = useCallback(async (level: string) => {
    const numericLevel = confidenceValueMap[level];
    if (!numericLevel) return;

    try {
      // Update the most recent question_attempt for this question
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      await supabase
        .from('question_attempts')
        .update({ confidence_level: numericLevel } as any)
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch {
      // Silent fail — confidence is supplementary
    }
  }, [questionId]);

  useEffect(() => {
    if (confidence) {
      localStorage.setItem(storageKey, confidence);
      saveConfidenceToDB(confidence);
    }
  }, [confidence, storageKey, saveConfidenceToDB]);

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
