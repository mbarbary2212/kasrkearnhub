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
} from 'lucide-react';
import { useModuleMcqs } from '@/hooks/useMcqs';
import { 
  useMockExamSettings, 
  useMockExamAttempts, 
  formatDuration,
} from '@/hooks/useMockExam';
import { useAuthContext } from '@/contexts/AuthContext';
import { MockExamAdminSettings } from '@/components/exam/MockExamAdminSettings';
import { format } from 'date-fns';

interface ChapterMockExamSectionProps {
  moduleId: string;
}

export function ChapterMockExamSection({ moduleId }: ChapterMockExamSectionProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mock Timed Exam Card */}
      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Mock Timed Exam</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Simulate real exam conditions with a timed MCQ assessment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasEnoughQuestions ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Target className="w-3 h-3" />
                  {questionCount} Questions
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatDuration(totalTime)}
                </Badge>
              </div>
              <Button onClick={handleStartExam} className="w-full gap-2" size="sm">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              Previous Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attempts.slice(0, 3).map((attempt) => {
                const percentage = attempt.total_questions > 0 
                  ? Math.round((attempt.score / attempt.total_questions) * 100) 
                  : 0;
                const date = attempt.submitted_at 
                  ? format(new Date(attempt.submitted_at), 'MMM d, yyyy h:mm a')
                  : 'In progress';

                return (
                  <div 
                    key={attempt.id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {attempt.score}/{attempt.total_questions} ({percentage}%)
                      </p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    {attempt.duration_seconds && (
                      <Badge variant="outline" className="text-xs">
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