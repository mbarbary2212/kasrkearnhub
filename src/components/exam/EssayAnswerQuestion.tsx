import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Keyboard, PenTool, Lock, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';

export interface EssayAnswer {
  mode: 'typed' | 'handwriting';
  typed_text: string;
  handwriting_data: string | null;
  typed_summary: string;
  revision_count: number;
  is_finalized: boolean;
}

interface EssayAnswerQuestionProps {
  questionId: string;
  questionText: string;
  questionIndex: number;
  totalQuestions: number;
  maxPoints: number;
  answer: EssayAnswer;
  onAnswerChange: (questionId: string, answer: EssayAnswer) => void;
  handwritingEnabled?: boolean;
  maxRevisions?: number;
}

export function EssayAnswerQuestion({
  questionId,
  questionText,
  questionIndex,
  totalQuestions,
  maxPoints,
  answer,
  onAnswerChange,
  handwritingEnabled = true,
  maxRevisions = 1,
}: EssayAnswerQuestionProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3);

  const isLocked = answer.is_finalized && answer.revision_count >= maxRevisions;
  const canRevise = answer.is_finalized && answer.revision_count < maxRevisions;
  const isEditing = !answer.is_finalized;

  // Update answer helper
  const updateAnswer = useCallback(
    (partial: Partial<EssayAnswer>) => {
      onAnswerChange(questionId, { ...answer, ...partial });
    },
    [questionId, answer, onAnswerChange]
  );

  // Block copy/paste/cut/drag on textarea
  const blockClipboard = useCallback((e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
  }, []);

  const blockKeyboardShortcuts = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }, []);

  const blockContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Mode change
  const handleModeChange = (mode: 'typed' | 'handwriting') => {
    if (answer.is_finalized) return;
    updateAnswer({ mode });
  };

  // Finalize
  const handleFinalize = async () => {
    // If handwriting mode, export canvas to image
    if (answer.mode === 'handwriting' && canvasRef.current) {
      try {
        const dataUrl = await canvasRef.current.exportImage('png');
        updateAnswer({
          handwriting_data: dataUrl,
          is_finalized: true,
          revision_count: answer.revision_count,
        });
      } catch {
        updateAnswer({ is_finalized: true });
      }
    } else {
      updateAnswer({ is_finalized: true });
    }
    setShowFinalizeConfirm(false);
  };

  // Revise
  const handleRevise = () => {
    updateAnswer({
      is_finalized: false,
      revision_count: answer.revision_count + 1,
    });
  };

  // Canvas undo
  const handleUndo = () => canvasRef.current?.undo();
  const handleClear = () => canvasRef.current?.clearCanvas();

  // Word count
  const wordCount = answer.typed_text.trim().split(/\s+/).filter(Boolean).length;
  const summaryWordCount = answer.typed_summary.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Question header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <Badge variant="outline">{maxPoints} marks</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium leading-relaxed">
            {questionText}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mode selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Answer Mode</Label>
            <RadioGroup
              value={answer.mode}
              onValueChange={(v) => handleModeChange(v as 'typed' | 'handwriting')}
              className="flex gap-4"
              disabled={answer.is_finalized}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="typed" id={`mode-typed-${questionId}`} />
                <Label htmlFor={`mode-typed-${questionId}`} className="flex items-center gap-1.5 cursor-pointer">
                  <Keyboard className="w-4 h-4" />
                  Typed Answer
                  <Badge variant="secondary" className="text-[10px] px-1.5">Recommended</Badge>
                </Label>
              </div>
              {handwritingEnabled && (
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="handwriting" id={`mode-hw-${questionId}`} />
                  <Label htmlFor={`mode-hw-${questionId}`} className="flex items-center gap-1.5 cursor-pointer">
                    <PenTool className="w-4 h-4" />
                    Handwriting
                  </Label>
                </div>
              )}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              For best results, use Typed Answer. For best exam simulation, use Handwriting.
              <br />
              Spelling is not penalized in this simulator.
            </p>
          </div>

          {/* Typed Answer Mode */}
          {answer.mode === 'typed' && (
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  value={answer.typed_text}
                  onChange={(e) => updateAnswer({ typed_text: e.target.value })}
                  placeholder="Write your answer here..."
                  rows={10}
                  disabled={isLocked}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className={cn(
                    'resize-y min-h-[200px] font-mono text-sm',
                    isLocked && 'opacity-70 cursor-not-allowed'
                  )}
                  onCopy={blockClipboard}
                  onPaste={blockClipboard}
                  onCut={blockClipboard}
                  onDrop={blockClipboard as any}
                  onDragOver={(e) => e.preventDefault()}
                  onKeyDown={blockKeyboardShortcuts}
                  onContextMenu={blockContextMenu}
                />
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                    <Badge variant="destructive" className="gap-1">
                      <Lock className="w-3 h-3" /> Answer Locked
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{wordCount} words</span>
                {answer.is_finalized && (
                  <span>Revisions: {answer.revision_count}/{maxRevisions}</span>
                )}
              </div>
            </div>
          )}

          {/* Handwriting Mode */}
          {answer.mode === 'handwriting' && (
            <div className="space-y-3">
              <div className={cn(
                'border rounded-lg overflow-hidden',
                isLocked && 'opacity-70 pointer-events-none'
              )}>
                {/* Canvas toolbar */}
                {!isLocked && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 border-b">
                    <Button variant="ghost" size="sm" onClick={handleUndo} className="h-7 text-xs gap-1">
                      <RotateCcw className="w-3 h-3" /> Undo
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs">
                      Clear
                    </Button>
                    <div className="flex items-center gap-1 ml-auto">
                      <Label className="text-xs">Thickness:</Label>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        className="w-16 h-4"
                      />
                    </div>
                  </div>
                )}
                <div style={{ height: 300 }}>
                  <ReactSketchCanvas
                    ref={canvasRef}
                    strokeWidth={strokeWidth}
                    strokeColor="hsl(var(--foreground))"
                    canvasColor="hsl(var(--background))"
                    style={{ border: 'none' }}
                    width="100%"
                    height="300px"
                  />
                </div>
              </div>

              {/* Show saved handwriting image if finalized */}
              {answer.is_finalized && answer.handwriting_data && (
                <div className="border rounded-lg p-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Saved Handwriting</Label>
                  <img
                    src={answer.handwriting_data}
                    alt="Handwritten answer"
                    className="max-w-full rounded"
                  />
                </div>
              )}

              {/* Typed summary for marking */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Typed Summary (required for marking)
                </Label>
                <Textarea
                  value={answer.typed_summary}
                  onChange={(e) => updateAnswer({ typed_summary: e.target.value })}
                  placeholder="Briefly type your key points for marking (minimum 2-3 lines)..."
                  rows={4}
                  disabled={isLocked}
                  spellCheck={false}
                  className="text-sm"
                  onCopy={blockClipboard}
                  onPaste={blockClipboard}
                  onCut={blockClipboard}
                  onKeyDown={blockKeyboardShortcuts}
                  onContextMenu={blockContextMenu}
                />
                <span className="text-xs text-muted-foreground">{summaryWordCount} words</span>
              </div>

              {answer.is_finalized && (
                <div className="text-xs text-muted-foreground">
                  Revisions: {answer.revision_count}/{maxRevisions}
                </div>
              )}
            </div>
          )}

          {/* Finalize / Revise / Lock status */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {isEditing && (
              <Button
                onClick={() => setShowFinalizeConfirm(true)}
                variant="default"
                size="sm"
                className="gap-1"
                disabled={
                  (answer.mode === 'typed' && !answer.typed_text.trim()) ||
                  (answer.mode === 'handwriting' && !answer.typed_summary.trim())
                }
              >
                <Check className="w-3.5 h-3.5" />
                Finalize Answer
              </Button>
            )}
            {canRevise && (
              <Button onClick={handleRevise} variant="outline" size="sm" className="gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Revise ({maxRevisions - answer.revision_count} remaining)
              </Button>
            )}
            {isLocked && (
              <Badge variant="destructive" className="gap-1">
                <Lock className="w-3 h-3" /> Final – No more revisions
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Finalize confirmation */}
      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this answer?</AlertDialogTitle>
            <AlertDialogDescription>
              {answer.revision_count < maxRevisions
                ? `After finalizing, you will have ${maxRevisions - answer.revision_count} revision opportunity remaining.`
                : 'This will permanently lock your answer. No further changes will be allowed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>Finalize</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
