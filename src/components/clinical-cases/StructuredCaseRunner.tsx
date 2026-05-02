import { useState, useEffect, useCallback, useMemo } from 'react';
import { useExaminerAvatarById } from '@/lib/examinerAvatars';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Send,
  DoorOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionType,
  SECTION_LABELS,
  StructuredCaseData,
} from '@/types/structuredCase';
import {
  HistoryTakingSection,
  PhysicalExamSection,
  InvestigationsLabsSection,
  InvestigationsImagingSection,
  DiagnosisSection,
  ManagementSection,
  MonitoringSection,
  AdviceSection,
  ConclusionSection,
} from './sections';
import { supabase } from '@/integrations/supabase/client';
import { stopAllTTS } from '@/utils/tts';
import { captureWithContext, addAppBreadcrumb } from '@/lib/sentry';

// ── Props ────────────────────────────────────────────
interface StructuredCaseRunnerProps {
  caseId: string;
  attemptId: string;
  caseData: any; // row from virtual_patient_cases
  onComplete: (attemptId: string) => void;
}

const SECTION_COMPONENT_MAP: Record<SectionType, React.ComponentType<any>> = {
  history_taking: HistoryTakingSection,
  physical_examination: PhysicalExamSection,
  investigations_labs: InvestigationsLabsSection,
  investigations_imaging: InvestigationsImagingSection,
  diagnosis: DiagnosisSection,
  medical_management: ManagementSection,
  surgical_management: ManagementSection,
  monitoring_followup: MonitoringSection,
  patient_family_advice: AdviceSection,
  conclusion: ConclusionSection,
};

