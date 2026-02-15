import { useNavigate } from 'react-router-dom';
import { PaperConfig } from '@/components/exam/ExamPaperConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Clock, 
  GraduationCap,
  ChevronRight,
  ChevronDown,
  History,
  Target,
  Pencil,
  BookOpen,
  Settings,
  FileText,
} from 'lucide-react';
import { ModuleChapter } from '@/hooks/useChapters';
import { useModuleMcqs } from '@/hooks/useMcqs';
import { 
  useMockExamSettings, 
  useMockExamAttempts, 
  formatDuration,
} from '@/hooks/useMockExam';
import { useAuthContext } from '@/contexts/AuthContext';
import { MockExamAdminSettings } from '@/components/exam';
import { format } from 'date-fns';
import { useState } from 'react';

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

  const [existingOpen, setExistingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const bp = settings?.blueprint_config as { categories?: string[]; papers?: PaperConfig[] } | null;
  const papers = bp?.papers || [];

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
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Exam Management</h2>
          <p className="text-muted-foreground text-sm">
            Configure exam blueprints for students
          </p>
        </div>

        {/* Existing Exam Papers - Collapsible */}
        <Collapsible open={existingOpen} onOpenChange={setExistingOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Existing Exam Papers
                    {papers.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{papers.length}</Badge>
                    )}
                  </CardTitle>
                  {existingOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                <CardDescription>
                  {papers.length > 0 
                    ? 'Review the exam papers currently configured for students' 
                    : 'No exam papers configured yet'}
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {papers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No papers yet. Use the Blueprint Settings below to create exam papers.
                  </p>
                ) : (
                  papers.map((paper, idx) => {
                    const c = paper.components;
                    const isWritten = paper.category === 'written';
                    const totalMarks = isWritten
                      ? c.mcq_count * c.mcq_points + c.essay_count * c.essay_points
                      : (c.osce_count || 0) * (c.osce_points || 0) +
                        (c.clinical_case_count || 0) * (c.clinical_case_points || 0) +
                        (c.poxa_count || 0) * (c.poxa_points || 0);

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{paper.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {isWritten ? 'Written' : 'Practical'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Target className="w-3 h-3" />
                            {totalMarks} marks
                          </Badge>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {paper.duration_minutes} min
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSettingsOpen(true)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Blueprint</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Blueprint Settings - Collapsible */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Blueprint Settings
                  </CardTitle>
                  {settingsOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                <CardDescription>Create or edit exam blueprints</CardDescription>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {settings && (
              <MockExamAdminSettings moduleId={moduleId} settings={settings} chapters={chapters} />
            )}
          </CollapsibleContent>
        </Collapsible>
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
      {papers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No exams are available for this module yet.
            </p>
          </CardContent>
        </Card>
      )}

      {papers.map((paper, idx) => {
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
