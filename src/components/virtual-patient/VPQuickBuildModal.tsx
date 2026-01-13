import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Eye,
} from 'lucide-react';
import { VPStageFormData, VPStageType, VPChoice } from '@/types/virtualPatient';
import { useCreateVirtualPatientStage } from '@/hooks/useVirtualPatient';
import { toast } from 'sonner';

interface VPQuickBuildModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  currentStageCount: number;
  onSuccess?: () => void;
}

interface ParsedStage {
  stageNumber: number;
  type: VPStageType;
  patientInfo?: string;
  prompt: string;
  choices: VPChoice[];
  correctAnswer: string | string[];
  explanation?: string;
  teachingPoints: string[];
  errors: string[];
}

interface ParseResult {
  stages: ParsedStage[];
  errors: string[];
}

// Parse the template text into stages
function parseTemplate(text: string, startOrder: number): ParseResult {
  const stages: ParsedStage[] = [];
  const globalErrors: string[] = [];
  
  // Split by STAGE markers
  const stageBlocks = text.split(/(?=STAGE\s+\d+:)/i).filter(block => block.trim());
  
  if (stageBlocks.length === 0) {
    globalErrors.push('No STAGE markers found. Each stage should start with "STAGE 1:", "STAGE 2:", etc.');
    return { stages, errors: globalErrors };
  }

  stageBlocks.forEach((block, index) => {
    const errors: string[] = [];
    const stageNum = index + 1;
    
    // Extract fields using regex
    const typeMatch = block.match(/TYPE:\s*(mcq|multi_select|short_answer)/i);
    const patientInfoMatch = block.match(/PATIENT_INFO:\s*(.+?)(?=\n(?:PROMPT:|TYPE:|CHOICES:|CORRECT:|EXPLANATION:|TEACHING_POINTS:)|$)/is);
    const promptMatch = block.match(/PROMPT:\s*(.+?)(?=\n(?:CHOICES:|CORRECT:|EXPLANATION:|TEACHING_POINTS:)|$)/is);
    const choicesMatch = block.match(/CHOICES:\s*(.+?)(?=\n(?:CORRECT:|EXPLANATION:|TEACHING_POINTS:)|$)/is);
    const correctMatch = block.match(/CORRECT:\s*(.+?)(?=\n(?:EXPLANATION:|TEACHING_POINTS:)|$)/is);
    const explanationMatch = block.match(/EXPLANATION:\s*(.+?)(?=\n(?:TEACHING_POINTS:)|$)/is);
    const teachingPointsMatch = block.match(/TEACHING_POINTS:\s*(.+?)$/is);

    // Determine type (default to mcq)
    let type: VPStageType = 'mcq';
    if (typeMatch) {
      type = typeMatch[1].toLowerCase() as VPStageType;
    }

    // Extract prompt
    const prompt = promptMatch ? promptMatch[1].trim() : '';
    if (!prompt) {
      errors.push('Missing PROMPT field');
    }

    // Extract patient info
    const patientInfo = patientInfoMatch ? patientInfoMatch[1].trim() : undefined;

    // Parse choices
    const choices: VPChoice[] = [];
    if (type !== 'short_answer' && choicesMatch) {
      const choiceText = choicesMatch[1];
      // Match patterns like (A) ..., (B) ..., etc.
      const choicePatterns = choiceText.match(/\(([A-H])\)\s*([^(]+?)(?=\([A-H]\)|$)/gi);
      if (choicePatterns) {
        choicePatterns.forEach((match) => {
          const keyMatch = match.match(/\(([A-H])\)/i);
          if (keyMatch) {
            const key = keyMatch[1].toUpperCase();
            const text = match.replace(/\([A-H]\)/i, '').trim();
            if (text) {
              choices.push({ key, text });
            }
          }
        });
      }
    }

    // Validate choices
    if (type !== 'short_answer' && choices.length < 2) {
      errors.push(`${type.toUpperCase()} requires at least 2 choices`);
    }

    // Parse correct answer
    let correctAnswer: string | string[] = '';
    if (correctMatch) {
      const correctText = correctMatch[1].trim().toUpperCase();
      if (type === 'mcq') {
        correctAnswer = correctText.charAt(0);
        if (!choices.find(c => c.key === correctAnswer)) {
          errors.push(`Correct answer "${correctAnswer}" not found in choices`);
        }
      } else if (type === 'multi_select') {
        correctAnswer = correctText.split(/[,\s]+/).filter(k => k.match(/^[A-H]$/));
        if (correctAnswer.length === 0) {
          errors.push('Multi-select requires at least one correct answer');
        }
        correctAnswer.forEach(k => {
          if (!choices.find(c => c.key === k)) {
            errors.push(`Correct answer "${k}" not found in choices`);
          }
        });
      } else {
        // short_answer - the correct field is the model answer
        correctAnswer = correctMatch[1].trim();
      }
    } else if (type !== 'short_answer') {
      errors.push('Missing CORRECT field');
    }

    // Parse explanation
    const explanation = explanationMatch ? explanationMatch[1].trim() : undefined;

    // Parse teaching points
    const teachingPoints: string[] = [];
    if (teachingPointsMatch) {
      const tpText = teachingPointsMatch[1];
      // Split by "- " or newlines
      const points = tpText.split(/(?:^|\n)\s*-\s*/).filter(p => p.trim());
      points.forEach(p => {
        const trimmed = p.trim();
        if (trimmed) {
          teachingPoints.push(trimmed);
        }
      });
    }

    stages.push({
      stageNumber: stageNum,
      type,
      patientInfo,
      prompt,
      choices,
      correctAnswer,
      explanation,
      teachingPoints,
      errors,
    });
  });

  return { stages, errors: globalErrors };
}

export function VPQuickBuildModal({
  open,
  onOpenChange,
  caseId,
  currentStageCount,
  onSuccess,
}: VPQuickBuildModalProps) {
  const [templateText, setTemplateText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const createStage = useCreateVirtualPatientStage();

  const handlePreview = () => {
    const result = parseTemplate(templateText, currentStageCount);
    setParseResult(result);
  };

  const handleCreate = async () => {
    if (!parseResult || parseResult.stages.length === 0) return;

    // Check for errors
    const stagesWithErrors = parseResult.stages.filter(s => s.errors.length > 0);
    if (stagesWithErrors.length > 0 || parseResult.errors.length > 0) {
      toast.error('Please fix all errors before creating stages');
      return;
    }

    setIsCreating(true);
    try {
      // Create stages one by one in order
      for (let i = 0; i < parseResult.stages.length; i++) {
        const stage = parseResult.stages[i];
        const formData: VPStageFormData = {
          stage_order: currentStageCount + i + 1,
          stage_type: stage.type,
          prompt: stage.prompt,
          patient_info: stage.patientInfo,
          choices: stage.choices,
          correct_answer: stage.correctAnswer,
          explanation: stage.explanation,
          teaching_points: stage.teachingPoints,
        };
        await createStage.mutateAsync({ caseId, data: formData });
      }

      toast.success(`${parseResult.stages.length} stages created successfully`);
      setTemplateText('');
      setParseResult(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create stages:', error);
      toast.error('Failed to create stages');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setTemplateText('');
    setParseResult(null);
    onOpenChange(false);
  };

  const hasErrors = parseResult && (
    parseResult.errors.length > 0 ||
    parseResult.stages.some(s => s.errors.length > 0)
  );

  const stageTypeLabels: Record<VPStageType, string> = {
    mcq: 'Single Choice',
    multi_select: 'Multi-select',
    short_answer: 'Short Answer',
  };

  const canCreate = parseResult && parseResult.stages.length > 0 && !hasErrors && !isCreating;

  const CreateButton = ({ className = '' }: { className?: string }) => (
    <Button
      onClick={handleCreate}
      disabled={!canCreate}
      className={className}
    >
      {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Create {parseResult?.stages.length || 0} Stage{parseResult?.stages.length !== 1 ? 's' : ''}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-background">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Quick Build from Template
              </DialogTitle>
              {/* Safety fallback: Top-right Create button */}
              {canCreate && (
                <CreateButton className="hidden sm:flex" />
              )}
            </div>
            <DialogDescription>
              Paste your template text below to quickly create multiple stages. 
              Each stage should follow the format shown in Help & Templates.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[400px]">
            {/* Input Side */}
            <div className="flex flex-col gap-2">
              <Label>Paste Template Text</Label>
              <Textarea
                value={templateText}
                onChange={(e) => {
                  setTemplateText(e.target.value);
                  setParseResult(null);
                }}
                placeholder={`STAGE 1:
TYPE: mcq
PATIENT_INFO: The patient reports...
PROMPT: What is your next step?
CHOICES: (A) Order CBC (B) Perform ECG (C) CT scan (D) Discharge
CORRECT: B
EXPLANATION: ECG is indicated because...
TEACHING_POINTS:
- Point 1
- Point 2

STAGE 2:
TYPE: multi_select
...`}
                className="flex-1 font-mono text-sm resize-none min-h-[200px]"
              />
              <Button onClick={handlePreview} disabled={!templateText.trim()}>
                <Eye className="w-4 h-4 mr-2" />
                Preview Stages
              </Button>
            </div>

            {/* Preview Side */}
            <div className="flex flex-col gap-2">
              <Label>Preview</Label>
              <div className="flex-1 border rounded-lg p-3 overflow-auto min-h-[200px] max-h-[50vh]">
                {!parseResult ? (
                  <div className="text-center text-muted-foreground py-8">
                    Paste template and click "Preview Stages" to see parsed content
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parseResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          {parseResult.errors.map((e, i) => (
                            <div key={i}>{e}</div>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                    {parseResult.stages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        No stages parsed
                      </div>
                    ) : (
                      parseResult.stages.map((stage) => (
                        <div key={stage.stageNumber} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            {stage.errors.length === 0 ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            )}
                            <Badge variant="outline">Stage {stage.stageNumber}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stageTypeLabels[stage.type]}
                            </Badge>
                          </div>

                          {stage.errors.length > 0 && (
                            <div className="text-sm text-destructive">
                              {stage.errors.map((e, i) => (
                                <div key={i}>• {e}</div>
                              ))}
                            </div>
                          )}

                          <p className="text-sm font-medium line-clamp-2">{stage.prompt || '(no prompt)'}</p>

                          {stage.choices.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {stage.choices.length} choices • Correct: {
                                Array.isArray(stage.correctAnswer) 
                                  ? stage.correctAnswer.join(', ') 
                                  : stage.correctAnswer
                              }
                            </div>
                          )}

                          {stage.teachingPoints.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {stage.teachingPoints.length} teaching point(s)
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed/Sticky Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background z-10">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <CreateButton />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
