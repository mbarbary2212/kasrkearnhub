import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StructuredCaseRunner } from '@/components/clinical-cases/StructuredCaseRunner';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Clock,
  Play,
  AlertCircle,
  Sparkles,
  History,
  CheckCircle2,
  XCircle,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
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
import { useVirtualPatientCase, useStartVirtualPatientAttempt, useVirtualPatientAttempts } from '@/hooks/useVirtualPatient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useExaminerAvatarById } from '@/lib/examinerAvatars';
import { CaseLeaderboard } from '@/components/clinical-cases/CaseLeaderboard';

const SESSION_KEY = 'ai_case_session';

interface SavedSession {
  caseId: string;
  attemptId: string;
}

export default function VirtualPatientRunner() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  const { data: vpCase, isLoading } = useVirtualPatientCase(caseId);

  const goBack = () => {
    if (vpCase?.module_id && vpCase?.chapter_id) {
      navigate(`/module/${vpCase.module_id}/chapter/${vpCase.chapter_id}?section=interactive`);
    } else {
      navigate(-1);
    }
  };
  const { data: pastAttempts, isLoading: attemptsLoading } = useVirtualPatientAttempts(caseId);
  const startAttempt = useStartVirtualPatientAttempt();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const hasStructuredData = !!(vpCase as any)?.generated_case_data && !!(vpCase as any)?.active_sections?.length;

  // Session recovery from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const session: SavedSession = JSON.parse(saved);
        if (session.caseId === caseId && session.attemptId) {
          setAttemptId(session.attemptId);
          setStarted(true);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [caseId]);

  // Save session when starting
  const saveSession = (aId: string) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        caseId,
        attemptId: aId,
      }));
    } catch {
      // Ignore storage errors
    }
  };

  const clearSession = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
  };

  const avatarId = (vpCase as any)?.avatar_id ?? 1;
  const { data: examiner } = useExaminerAvatarById(avatarId);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!vpCase) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Case Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This case doesn't exist or has been removed.
          </p>
          <Button onClick={goBack}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  // Case lacks structured data — show error instead of fallback
  if (!hasStructuredData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Case Not Ready</h2>
          <p className="text-muted-foreground mb-4">
            This case hasn't been generated yet. Please ask an administrator to generate the case content.
          </p>
          <Button onClick={goBack}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  // ── Structured case runner ──
  if (started && attemptId) {
    return (
      <MainLayout>
        <StructuredCaseRunner
          caseId={vpCase.id}
          attemptId={attemptId}
          caseData={vpCase}
          onComplete={(aId) => {
            clearSession();
            navigate(`/case-summary/${aId}`);
          }}
        />
      </MainLayout>
    );
  }

  const completedAttempts = (pastAttempts || []).filter(a => a.is_completed);
  const activeSections = (vpCase as any).active_sections;
  const sectionCount = Array.isArray(activeSections) ? activeSections.length : 0;

  // Intro screen
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col items-center text-center gap-3 mb-2">
              <Avatar className="w-24 h-24 ring-4 ring-primary/20 border-2 border-background shadow-lg">
                <AvatarImage src={examiner?.image_url} alt={examiner?.name} />
                <AvatarFallback className="text-2xl">{examiner?.name?.charAt(0) || 'E'}</AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">{examiner?.name || 'Examiner'}</p>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline">
                    {vpCase.level.charAt(0).toUpperCase() + vpCase.level.slice(1)} Level
                  </Badge>
                  <Badge className="gap-1 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" variant="secondary">
                    <ClipboardList className="w-3 h-3" />
                    Interactive Case
                  </Badge>
                </div>
                <CardTitle className="text-xl">{vpCase.title}</CardTitle>
              </div>
            </div>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <ClipboardList className="w-4 h-4" />
                {sectionCount} sections
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                ~{vpCase.estimated_minutes} min
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Chief Complaint / Presentation</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {(vpCase as any).chief_complaint || vpCase.intro_text}
              </p>
            </div>

            <Button 
              onClick={async () => {
                try {
                  const result = await startAttempt.mutateAsync({
                    caseId: vpCase.id,
                  });
                  setAttemptId(result.id);
                  setStarted(true);
                  saveSession(result.id);
                } catch {
                  toast.error('Failed to start case. Please try again.');
                }
              }} 
              className="w-full gap-2" 
              size="lg"
              disabled={startAttempt.isPending}
            >
              <Play className="w-5 h-5" />
              {startAttempt.isPending ? 'Starting...' : 'Start Interactive Case'}
            </Button>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <CaseLeaderboard caseId={vpCase.id} />

        {/* Past Attempts */}
        {!attemptsLoading && completedAttempts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Your Previous Attempts ({completedAttempts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedAttempts.slice(0, 5).map((attempt) => {
                  const score = Number(attempt.score) || 0;
                  const passed = score >= 50;
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/case-summary/${attempt.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Score: {score}%</p>
                          <p className="text-xs text-muted-foreground">
                            {attempt.completed_at 
                              ? format(new Date(attempt.completed_at), 'MMM d, yyyy h:mm a')
                              : 'Completed'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={passed ? 'default' : 'secondary'} className="text-xs">
                        {passed ? 'Passed' : 'Needs Review'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
