import { useNavigate } from 'react-router-dom';
import { PaperConfig, ExamPaperConfig } from '@/components/exam/ExamPaperConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Clock, 
  GraduationCap,
  ChevronRight,
  History,
  Target,
  Pencil,
  BookOpen,
  Plus,
  ArrowLeft,
  Save,
  Trash2,
} from 'lucide-react';
import { ModuleChapter } from '@/hooks/useChapters';
import { useModuleMcqs } from '@/hooks/useMcqs';
import { 
  useMockExamSettings, 
  useMockExamAttempts, 
  useUpdateMockExamSettings,
  formatDuration,
} from '@/hooks/useMockExam';
import { useAuthContext } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

interface ModuleFormativeTabProps {
  moduleId: string;
  moduleName: string;
  chapters: ModuleChapter[] | undefined;
  selectorLabel?: string;
}

export function ModuleFormativeTab({ 
  moduleId, 
  moduleName,
  chapters,
}: ModuleFormativeTabProps) {
  const navigate = useNavigate();
  const auth = useAuthContext();
  
  const { data: mcqs, isLoading: mcqsLoading } = useModuleMcqs(moduleId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);
  const { data: attempts, isLoading: attemptsLoading } = useMockExamAttempts(moduleId);

  const isAdmin = auth.isPlatformAdmin || auth.isSuperAdmin;
  const isLoading = mcqsLoading || settingsLoading;

  const updateSettings = useUpdateMockExamSettings();

  // Admin state
  const [activeCategory, setActiveCategory] = useState<'written' | 'practical'>('written');
  const [editingPaperIndex, setEditingPaperIndex] = useState<number | null>(null);
  const [localPapers, setLocalPapers] = useState<PaperConfig[]>([]);
  const [papersInitialized, setPapersInitialized] = useState(false);

  // Initialize local papers from settings
  if (!papersInitialized && settings) {
    const bp = settings.blueprint_config as { papers?: PaperConfig[] } | null;
    setLocalPapers(bp?.papers || []);
    setPapersInitialized(true);
  }

  const writtenPapers = localPapers.filter(p => p.category === 'written');
  const practicalPapers = localPapers.filter(p => p.category === 'practical');
  const activePapers = activeCategory === 'written' ? writtenPapers : practicalPapers;

  const totalMarks = useMemo(() => localPapers.reduce((sum, p) => {
    const c = p.components;
    if (p.category === 'written') return sum + c.mcq_count * c.mcq_points + c.essay_count * c.essay_points;
    return sum + (c.osce_count || 0) * (c.osce_points || 0) + (c.clinical_case_count || 0) * (c.clinical_case_points || 0) + (c.poxa_count || 0) * (c.poxa_points || 0);
  }, 0), [localPapers]);

  const totalMinutes = useMemo(() => localPapers.reduce((s, p) => s + p.duration_minutes, 0), [localPapers]);

  const defaultWrittenComponents = { mcq_count: 50, mcq_points: 1, essay_count: 0, essay_points: 5 };
  const defaultPracticalComponents = { mcq_count: 0, mcq_points: 0, essay_count: 0, essay_points: 0, osce_count: 15, osce_points: 10, osce_seconds_per_station: 150, clinical_case_count: 2, clinical_case_points: 20, poxa_count: 0, poxa_points: 5 };

  const addPaper = (category: 'written' | 'practical') => {
    const isWritten = category === 'written';
    const count = localPapers.filter(p => p.category === category).length;
    const newPaper: PaperConfig = {
      name: isWritten ? `Written Paper ${count + 1}` : `OSCE ${count + 1}`,
      category,
      order: count + 1,
      duration_minutes: isWritten ? 180 : 90,
      instructions: '',
      chapter_ids: [],
      question_order: 'essays_first',
      components: isWritten ? { ...defaultWrittenComponents } : { ...defaultPracticalComponents },
    };
    const updated = [...localPapers, newPaper];
    setLocalPapers(updated);
    setEditingPaperIndex(updated.length - 1);
  };

  const removePaper = (globalIdx: number) => {
    setLocalPapers(localPapers.filter((_, i) => i !== globalIdx));
    setEditingPaperIndex(null);
  };

  const updatePaper = (globalIdx: number, paper: PaperConfig) => {
    const next = [...localPapers];
    next[globalIdx] = paper;
    setLocalPapers(next);
  };

  const handleSave = () => {
    const categories: string[] = [];
    if (writtenPapers.length > 0) categories.push('written');
    if (practicalPapers.length > 0) categories.push('practical');

    const blueprintConfig = localPapers.length > 0
      ? { categories, papers: localPapers.map((p, i) => ({ ...p, order: i + 1 })) }
      : null;

    updateSettings.mutate({
      moduleId,
      questionCount: settings?.question_count ?? 50,
      secondsPerQuestion: settings?.seconds_per_question ?? 60,
      blueprintConfig,
    });
  };

  const calcPaperMarks = (paper: PaperConfig) => {
    const c = paper.components;
    if (paper.category === 'written') return c.mcq_count * c.mcq_points + c.essay_count * c.essay_points;
    return (c.osce_count || 0) * (c.osce_points || 0) + (c.clinical_case_count || 0) * (c.clinical_case_points || 0) + (c.poxa_count || 0) * (c.poxa_points || 0);
  };

  // Get global index for a paper shown in the active category
  const getGlobalIndex = (categoryPaper: PaperConfig) => localPapers.indexOf(categoryPaper);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <Skeleton className="h-7 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── ADMIN VIEW ──
  if (isAdmin) {
    // Editing a single paper
    if (editingPaperIndex !== null && localPapers[editingPaperIndex]) {
      const paper = localPapers[editingPaperIndex];
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingPaperIndex(null)} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <h3 className="text-lg font-semibold flex-1">{paper.name || 'Untitled Paper'}</h3>
            <Button variant="destructive" size="sm" onClick={() => removePaper(editingPaperIndex)} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>

          <ExamPaperConfig
            paper={paper}
            index={editingPaperIndex}
            chapters={chapters || []}
            onChange={(updated) => updatePaper(editingPaperIndex, updated)}
            onRemove={() => removePaper(editingPaperIndex)}
          />

          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      );
    }

    // Main tabbed view
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-xl font-semibold mb-2">Exam Management</h2>
          <p className="text-muted-foreground text-sm">Configure exam blueprints for students</p>
        </div>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'written' | 'practical')}>
          <TabsList className="w-full">
            <TabsTrigger value="written" className="flex-1 gap-1">
              Written
              {writtenPapers.length > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{writtenPapers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="practical" className="flex-1 gap-1">
              Practical
              {practicalPapers.length > 0 && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{practicalPapers.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="written">
            <AdminPaperList
              papers={writtenPapers}
              category="written"
              onEdit={(paper) => setEditingPaperIndex(getGlobalIndex(paper))}
              onAdd={() => addPaper('written')}
              calcMarks={calcPaperMarks}
            />
          </TabsContent>

          <TabsContent value="practical">
            <AdminPaperList
              papers={practicalPapers}
              category="practical"
              onEdit={(paper) => setEditingPaperIndex(getGlobalIndex(paper))}
              onAdd={() => addPaper('practical')}
              calcMarks={calcPaperMarks}
            />
          </TabsContent>
        </Tabs>

        {/* Summary */}
        {localPapers.length > 0 && (
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge variant="secondary" className="gap-1">
              <Target className="w-3 h-3" /> {totalMarks} Total Marks
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" /> {totalMinutes} min Total
            </Badge>
            <Badge variant="secondary">
              {localPapers.length} Paper{localPapers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2 w-full sm:w-auto">
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    );
  }

  // ── STUDENT VIEW ──
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Formative Assessment</h2>
        <p className="text-muted-foreground text-sm">
          Test your knowledge with timed exam simulations
        </p>
      </div>

      {/* Blueprint Final Exam Cards */}
      {localPapers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No exams are available for this module yet.
            </p>
          </CardContent>
        </Card>
      )}

      {localPapers.map((paper, idx) => {
        const c = paper.components;
        const isWritten = paper.category === 'written';
        const totalMarks = isWritten
          ? c.mcq_count * c.mcq_points + c.essay_count * c.essay_points
          : (c.osce_count || 0) * (c.osce_points || 0) +
            (c.clinical_case_count || 0) * (c.clinical_case_points || 0) +
            (c.poxa_count || 0) * (c.poxa_points || 0);

        return (
          <Card key={idx} className="hover:shadow-md transition-all border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{paper.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Final Exam Simulator · {isWritten ? 'Written' : 'Practical'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Target className="w-3 h-3" />
                  {totalMarks} Marks
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {paper.duration_minutes} min
                </Badge>
                {isWritten && c.mcq_count > 0 && (
                  <Badge variant="outline">{c.mcq_count} MCQs</Badge>
                )}
                {isWritten && c.essay_count > 0 && (
                  <Badge variant="outline">{c.essay_count} Essays</Badge>
                )}
              </div>
              <Button
                onClick={() => navigate(`/module/${moduleId}/blueprint-exam/${idx}`)}
                className="w-full gap-2"
                variant="default"
              >
                <GraduationCap className="w-4 h-4" />
                Start Exam
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Previous Attempts */}
      {!attemptsLoading && attempts && attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Previous Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attempts.slice(0, 5).map((attempt) => {
                const percentage = attempt.total_questions > 0 
                  ? Math.round((attempt.score / attempt.total_questions) * 100) 
                  : 0;
                const date = attempt.submitted_at 
                  ? format(new Date(attempt.submitted_at), 'MMM d, yyyy h:mm a')
                  : 'In progress';

                return (
                  <div 
                    key={attempt.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {attempt.score}/{attempt.total_questions} ({percentage}%)
                      </p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    {attempt.duration_seconds && (
                      <Badge variant="outline">
                        {formatDuration(attempt.duration_seconds)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Admin Paper List sub-component ──
function AdminPaperList({
  papers,
  category,
  onEdit,
  onAdd,
  calcMarks,
}: {
  papers: PaperConfig[];
  category: 'written' | 'practical';
  onEdit: (paper: PaperConfig) => void;
  onAdd: () => void;
  calcMarks: (paper: PaperConfig) => number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {category === 'written' ? 'Written' : 'Practical'} Papers
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={onAdd}>
            <Plus className="w-3 h-3" /> New Paper
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {papers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No {category} papers yet. Click "New Paper" to create one.
          </p>
        ) : (
          papers.map((paper, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{paper.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {calcMarks(paper)} marks · {paper.duration_minutes} min
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(paper)} className="gap-1">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
