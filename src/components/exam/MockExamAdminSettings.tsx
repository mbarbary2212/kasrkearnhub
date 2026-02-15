import { useState, useEffect, useMemo } from 'react';
import { MockExamSettings, useUpdateMockExamSettings } from '@/hooks/useMockExam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Plus, Clock, Target } from 'lucide-react';
import { ExamPaperConfig, PaperConfig, PaperComponents } from './ExamPaperConfig';
import { ModuleChapter } from '@/hooks/useChapters';

interface MockExamAdminSettingsProps {
  moduleId: string;
  settings: MockExamSettings;
  chapters?: ModuleChapter[];
}

const defaultWrittenComponents: PaperComponents = {
  mcq_count: 50,
  mcq_points: 1,
  essay_count: 0,
  essay_points: 5,
};

const defaultPracticalComponents: PaperComponents = {
  mcq_count: 0,
  mcq_points: 0,
  essay_count: 0,
  essay_points: 0,
  osce_count: 15,
  osce_points: 10,
  osce_seconds_per_station: 150,
  clinical_case_count: 2,
  clinical_case_points: 20,
  poxa_count: 0,
  poxa_points: 5,
};

function makePaper(category: 'written' | 'practical', order: number): PaperConfig {
  return {
    name: category === 'written' ? `Written Paper ${order}` : 'OSCE',
    category,
    order,
    duration_minutes: category === 'written' ? 180 : 90,
    instructions: '',
    chapter_ids: [],
    components: category === 'written' ? { ...defaultWrittenComponents } : { ...defaultPracticalComponents },
  };
}

