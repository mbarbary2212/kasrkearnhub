import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Stethoscope,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { useAICase } from '@/hooks/useAICase';
import type { AICaseDisplayMessage, AITurnResponse } from '@/types/aiCase';
import { cn } from '@/lib/utils';
import { getExaminerAvatar } from '@/lib/examinerAvatars';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AICaseRunnerProps {
  caseId: string;
  attemptId: string;
  introText: string;
  title: string;
  hintMode?: boolean;
  avatarId?: number;
  onComplete?: () => void;
}

export function AICaseRunner({
  caseId,
  attemptId,
  introText,
  title,
  hintMode = false,
  avatarId = 1,
  onComplete,
}: AICaseRunnerProps) {
  const [textInput, setTextInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const examiner = getExaminerAvatar(avatarId);

  const {
    status,
    currentTurn,
    maxTurns,
    messages,
    currentQuestion,
    debrief,
    error,
    streamingContent,
    startCase,
    submitAnswer,
    reset,
  } = useAICase({
    caseId,
    attemptId,
    hintMode,
    onComplete: () => {},
    onFlagged: () => {
      console.warn('Case flagged for review');
    },
  });

  // Auto-start the case on mount
  useEffect(() => {
    if (status === 'idle') {
      startCase(introText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleChoiceSelect = (choice: string) => {
    submitAnswer(choice);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    submitAnswer(textInput.trim());
    setTextInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const progressPercent = maxTurns > 0 ? (currentTurn / maxTurns) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header with avatar */}
      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 border-background shadow-md">
              <AvatarImage src={examiner.image} alt={examiner.name} />
              <AvatarFallback>{examiner.name.charAt(4)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {examiner.name} • Turn {currentTurn} of {maxTurns}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hintMode && (
              <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                <Lightbulb className="w-3 h-3" />
                Learning
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <GraduationCap className="w-3 h-3" />
              AI-Driven
            </Badge>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Chat Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showTeachingPoints={hintMode} examiner={examiner} />
        ))}

        {/* Streaming bubble or thinking indicator */}
        {status === 'loading' && (
          streamingContent ? (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0 mt-1 border border-background shadow-sm">
                <AvatarImage src={examiner.image} alt={examiner.name} />
                <AvatarFallback>{examiner.name.charAt(4)}</AvatarFallback>
              </Avatar>
              <div className="max-w-[85%] space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{examiner.name}</p>
                <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-3">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-[2px] h-[1em] bg-foreground ml-0.5 align-text-bottom animate-[blink_1s_infinite]" />
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-base pl-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {examiner.name} is thinking...
            </div>
          )
        )}

        {status === 'error' && error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={reset} className="ml-2 gap-1">
                <RotateCcw className="w-3 h-3" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area / Debrief */}
      <div className="flex-shrink-0 border-t pt-4">
        {status === 'complete' && debrief ? (
          <DebriefCard debrief={debrief} onFinish={() => onComplete?.()} />
        ) : status === 'active' && currentQuestion ? (
          currentQuestion.choices && currentQuestion.choices.length > 0 ? (
            <div className="space-y-2">
              {currentQuestion.choices.map((choice) => (
                <Button
                  key={choice.value}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4 text-base"
                  onClick={() => handleChoiceSelect(choice.label)}
                >
                  {choice.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your clinical reasoning..."
                className="flex-1 min-h-[60px] max-h-[120px] text-base"
                disabled={status !== 'active'}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || status !== 'active'}
                className="self-end gap-1"
              >
                Submit <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  showTeachingPoints,
  examiner,
}: {
  message: AICaseDisplayMessage;
  showTeachingPoints?: boolean;
  examiner: { name: string; image: string };
}) {
  if (message.role === 'system') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 py-3 px-4">
          <Stethoscope className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</div>
        </CardContent>
      </Card>
    );
  }

  if (message.role === 'student') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Examiner message
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 flex-shrink-0 mt-1 border border-background shadow-sm">
        <AvatarImage src={examiner.image} alt={examiner.name} />
        <AvatarFallback>{examiner.name.charAt(4)}</AvatarFallback>
      </Avatar>
      <div className="max-w-[85%] space-y-2">
        <p className="text-xs text-muted-foreground font-medium">{examiner.name}</p>
        <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-3">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.patient_info && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="flex gap-2 py-2 px-3 text-base leading-relaxed">
              <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
              <span>{message.patient_info}</span>
            </CardContent>
          </Card>
        )}

        {showTeachingPoints && message.teaching_point && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex gap-2 py-2 px-3 text-sm italic">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{message.teaching_point}</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DebriefCard({
  debrief,
  onFinish,
}: {
  debrief: AITurnResponse;
  onFinish: () => void;
}) {
  const score = debrief.score ?? 0;
  const scoreColor =
    score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-destructive';

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Case Debrief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={cn('text-4xl font-bold', scoreColor)}>{score}%</div>
          <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
        </div>

        {debrief.summary && (
          <p className="text-base leading-relaxed text-muted-foreground">{debrief.summary}</p>
        )}

        {debrief.prompt && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Detailed Feedback</h4>
            <p className="text-base leading-relaxed whitespace-pre-wrap">{debrief.prompt}</p>
          </div>
        )}

        {debrief.teaching_point && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              💡 Key Learning Points
            </h4>
            <p className="text-base leading-relaxed whitespace-pre-wrap">{debrief.teaching_point}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debrief.strengths && debrief.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                Strengths
              </h4>
              <ul className="space-y-1">
                {debrief.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex gap-1.5 items-start">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {debrief.gaps && debrief.gaps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                Areas to Review
              </h4>
              <ul className="space-y-1">
                {debrief.gaps.map((g, i) => (
                  <li key={i} className="text-sm flex gap-1.5 items-start">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button onClick={onFinish} className="w-full">
          Back to Cases
        </Button>
      </CardContent>
    </Card>
  );
}
