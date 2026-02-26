import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AskCoachButton } from '@/components/coach';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  User,
  Clock,
  Play,
  RotateCcw,
  Home,
  AlertCircle,
  FileText,
  Check,
  X,
} from 'lucide-react';
import { 
  useVirtualPatientCase, 
  useStartVirtualPatientAttempt,
  useSubmitStageAnswer,
  useCompleteVirtualPatientAttempt,
} from '@/hooks/useVirtualPatient';
import { VPStage, StageAnswer, VPRubricResult, VPPatientState, shouldShowImmediateFeedbackVP } from '@/types/virtualPatient';
import { gradeWithRubric, gradeExactMatch } from '@/lib/rubricMarking';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCoachContext } from '@/contexts/CoachContext';

type RunnerState = 'intro' | 'running' | 'consequence' | 'feedback' | 'summary';

export default function VirtualPatientRunner() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { setStudyContext } = useCoachContext();
  
  const { data: vpCase, isLoading } = useVirtualPatientCase(caseId);
  const startAttempt = useStartVirtualPatientAttempt();
  const submitAnswer = useSubmitStageAnswer();
  const completeAttempt = useCompleteVirtualPatientAttempt();

  const [state, setState] = useState<RunnerState>('intro');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | string[]>('');
  const [stageAnswers, setStageAnswers] = useState<Record<string, StageAnswer>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [stageStartTime, setStageStartTime] = useState<number | null>(null);
  const [revealedPatientInfo, setRevealedPatientInfo] = useState<string[]>([]);
  const [patientState, setPatientState] = useState<VPPatientState | null>(null);
  const [lastConsequence, setLastConsequence] = useState<string | null>(null);

  const stages = vpCase?.stages || [];
  const currentStage = stages[currentStageIndex];
  const totalStages = stages.length;
  const progress = totalStages > 0 ? ((currentStageIndex + 1) / totalStages) * 100 : 0;

  // Update coach context when stage changes
  useEffect(() => {
    if (currentStage && vpCase) {
      setStudyContext({
        moduleId: vpCase.module_id || undefined,
        moduleName: vpCase.module?.name,
        chapterId: vpCase.chapter_id || undefined,
        chapterName: vpCase.chapter?.title,
        pageType: 'practice',
        question: {
          questionId: currentStage.id,
          questionText: currentStage.prompt,
          questionType: currentStage.stage_type === 'multi_select' ? 'mcq' : currentStage.stage_type === 'short_answer' ? 'essay' : 'mcq',
          choices: currentStage.choices.map(c => ({ key: c.key, text: c.text })),
          correctAnswer: Array.isArray(currentStage.correct_answer) 
            ? currentStage.correct_answer.join(', ') 
            : currentStage.correct_answer,
          explanation: currentStage.explanation || undefined,
        },
      });
    }
  }, [currentStage, vpCase, setStudyContext]);

  const handleStartCase = async () => {
    if (!vpCase) return;

    try {
      const result = await startAttempt.mutateAsync({
        caseId: vpCase.id,
        totalStages: stages.length,
      });
      setAttemptId(result.id);
      setStartTime(Date.now());
      setStageStartTime(Date.now());
      setState('running');
      
      // Initialize patient state from case if available
      if (vpCase.initial_state_json) {
        setPatientState(vpCase.initial_state_json as VPPatientState);
      }
      
      // Add first stage's patient info
      if (stages[0]?.patient_info) {
        setRevealedPatientInfo([stages[0].patient_info]);
      }
    } catch (error) {
      toast.error('Failed to start case. Please try again.');
    }
  };

  const checkAnswer = (stage: VPStage, answer: string | string[]): { isCorrect: boolean; rubricResult?: VPRubricResult } => {
    // Read-only stages are always "correct" (non-scored)
    if (stage.stage_type === 'read_only') {
      return { isCorrect: true };
    }
    
    if (stage.stage_type === 'mcq') {
      return { isCorrect: answer === stage.correct_answer };
    } else if (stage.stage_type === 'multi_select') {
      const correct = stage.correct_answer as string[];
      const userAns = answer as string[];
      const isCorrect = correct.length === userAns.length && 
             correct.every(c => userAns.includes(c));
      return { isCorrect };
    } else {
      // Short answer - use rubric if available, otherwise exact match
      if (stage.rubric && stage.rubric.required_concepts.length > 0) {
        const rubricResult = gradeWithRubric(answer as string, stage.rubric);
        return { isCorrect: rubricResult.is_correct, rubricResult };
      } else {
        const isCorrect = gradeExactMatch(answer as string, stage.correct_answer as string);
        return { isCorrect };
      }
    }
  };

  // Apply state delta to patient state
  const applyStateDelta = (delta: Partial<VPPatientState> | null) => {
    if (!delta || !patientState) return;
    setPatientState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (delta.time_elapsed_minutes !== undefined) {
        updated.time_elapsed_minutes = (prev.time_elapsed_minutes || 0) + delta.time_elapsed_minutes;
      }
      if (delta.hemodynamics) {
        updated.hemodynamics = { ...prev.hemodynamics, ...delta.hemodynamics };
      }
      if (delta.risk_flags) {
        updated.risk_flags = [...new Set([...(prev.risk_flags || []), ...delta.risk_flags])];
      }
      return updated;
    });
  };

  // Determine if we show immediate correctness feedback
  // Default to 'basic' (immediate feedback). feedback_timing overrides if set.
  const showImmediate = vpCase
    ? shouldShowImmediateFeedbackVP(vpCase.case_type || 'basic', vpCase.feedback_timing || undefined)
    : true;

  const handleSubmitAnswer = async () => {
    if (!currentStage || !attemptId) return;

    // For read_only stages, use empty answer and skip to next immediately
    const answerToSubmit = currentStage.stage_type === 'read_only' ? '' : userAnswer;
    const { isCorrect, rubricResult } = checkAnswer(currentStage, answerToSubmit);
    const timeTaken = stageStartTime ? Math.floor((Date.now() - stageStartTime) / 1000) : 0;

    const stageAnswer: StageAnswer = {
      stage_id: currentStage.id,
      user_answer: answerToSubmit,
      is_correct: isCorrect,
      time_taken_seconds: timeTaken,
      rubric_result: rubricResult,
    };

    try {
      await submitAnswer.mutateAsync({
        attemptId,
        caseId: caseId!,
        stageId: currentStage.id,
        answer: stageAnswer,
      });

      setStageAnswers(prev => ({
        ...prev,
        [currentStage.id]: stageAnswer,
      }));

      // Apply state delta if present
      applyStateDelta(currentStage.state_delta_json || null);

      // For read_only stages, skip feedback and go directly to next stage
      if (currentStage.stage_type === 'read_only') {
        handleNextStageAfterReadOnly(stageAnswer);
      } else if (!showImmediate) {
        // Advanced mode: always show consequence state (deferred feedback)
        const consequenceMsg = currentStage.consequence_text
          || 'The clinical team notes your decision. The case continues...';
        setLastConsequence(consequenceMsg);
        setState('consequence');
      } else {
        setState('feedback');
      }
    } catch (error) {
      toast.error('Failed to submit answer. Please try again.');
    }
  };

  const handleNextStageAfterReadOnly = async (stageAnswer: StageAnswer) => {
    // Same logic as handleNextStage but called immediately after read_only submit
    if (currentStageIndex + 1 >= totalStages) {
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      
      try {
        await completeAttempt.mutateAsync({
          attemptId: attemptId!,
          caseId: caseId!,
          timeTakenSeconds: timeTaken,
        });
        setState('summary');
      } catch (error) {
        toast.error('Failed to complete case. Please try again.');
      }
    } else {
      const nextIndex = currentStageIndex + 1;
      setCurrentStageIndex(nextIndex);
      setUserAnswer('');
      setStageStartTime(Date.now());
      setState('running');

      const nextStage = stages[nextIndex];
      if (nextStage?.patient_info) {
        setRevealedPatientInfo(prev => [...prev, nextStage.patient_info!]);
      }
    }
  };

  const handleNextStage = async () => {
    if (currentStageIndex + 1 >= totalStages) {
      // Complete the attempt
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      
      try {
        await completeAttempt.mutateAsync({
          attemptId: attemptId!,
          caseId: caseId!,
          timeTakenSeconds: timeTaken,
        });
        setState('summary');
      } catch (error) {
        toast.error('Failed to complete case. Please try again.');
      }
    } else {
      // Move to next stage
      const nextIndex = currentStageIndex + 1;
      setCurrentStageIndex(nextIndex);
      setUserAnswer('');
      setStageStartTime(Date.now());
      setState('running');

      // Reveal patient info for this stage
      const nextStage = stages[nextIndex];
      if (nextStage?.patient_info) {
        setRevealedPatientInfo(prev => [...prev, nextStage.patient_info!]);
      }
    }
  };

  const handleRetry = () => {
    setCurrentStageIndex(0);
    setAttemptId(null);
    setUserAnswer('');
    setStageAnswers({});
    setStartTime(null);
    setStageStartTime(null);
    setRevealedPatientInfo([]);
    setPatientState(null);
    setLastConsequence(null);
    setState('intro');
  };

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
            This virtual patient case doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  // INTRO STATE
  if (state === 'intro') {
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
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">
                    {vpCase.level.charAt(0).toUpperCase() + vpCase.level.slice(1)} Level
                  </Badge>
                  <CardTitle className="text-xl">{vpCase.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {totalStages} stages
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

              <Button 
                onClick={handleStartCase} 
                className="w-full gap-2" 
                size="lg"
                disabled={startAttempt.isPending}
              >
                <Play className="w-5 h-5" />
                {startAttempt.isPending ? 'Starting...' : 'Start Case'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // RUNNING STATE
  if (state === 'running' && currentStage) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Stage {currentStageIndex + 1} of {totalStages}
              </p>
              <h1 className="text-lg font-semibold">{vpCase.title}</h1>
            </div>
            <AskCoachButton variant="header" />
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2" />

          {/* Patient Info Panel */}
          {revealedPatientInfo.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {revealedPatientInfo.map((info, i) => (
                  <p key={i} className="text-muted-foreground">{info}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Patient Status Panel (for advanced case types with status_panel_enabled) */}
          {vpCase.status_panel_enabled && patientState && (
            <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Patient Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {patientState.hemodynamics?.heart_rate != null && (
                    <div className="p-2 bg-background rounded border">
                      <span className="text-muted-foreground">HR:</span>{' '}
                      <span className="font-medium">{patientState.hemodynamics.heart_rate} bpm</span>
                    </div>
                  )}
                  {patientState.hemodynamics?.systolic_bp != null && (
                    <div className="p-2 bg-background rounded border">
                      <span className="text-muted-foreground">BP:</span>{' '}
                      <span className="font-medium">{patientState.hemodynamics.systolic_bp}/{patientState.hemodynamics.diastolic_bp || '?'}</span>
                    </div>
                  )}
                  {patientState.hemodynamics?.spo2 != null && (
                    <div className="p-2 bg-background rounded border">
                      <span className="text-muted-foreground">SpO₂:</span>{' '}
                      <span className="font-medium">{patientState.hemodynamics.spo2}%</span>
                    </div>
                  )}
                  {patientState.hemodynamics?.respiratory_rate != null && (
                    <div className="p-2 bg-background rounded border">
                      <span className="text-muted-foreground">RR:</span>{' '}
                      <span className="font-medium">{patientState.hemodynamics.respiratory_rate}/min</span>
                    </div>
                  )}
                  {patientState.hemodynamics?.temperature != null && (
                    <div className="p-2 bg-background rounded border">
                      <span className="text-muted-foreground">Temp:</span>{' '}
                      <span className="font-medium">{patientState.hemodynamics.temperature}°C</span>
                    </div>
                  )}
                  {patientState.time_elapsed_minutes > 0 && (
                    <div className="p-2 bg-background rounded border">
                      <span className="text-muted-foreground">Time:</span>{' '}
                      <span className="font-medium">{patientState.time_elapsed_minutes} min</span>
                    </div>
                  )}
                </div>
                {patientState.risk_flags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {patientState.risk_flags.map((flag, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">{flag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{currentStage.prompt}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MCQ */}
              {currentStage.stage_type === 'mcq' && (
                <RadioGroup
                  value={userAnswer as string}
                  onValueChange={setUserAnswer}
                  className="space-y-3"
                >
                  {currentStage.choices.map((choice) => (
                    <div
                      key={choice.key}
                      className={cn(
                        "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                        userAnswer === choice.key
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setUserAnswer(choice.key)}
                    >
                      <RadioGroupItem value={choice.key} id={choice.key} />
                      <Label htmlFor={choice.key} className="flex-1 cursor-pointer font-normal">
                        <span className="font-medium mr-2">{choice.key}.</span>
                        {choice.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Multi-select */}
              {currentStage.stage_type === 'multi_select' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Select all that apply:</p>
                  {currentStage.choices.map((choice) => {
                    const selected = (userAnswer as string[]).includes(choice.key);
                    return (
                      <div
                        key={choice.key}
                        className={cn(
                          "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          const current = userAnswer as string[] || [];
                          if (selected) {
                            setUserAnswer(current.filter(k => k !== choice.key));
                          } else {
                            setUserAnswer([...current, choice.key]);
                          }
                        }}
                      >
                        <Checkbox checked={selected} />
                        <Label className="flex-1 cursor-pointer font-normal">
                          <span className="font-medium mr-2">{choice.key}.</span>
                          {choice.text}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Short answer */}
              {currentStage.stage_type === 'short_answer' && (
                <Textarea
                  value={userAnswer as string}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  rows={3}
                />
              )}

              {/* Read Only - Just show content, no input needed */}
              {currentStage.stage_type === 'read_only' && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground italic">
                    Review the information above, then continue to the next stage.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSubmitAnswer}
                className="w-full"
                disabled={
                  currentStage.stage_type === 'read_only' 
                    ? submitAnswer.isPending 
                    : (!userAnswer || 
                       (Array.isArray(userAnswer) && userAnswer.length === 0) ||
                       submitAnswer.isPending)
                }
              >
                {submitAnswer.isPending ? 'Submitting...' : (currentStage.stage_type === 'read_only' ? 'Continue' : 'Submit Answer')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // CONSEQUENCE STATE (for advanced case types — deferred feedback)
  if (state === 'consequence' && currentStage) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Stage {currentStageIndex + 1} of {totalStages}
              </p>
              <h1 className="text-lg font-semibold">{vpCase.title}</h1>
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <Card className="border-2 border-amber-400 dark:border-amber-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
                Clinical Consequence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{lastConsequence}</p>
            </CardContent>
          </Card>

          {/* Teaching Points (shown even in deferred mode) */}
          {currentStage.teaching_points && currentStage.teaching_points.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Teaching Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentStage.teaching_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleNextStage} className="w-full gap-2">
            {currentStageIndex + 1 >= totalStages ? 'View Debrief' : 'Next Stage'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </MainLayout>
    );
  }

  // FEEDBACK STATE
  if (state === 'feedback' && currentStage) {
    const stageAnswer = stageAnswers[currentStage.id];
    const isCorrect = stageAnswer?.is_correct;

    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Stage {currentStageIndex + 1} of {totalStages}
              </p>
              <h1 className="text-lg font-semibold">{vpCase.title}</h1>
            </div>
            <AskCoachButton 
              variant="header" 
              question={{
                questionId: currentStage.id,
                questionText: currentStage.prompt,
                questionType: currentStage.stage_type === 'multi_select' ? 'mcq' : currentStage.stage_type === 'short_answer' ? 'essay' : 'mcq',
                choices: currentStage.choices,
                correctAnswer: Array.isArray(currentStage.correct_answer) 
                  ? currentStage.correct_answer.join(', ') 
                  : currentStage.correct_answer,
                userAnswer: Array.isArray(stageAnswer?.user_answer)
                  ? stageAnswer.user_answer.join(', ')
                  : stageAnswer?.user_answer,
                explanation: currentStage.explanation || undefined,
              }}
            />
          </div>

          <Progress value={progress} className="h-2" />

          {/* Result Card */}
          <Card className={cn(
            "border-2",
            isCorrect ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-red-500 bg-red-50/50 dark:bg-red-950/20"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <CardTitle className={isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Your answer:</p>
                <p className="text-muted-foreground">
                  {Array.isArray(stageAnswer?.user_answer)
                    ? stageAnswer.user_answer.join(', ')
                    : stageAnswer?.user_answer}
                </p>
              </div>

              {/* Rubric feedback for short answer */}
              {currentStage.stage_type === 'short_answer' && stageAnswer?.rubric_result && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Concept Analysis:</p>
                  <div className="text-sm space-y-1">
                    {stageAnswer.rubric_result.matched_required.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        <span className="text-green-700 dark:text-green-400">
                          Found: {stageAnswer.rubric_result.matched_required.join(', ')}
                        </span>
                      </div>
                    )}
                    {stageAnswer.rubric_result.missing_required.length > 0 && (
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <span className="text-red-700 dark:text-red-400">
                          Missing: {stageAnswer.rubric_result.missing_required.join(', ')}
                        </span>
                      </div>
                    )}
                    {stageAnswer.rubric_result.matched_optional.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <span className="text-blue-700 dark:text-blue-400">
                          Bonus: {stageAnswer.rubric_result.matched_optional.join(', ')}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Score: {Math.round(stageAnswer.rubric_result.score * 100)}% 
                      (≥60% required to pass)
                    </p>
                  </div>
                </div>
              )}
              {!isCorrect && (
                <div>
                  <p className="text-sm font-medium mb-1">Correct answer:</p>
                  <p className="text-green-600 dark:text-green-400">
                    {Array.isArray(currentStage.correct_answer)
                      ? currentStage.correct_answer.join(', ')
                      : currentStage.correct_answer}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consequence (for guided modes, shown alongside correctness) */}
          {currentStage.consequence_text && (
            <Card className="border-amber-300 dark:border-amber-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Clinical Consequence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {currentStage.consequence_text}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Explanation */}
          {currentStage.explanation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {currentStage.explanation}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Teaching Points */}
          {currentStage.teaching_points && currentStage.teaching_points.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Teaching Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentStage.teaching_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleNextStage} className="w-full gap-2">
            {currentStageIndex + 1 >= totalStages ? 'View Summary' : 'Next Stage'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </MainLayout>
    );
  }

  // SUMMARY STATE
  if (state === 'summary') {
    const correctCount = Object.values(stageAnswers).filter(a => a.is_correct).length;
    const score = totalStages > 0 ? Math.round((correctCount / totalStages) * 100) : 0;

    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <Card>
            <CardHeader className="text-center">
              <div className={cn(
                "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
                score >= 70 ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {score >= 70 ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-amber-600" />
                )}
              </div>
              <CardTitle className="text-2xl">Case Complete!</CardTitle>
              <CardDescription>{vpCase.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score */}
              <div className="text-center">
                <p className="text-5xl font-bold text-primary">{score}%</p>
                <p className="text-muted-foreground">
                  {correctCount} of {totalStages} stages correct
                </p>
              </div>

              {/* Stage-by-stage review */}
              <div className="space-y-3">
                <h3 className="font-medium">Stage Review</h3>
                {stages.map((stage, i) => {
                  const answer = stageAnswers[stage.id];
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        answer?.is_correct 
                          ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                          : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      )}
                    >
                      {answer?.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Stage {i + 1}</p>
                        <p className="text-xs text-muted-foreground truncate">{stage.prompt}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handleRetry} className="flex-1 gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retry Case
                </Button>
                <Button onClick={() => navigate(-1)} className="flex-1 gap-2">
                  <Home className="w-4 h-4" />
                  Back to Cases
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return null;
}