export function MockExamAdminSettings({ moduleId, settings, chapters = [] }: MockExamAdminSettingsProps) {
  const updateSettings = useUpdateMockExamSettings();

  // Legacy simple settings
  const [questionCount, setQuestionCount] = useState(settings.question_count);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(settings.seconds_per_question);

  // Blueprint state
  const [writtenEnabled, setWrittenEnabled] = useState(false);
  const [practicalEnabled, setPracticalEnabled] = useState(false);
  const [papers, setPapers] = useState<PaperConfig[]>([]);

  // Essay settings
  const [handwritingEnabled, setHandwritingEnabled] = useState(true);
  const [revisionEnabled, setRevisionEnabled] = useState(true);
  const [maxRevisions, setMaxRevisions] = useState(1);

  // Initialize from saved blueprint_config
  useEffect(() => {
    setQuestionCount(settings.question_count);
    setSecondsPerQuestion(settings.seconds_per_question);

    const bp = settings.blueprint_config as { categories?: string[]; papers?: PaperConfig[]; essay_settings?: { handwriting_enabled?: boolean; revision_enabled?: boolean; max_revisions?: number } } | null;
    if (bp) {
      setWrittenEnabled(bp.categories?.includes('written') ?? false);
      setPracticalEnabled(bp.categories?.includes('practical') ?? false);
      setPapers(bp.papers ?? []);
      setHandwritingEnabled(bp.essay_settings?.handwriting_enabled ?? true);
      setRevisionEnabled(bp.essay_settings?.revision_enabled ?? true);
      setMaxRevisions(bp.essay_settings?.max_revisions ?? 1);
    }
  }, [settings]);

  const writtenPapers = papers.filter((p) => p.category === 'written');
  const practicalPapers = papers.filter((p) => p.category === 'practical');

  const addWrittenPaper = () => {
    setPapers([...papers, makePaper('written', writtenPapers.length + 1)]);
  };
  const addPracticalPaper = () => {
    setPapers([...papers, makePaper('practical', practicalPapers.length + 1)]);
  };
  const removePaper = (idx: number) => setPapers(papers.filter((_, i) => i !== idx));
  const updatePaper = (idx: number, paper: PaperConfig) => {
    const next = [...papers];
    next[idx] = paper;
    setPapers(next);
  };

  // Summary
  const totalMarks = useMemo(() => {
    return papers.reduce((sum, p) => {
      const c = p.components;
      if (p.category === 'written') {
        return sum + c.mcq_count * c.mcq_points + c.essay_count * c.essay_points;
      }
      return sum +
        (c.osce_count || 0) * (c.osce_points || 0) +
        (c.clinical_case_count || 0) * (c.clinical_case_points || 0) +
        (c.poxa_count || 0) * (c.poxa_points || 0);
    }, 0);
  }, [papers]);

  const totalMinutes = useMemo(
    () => papers.reduce((s, p) => s + p.duration_minutes, 0),
    [papers]
  );

  const handleSave = () => {
    const categories: string[] = [];
    if (writtenEnabled) categories.push('written');
    if (practicalEnabled) categories.push('practical');

    const blueprintConfig = categories.length > 0
      ? {
          categories,
          papers: papers.map((p, i) => ({ ...p, order: i + 1 })),
          essay_settings: {
            handwriting_enabled: handwritingEnabled,
            revision_enabled: revisionEnabled,
            max_revisions: maxRevisions,
          },
        }
      : null;

    updateSettings.mutate({
      moduleId,
      questionCount,
      secondsPerQuestion,
      blueprintConfig,
    });
  };

  const hasBlueprintCategories = writtenEnabled || practicalEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Exam Settings
        </CardTitle>
        <CardDescription>
          Configure mock exam and final exam blueprint for this module
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Blueprint Section */}
        <div>
          <h4 className="text-sm font-medium mb-3">Final Exam Blueprint</h4>

          {/* Category toggles */}
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <Checkbox id="cat-written" checked={writtenEnabled} onCheckedChange={(v) => setWrittenEnabled(!!v)} />
              <Label htmlFor="cat-written" className="text-sm">Written</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="cat-practical" checked={practicalEnabled} onCheckedChange={(v) => setPracticalEnabled(!!v)} />
              <Label htmlFor="cat-practical" className="text-sm">Practical</Label>
            </div>
          </div>

          {/* Written papers */}
          {writtenEnabled && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Written Papers</h5>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addWrittenPaper}>
                  <Plus className="w-3 h-3" /> Add Paper
                </Button>
              </div>
              {writtenPapers.length === 0 && (
                <p className="text-xs text-muted-foreground">No written papers yet. Click "Add Paper" to start.</p>
              )}
              {papers.map((p, i) =>
                p.category === 'written' ? (
                  <ExamPaperConfig
                    key={i}
                    paper={p}
                    index={i}
                    chapters={chapters}
                    onChange={(up) => updatePaper(i, up)}
                    onRemove={() => removePaper(i)}
                  />
                ) : null
              )}
            </div>
          )}

          {/* Practical papers */}
          {practicalEnabled && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practical Papers</h5>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addPracticalPaper}>
                  <Plus className="w-3 h-3" /> Add Paper
                </Button>
              </div>
              {practicalPapers.length === 0 && (
                <p className="text-xs text-muted-foreground">No practical papers yet.</p>
              )}
              {papers.map((p, i) =>
                p.category === 'practical' ? (
                  <ExamPaperConfig
                    key={i}
                    paper={p}
                    index={i}
                    chapters={chapters}
                    onChange={(up) => updatePaper(i, up)}
                    onRemove={() => removePaper(i)}
                  />
                ) : null
              )}
            </div>
          )}

          {/* Summary */}
          {hasBlueprintCategories && papers.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="gap-1">
                <Target className="w-3 h-3" />
                {totalMarks} Total Marks
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                {totalMinutes} min Total
              </Badge>
              <Badge variant="secondary">
                {papers.length} Paper{papers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {/* Essay Answer Settings */}
          {hasBlueprintCategories && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Essay Answer Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hw-enabled"
                    checked={handwritingEnabled}
                    onCheckedChange={(v) => setHandwritingEnabled(!!v)}
                  />
                  <Label htmlFor="hw-enabled" className="text-sm">Enable handwriting mode for essays</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rev-enabled"
                    checked={revisionEnabled}
                    onCheckedChange={(v) => setRevisionEnabled(!!v)}
                  />
                  <Label htmlFor="rev-enabled" className="text-sm">Allow answer revision after finalizing</Label>
                </div>
                {revisionEnabled && (
                  <div className="space-y-1 ml-6">
                    <Label htmlFor="max-rev" className="text-xs">Max revisions per answer</Label>
                    <Input
                      id="max-rev"
                      type="number"
                      min={1}
                      max={5}
                      value={maxRevisions}
                      onChange={(e) => setMaxRevisions(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2 w-full sm:w-auto">
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