export function StructuredCaseRunner({
  caseId,
  attemptId,
  caseData,
  onComplete,
}: StructuredCaseRunnerProps) {
  const generatedData = caseData.generated_case_data as StructuredCaseData | null;
  const activeSections = (caseData.active_sections as SectionType[]) || [];
  const historyInteractionMode = (caseData.history_interaction_mode as string) || 'text';
  const avatarId = (caseData.avatar_id as number) || 1;
  const { data: examinerAvatar } = useExaminerAvatarById(avatarId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [startTime] = useState(Date.now());
  const [studentName, setStudentName] = useState('');
  const [studentAvatarUrl, setStudentAvatarUrl] = useState('');

  // Fetch student name + avatar for watermark & face-to-face layout
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      setStudentName(user?.user_metadata?.full_name || user?.email || '');
      if (user?.id) {
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.avatar_url) setStudentAvatarUrl(profile.avatar_url);
          });
      }
    });
  }, []);

  // Stop all TTS on unmount (covers browser back, Home, avatar click, etc.)
  useEffect(() => {
    return () => { stopAllTTS(); };
  }, []);

  const currentSection = activeSections[currentIndex];
  const totalSections = activeSections.length;
  const progress = totalSections > 0 ? ((completedSections.size) / totalSections) * 100 : 0;

  const sectionData = useMemo(() => {
    if (!generatedData || !currentSection) return null;
    return (generatedData as any)[currentSection];
  }, [generatedData, currentSection]);

  const handleSectionSubmit = useCallback(async (answer: Record<string, unknown>) => {
    if (!currentSection) return;
    setIsSubmittingSection(true);

    try {
      addAppBreadcrumb('interactive_case', 'section submit', {
        case_id: caseId,
        attempt_id: attemptId,
        stage: currentSection,
      });
      // Save answer to case_section_answers
      const { error } = await supabase
        .from('case_section_answers')
        .upsert(
          {
            attempt_id: attemptId,
            section_type: currentSection,
            student_answer: answer as any,
            max_score: sectionData?.max_score || 0,
            is_scored: false,
          } as any,
          { onConflict: 'attempt_id,section_type' }
        );

      if (error) throw error;

      // Track locally
      setAnswers(prev => ({ ...prev, [currentSection]: answer }));
      setCompletedSections(prev => new Set([...prev, currentSection]));

      // Auto-advance
      if (currentIndex < totalSections - 1) {
        setCurrentIndex(prev => prev + 1);
      }

      toast.success(`${SECTION_LABELS[currentSection]} submitted`);
    } catch (err) {
      console.error('Failed to save section answer:', err);
      captureWithContext(err, {
        tags: {
          feature: 'db_write',
          table: 'case_section_answers',
          operation: 'upsert',
        },
        extra: {
          case_id: caseId,
          attempt_id: attemptId,
          stage: currentSection,
          error_code: (err as any)?.code,
          error_message: (err as Error)?.message,
          supabase_hint: (err as any)?.hint,
        },
      });
      toast.error('Failed to save your answer. Please try again.');
    } finally {
      setIsSubmittingSection(false);
    }
  }, [currentSection, attemptId, sectionData, currentIndex, totalSections]);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      addAppBreadcrumb('interactive_case', 'case finish requested', {
        case_id: caseId,
        attempt_id: attemptId,
        time_taken_seconds: timeTaken,
      });
      // Mark attempt as completed
      const { error: completeErr } = await supabase
        .from('virtual_patient_attempts')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          time_taken_seconds: timeTaken,
        })
        .eq('id', attemptId);
      if (completeErr) {
        captureWithContext(completeErr, {
          tags: {
            feature: 'db_write',
            table: 'virtual_patient_attempts',
            operation: 'update',
          },
          extra: {
            case_id: caseId,
            attempt_id: attemptId,
            error_code: (completeErr as any)?.code,
            error_message: (completeErr as Error)?.message,
            supabase_hint: (completeErr as any)?.hint,
          },
        });
      }

      // Await scoring with a 15s timeout so the request isn't aborted by navigation
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        addAppBreadcrumb('ai_call', 'score-case-answers starting', {
          attempt_id: attemptId,
          case_id: caseId,
        });
        await supabase.functions.invoke('score-case-answers', {
          body: { attempt_id: attemptId, case_id: caseId },
        });
        clearTimeout(timeout);
      } catch (err) {
        console.warn('Scoring request error (CaseSummary retry will handle):', err);
        captureWithContext(err, {
          tags: {
            feature: 'ai_call',
            ai_task: 'case_marking',
            provider: 'edge_function',
            subfeature: 'score_case_answers',
          },
          extra: {
            attempt_id: attemptId,
            case_id: caseId,
            error_message: (err as Error)?.message,
          },
        });
      }

      onComplete(attemptId);
    } catch (err) {
      console.error('Failed to finish case:', err);
      captureWithContext(err, {
        tags: {
          feature: 'interactive_case',
          subfeature: 'state_machine',
        },
        extra: {
          case_id: caseId,
          attempt_id: attemptId,
          error_message: (err as Error)?.message,
        },
      });
      toast.error('Failed to submit case');
    } finally {
      setIsFinishing(false);
    }
  };

  if (!generatedData) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">This case has no generated content yet.</p>
      </div>
    );
  }

  const allCompleted = completedSections.size === totalSections;
  const SectionComponent = currentSection ? SECTION_COMPONENT_MAP[currentSection] : null;

  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Progress header */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {examinerAvatar?.image_url && (
                <Avatar className="w-10 h-10 ring-2 ring-primary/20 border border-background shadow-sm shrink-0">
                  <AvatarImage src={examinerAvatar.image_url} alt={examinerAvatar.name} />
                  <AvatarFallback>{examinerAvatar?.name?.charAt(0) || 'E'}</AvatarFallback>
                </Avatar>
              )}
              <h2 className="font-semibold text-sm truncate">{caseData.title}</h2>
              <span className="text-xs text-muted-foreground shrink-0">
                {currentIndex + 1}/{totalSections} · {completedSections.size} done
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <DoorOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Abort</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Abort this case?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your completed sections are saved, but any in-progress work on the current section will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Continue Case</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      stopAllTTS();
                      sessionStorage.removeItem('ai_case_session');
                      const chapterId = caseData.chapter_id;
                      const moduleId = caseData.module_id;
                      if (chapterId && moduleId) {
                        navigate(`/module/${moduleId}/chapter/${chapterId}?section=interactive`);
                      } else {
                        navigate(-1);
                      }
                    }}>
                      Abort Case
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Section stepper pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {activeSections.map((s, i) => {
          const isCompleted = completedSections.has(s);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={s}
              onClick={() => {
                if (isCompleted || i <= currentIndex) setCurrentIndex(i);
              }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                isCurrent
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isCompleted
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted/50 text-muted-foreground border-transparent',
                !isCompleted && i > currentIndex && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!isCompleted && i > currentIndex}
            >
              {isCompleted && <CheckCircle2 className="w-3 h-3" />}
              {SECTION_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* Active section */}
      <Card
        className="select-none"
        onCopy={e => e.preventDefault()}
        onPaste={e => e.preventDefault()}
        onCut={e => e.preventDefault()}
        onContextMenu={e => e.preventDefault()}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {SECTION_LABELS[currentSection]}
            {completedSections.has(currentSection) && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="w-3 h-3" /> Done
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {SectionComponent && sectionData && (
            <SectionComponent
              data={sectionData}
              onSubmit={handleSectionSubmit}
              isSubmitting={isSubmittingSection}
              readOnly={completedSections.has(currentSection)}
              previousAnswer={answers[currentSection] || null}
              avatarUrl={examinerAvatar?.image_url}
              avatarName={examinerAvatar?.name}
              historyInteractionMode={historyInteractionMode}
              caseId={caseId}
              studentName={studentName}
              studentAvatarUrl={studentAvatarUrl}
              patientTone={generatedData?.patient?.tone}
              estimatedMinutes={caseData.estimated_minutes}
              voiceIdOverride={(generatedData?.patient as any)?.voice_id}
              voiceProviderOverride={(generatedData?.patient as any)?.voice_provider}
              patientGender={(generatedData?.patient as any)?.gender}
              patientAge={(generatedData?.patient as any)?.age}
              chiefComplaint={caseData.chief_complaint || (generatedData?.case_meta as any)?.chief_complaint || caseData.intro_text}
              historyTimeLimitMinutes={(generatedData as any)?.history_time_limit_minutes}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation + finish */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {currentIndex < totalSections - 1 && completedSections.has(currentSection) && (
          <Button
            size="sm"
            onClick={() => setCurrentIndex(prev => prev + 1)}
          >
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}

        {allCompleted && (
          <Button
            onClick={handleFinish}
            disabled={isFinishing}
            className="gap-2"
          >
            {isFinishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Case
          </Button>
        )}
      </div>
    </div>
  );
}
