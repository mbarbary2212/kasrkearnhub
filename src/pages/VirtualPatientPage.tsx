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
import { useAuthContext } from '@/contexts/AuthContext';
import { MaterialReactionRow } from '@/components/shared/MaterialReactionRow';

const SESSION_KEY = 'ai_case_session';

interface SavedSession {
  caseId: string;
  attemptId: string;
}

export default function VirtualPatientRunner() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  
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
  const [showBriefing, setShowBriefing] = useState(false);

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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const attemptsToday = (pastAttempts ?? []).filter(a =>
    new Date(a.started_at) >= todayStart
  ).length;
  const canStartToday = isSuperAdmin || isPlatformAdmin || attemptsToday < 2;

  const caseData = (vpCase as any)?.generated_case_data;
  const patientName = caseData?.patient_name || caseData?.name;
  const patientAge = caseData?.age;
  const patientGender = caseData?.gender;
  const presentingComplaint = caseData?.chief_complaint || caseData?.presenting_complaint;

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

            <MaterialReactionRow
              materialType="case"
              materialId={caseId}
              chapterId={vpCase.chapter_id}
              className="justify-center"
            />

            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowBriefing(true)}
                className="flex-1 gap-2" 
                size="lg"
                disabled={!canStartToday || startAttempt.isPending}
              >
                <Play className="w-5 h-5" />
                {startAttempt.isPending ? 'Starting...' : 'Start Interactive Case'}
              </Button>
              {!canStartToday && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 shrink-0">
                  2/2 today
                </Badge>
              )}
            </div>

            {/* Pre-case briefing dialog */}
            <AlertDialog open={showBriefing} onOpenChange={setShowBriefing}>
              <AlertDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Before You Begin
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      {/* Patient intro card */}
                      {(patientName || patientAge || patientGender || presentingComplaint) && (
                        <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
                          {patientName && (
                            <p><span className="font-medium text-foreground">Patient:</span> {patientName}</p>
                          )}
                          {(patientAge || patientGender) && (
                            <p>
                              <span className="font-medium text-foreground">Age / Gender:</span>{' '}
                              {[patientAge, patientGender].filter(Boolean).join(' / ')}
                            </p>
                          )}
                          {presentingComplaint && (
                            <p><span className="font-medium text-foreground">Presenting complaint:</span> {presentingComplaint}</p>
                          )}
                        </div>
                      )}

                      <p>This case has several sections. After each section you will submit your answers before moving on.</p>
                      
                      <div className="space-y-2.5">
                        <div>
                          <p className="font-medium text-foreground">History Taking</p>
                          <p>Interview the virtual patient. Gather focused data to answer follow-up questions about the presenting complaint, symptoms, and relevant history.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Physical Examination</p>
                          <p>Select body regions on a body map. After revealing findings, write a brief summary of the key abnormalities you identified.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Investigations — Labs</p>
                          <p>Select which laboratory tests you would order. Review the results provided.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Investigations — Imaging</p>
                          <p>Select which imaging studies you would request. Review and interpret the results.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Diagnosis</p>
                          <p>Write your possible diagnosis, list differential diagnoses, and state your final diagnosis with justification.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Management</p>
                          <p>Answer multiple-choice and free-text questions about your treatment plan (medical and/or surgical).</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Monitoring & Follow-up</p>
                          <p>Describe your monitoring plan and follow-up strategy.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Patient & Family Advice</p>
                          <p>Write the advice you would give the patient and their family.</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Conclusion</p>
                          <p>Complete final tasks such as a ward round presentation or key learning reflections.</p>
                        </div>
                      </div>

                      <p className="text-xs border-t pt-2 text-muted-foreground">
                        Only sections active for this case will appear. You can review completed sections but cannot change your answers.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2">
                  <div className="flex gap-2 w-full">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!canStartToday || startAttempt.isPending}
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
                    >
                      {!canStartToday
                        ? 'Daily limit reached (2/2)'
                        : startAttempt.isPending
                          ? 'Starting...'
                          : 'Begin Case'}
                    </AlertDialogAction>
                  </div>
                  {!canStartToday && (
                    <p className="text-xs text-muted-foreground text-center">
                      You've used both attempts for today. Come back tomorrow to try again.
                    </p>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
