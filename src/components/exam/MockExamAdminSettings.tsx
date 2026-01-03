import { useState, useEffect } from 'react';
import { MockExamSettings, useUpdateMockExamSettings } from '@/hooks/useMockExam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';

interface MockExamAdminSettingsProps {
  moduleId: string;
  settings: MockExamSettings;
}

export function MockExamAdminSettings({ moduleId, settings }: MockExamAdminSettingsProps) {
  const updateSettings = useUpdateMockExamSettings();
  const [questionCount, setQuestionCount] = useState(settings.question_count);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(settings.seconds_per_question);

  useEffect(() => {
    setQuestionCount(settings.question_count);
    setSecondsPerQuestion(settings.seconds_per_question);
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      moduleId,
      questionCount,
      secondsPerQuestion,
    });
  };

  const hasChanges = 
    questionCount !== settings.question_count || 
    secondsPerQuestion !== settings.seconds_per_question;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Exam Settings
        </CardTitle>
        <CardDescription>
          Configure mock exam parameters for this module
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="questionCount">Number of Questions</Label>
            <Input
              id="questionCount"
              type="number"
              min={1}
              max={200}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 50)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondsPerQuestion">Seconds per Question</Label>
            <Input
              id="secondsPerQuestion"
              type="number"
              min={10}
              max={300}
              value={secondsPerQuestion}
              onChange={(e) => setSecondsPerQuestion(parseInt(e.target.value) || 60)}
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Total exam time: {Math.floor((questionCount * secondsPerQuestion) / 60)} minutes
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateSettings.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
