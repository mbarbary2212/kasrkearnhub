import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AICaseRunner } from '@/components/clinical-cases/AICaseRunner';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Clock,
  Play,
  AlertCircle,
  Sparkles,
  Lightbulb,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useVirtualPatientCase, useStartVirtualPatientAttempt, useVirtualPatientAttempts } from '@/hooks/useVirtualPatient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getExaminerAvatar } from '@/lib/examinerAvatars';

const SESSION_KEY = 'ai_case_session';

interface SavedSession {
  caseId: string;
  attemptId: string;
  hintMode: boolean;
}

export default function VirtualPatientRunner() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  const { data: vpCase, isLoading } = useVirtualPatientCase(caseId);
  const { data: pastAttempts, isLoading: attemptsLoading } = useVirtualPatientAttempts(caseId);
  const startAttempt = useStartVirtualPatientAttempt();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [hintMode, setHintMode] = useState(false);

  // Session recovery from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const session: SavedSession = JSON.parse(saved);
        if (session.caseId === caseId && session.attemptId) {
          setAttemptId(session.attemptId);
          setHintMode(session.hintMode ?? false);
          setStarted(true);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [caseId]);

  // Save session when starting
  const saveSession = (aId: string, hint: boolean) => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        caseId,
        attemptId: aId,
        hintMode: hint,
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
  const examiner = getExaminerAvatar(avatarId);

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
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  // AI case is running
  if (started && attemptId) {
    return (
      <MainLayout>
        <AICaseRunner
          caseId={vpCase.id}
          attemptId={attemptId}
          introText={vpCase.intro_text}
          title={vpCase.title}
          hintMode={hintMode}
          avatarId={avatarId}
          onComplete={() => {
            clearSession();
            navigate(-1);
          }}
        />
      </MainLayout>
    );
  }

  const completedAttempts = (pastAttempts || []).filter(a => a.is_completed);

  // Intro screen
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-16 h-16 border-2 border-background shadow-md">
                <AvatarImage src={examiner.image} alt={examiner.name} />
                <AvatarFallback>{examiner.name.charAt(4)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">
                    {vpCase.level.charAt(0).toUpperCase() + vpCase.level.slice(1)} Level
                  </Badge>
                  <Badge className="gap-1 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" variant="secondary">
                    <Sparkles className="w-3 h-3" />
                    AI Case
                  </Badge>
                </div>
                <CardTitle className="text-xl">{vpCase.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Examiner: {examiner.name}</p>
              </div>
            </div>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {vpCase.max_turns || 10} turns
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
              <p className="text-muted-foreground whitespace-pre-wrap">{vpCase.intro_text}</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <div>
                  <Label htmlFor="hint-mode" className="text-sm font-medium">Learning Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {hintMode 
                      ? 'Teaching hints shown after each answer' 
                      : 'Exam mode — feedback only at the end'}
                  </p>
                </div>
              </div>
              <Switch
                id="hint-mode"
                checked={hintMode}
                onCheckedChange={setHintMode}
              />
            </div>

            <Button 
              onClick={async () => {
                try {
                  const result = await startAttempt.mutateAsync({
                    caseId: vpCase.id,
                  });
                  setAttemptId(result.id);
                  setStarted(true);
                  saveSession(result.id, hintMode);
                } catch {
                  toast.error('Failed to start case. Please try again.');
                }
              }} 
              className="w-full gap-2" 
              size="lg"
              disabled={startAttempt.isPending}
            >
              <Play className="w-5 h-5" />
              {startAttempt.isPending ? 'Starting...' : 'Start AI Case'}
            </Button>
          </CardContent>
        </Card>

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
                    <div key={attempt.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
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
