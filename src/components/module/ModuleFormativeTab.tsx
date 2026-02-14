import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardCheck, 
  Clock, 
  GraduationCap,
  ChevronRight,
  History,
  Target,
  BookOpen,
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
  
  // Fetch MCQs, settings, and attempts
  const { data: mcqs, isLoading: mcqsLoading } = useModuleMcqs(moduleId);
  const { data: settings, isLoading: settingsLoading } = useMockExamSettings(moduleId);
  const { data: attempts, isLoading: attemptsLoading } = useMockExamAttempts(moduleId);

  const isAdmin = auth.isPlatformAdmin || auth.isSuperAdmin;
  const isLoading = mcqsLoading || settingsLoading;

  // Calculate exam info
  const mcqCount = mcqs?.length || 0;
  const questionCount = settings ? Math.min(settings.question_count, mcqCount) : 0;
  const totalTime = settings ? questionCount * settings.seconds_per_question : 0;
  const hasEnoughQuestions = mcqCount > 0;

  const handleStartExam = () => {
    navigate(`/module/${moduleId}/mock-exam`);
  };

  const handleGoToChapter = (chapterId: string) => {
    navigate(`/module/${moduleId}/chapter/${chapterId}`);
  };

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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Formative Assessment</h2>
        <p className="text-muted-foreground text-sm">
          Test your knowledge with timed exams or chapter-level practice
        </p>
      </div>

      {/* Mock Timed Exam Card - Full Module */}
      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Full Module Mock Exam</CardTitle>
              <CardDescription className="mt-1">
                Simulate real exam conditions with a timed MCQ assessment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasEnoughQuestions ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Target className="w-3 h-3" />
                  {questionCount} Questions
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(totalTime)}
                </Badge>
              </div>
              <Button onClick={handleStartExam} className="w-full gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Start Exam
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                Mock exam is not available yet for this module.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No MCQ questions have been added.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Admin Settings */}
      {isAdmin && settings && (
        <MockExamAdminSettings moduleId={moduleId} settings={settings} />
      )}
    </div>
  );
}
