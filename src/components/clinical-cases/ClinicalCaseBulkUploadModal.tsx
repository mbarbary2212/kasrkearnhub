import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Layers, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useCreateClinicalCase, useCreateClinicalCaseStage } from '@/hooks/useClinicalCases';
import { CaseMode, CaseLevel, CaseStageType, CaseChoice, CaseRubric } from '@/types/clinicalCase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClinicalCaseBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  topicId?: string;
}

interface ParsedStage {
  stage_order: number;
  stage_type: CaseStageType;
  patient_info: string | null;
  prompt: string;
  choices: CaseChoice[];
  correct_answer: string | string[];
  explanation: string | null;
  teaching_points: string[];
  rubric: CaseRubric | null;
  consequence_text: string | null;
  state_delta_json: Record<string, unknown> | null;
}

interface ParsedCase {
  title: string;
  intro_text: string;
  difficulty: CaseLevel;
  case_mode: CaseMode;
  case_type: string | null;
  initial_state_json: Record<string, unknown> | null;
  stages: ParsedStage[];
  parseErrors: string[];
}

// ─── Parser ────────────────────────────────────────────────────

const DIFFICULTY_MAP: Record<string, CaseLevel> = {
  easy: 'beginner',
  medium: 'intermediate',
  hard: 'advanced',
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

const MODE_MAP: Record<string, CaseMode> = {
  'practice case': 'practice_case',
  'read case': 'read_case',
  practice_case: 'practice_case',
  read_case: 'read_case',
};

function parseChoices(raw: string): CaseChoice[] {
  // Format: (A) text (B) text (C) text (D) text
  const matches = raw.match(/\(([A-Z])\)\s*([^(]+)/g);
  if (!matches) return [];
  return matches.map(m => {
    const match = m.match(/\(([A-Z])\)\s*(.+)/);
    return match ? { key: match[1], text: match[2].trim() } : { key: '?', text: m };
  });
}

function parseBulletList(lines: string[], startIdx: number): { items: string[]; endIdx: number } {
  const items: string[] = [];
  let i = startIdx;
  while (i < lines.length && lines[i].startsWith('- ')) {
    items.push(lines[i].substring(2).trim());
    i++;
  }
  return { items, endIdx: i };
}

function parseStageBlock(lines: string[], stageOrder: number): ParsedStage {
  const stage: ParsedStage = {
    stage_order: stageOrder,
    stage_type: 'mcq',
    patient_info: null,
    prompt: '',
    choices: [],
    correct_answer: '',
    explanation: null,
    teaching_points: [],
    rubric: null,
    consequence_text: null,
    state_delta_json: null,
  };

  const rubricRequired: string[] = [];
  const rubricOptional: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('TYPE:')) {
      const t = line.substring(5).trim().toLowerCase();
      if (t === 'mcq') stage.stage_type = 'mcq';
      else if (t === 'multi_select' || t === 'multi-select') stage.stage_type = 'multi_select';
      else if (t === 'short_answer' || t === 'short answer') stage.stage_type = 'short_answer';
      else if (t === 'read_only' || t === 'read only') stage.stage_type = 'read_only';
    } else if (line.startsWith('PATIENT_INFO:')) {
      stage.patient_info = line.substring(13).trim();
    } else if (line.startsWith('PROMPT:')) {
      stage.prompt = line.substring(7).trim();
    } else if (line.startsWith('CHOICES:')) {
      stage.choices = parseChoices(line.substring(8).trim());
    } else if (line.startsWith('CORRECT:')) {
      const val = line.substring(8).trim();
      // Multi-select: "A,B,D"
      if (stage.stage_type === 'multi_select' || val.includes(',')) {
        stage.correct_answer = val.split(',').map(s => s.trim());
      } else {
        stage.correct_answer = val;
      }
    } else if (line.startsWith('EXPLANATION:')) {
      stage.explanation = line.substring(12).trim();
    } else if (line.startsWith('TEACHING_POINTS:')) {
      i++;
      const { items, endIdx } = parseBulletList(lines, i);
      stage.teaching_points = items;
      i = endIdx;
      continue;
    } else if (line.startsWith('RUBRIC_REQUIRED:')) {
      i++;
      const { items, endIdx } = parseBulletList(lines, i);
      rubricRequired.push(...items);
      i = endIdx;
      continue;
    } else if (line.startsWith('RUBRIC_OPTIONAL:')) {
      i++;
      const { items, endIdx } = parseBulletList(lines, i);
      rubricOptional.push(...items);
      i = endIdx;
      continue;
    } else if (line.startsWith('CONSEQUENCE_TEXT:')) {
      stage.consequence_text = line.substring(16).trim();
    } else if (line.startsWith('STATE_DELTA:')) {
      try {
        stage.state_delta_json = JSON.parse(line.substring(12).trim());
      } catch { /* ignore invalid JSON */ }
    }
    i++;
  }

  // Build rubric for short_answer
  if (stage.stage_type === 'short_answer' && (rubricRequired.length > 0 || rubricOptional.length > 0)) {
    stage.rubric = {
      required_concepts: rubricRequired,
      optional_concepts: rubricOptional,
      pass_threshold: 0.6,
    };
  }

  return stage;
}

function parseSingleCase(text: string, index: number): ParsedCase {
  const lines = text.split('\n').map(l => l.trimEnd());
  const errors: string[] = [];

  let title = `Untitled Case ${index + 1}`;
  let intro = '';
  let difficulty: CaseLevel = 'intermediate';
  let mode: CaseMode = 'practice_case';
  let caseType: string | null = null;
  let initialStateJson: Record<string, unknown> | null = null;

  // Map case_type values (accept old values for backward compat)
  const CASE_TYPE_MAP: Record<string, string> = {
    basic: 'basic', advanced: 'advanced',
    guided: 'basic', management: 'basic',
    simulation: 'advanced', virtual_patient: 'advanced',
  };

  // Parse header lines (# prefixed)
  for (const line of lines) {
    if (line.startsWith('# Title:')) title = line.substring(8).trim();
    else if (line.startsWith('# Intro:')) intro = line.substring(8).trim();
    else if (line.startsWith('# Difficulty:')) {
      const d = line.substring(13).trim().toLowerCase();
      difficulty = DIFFICULTY_MAP[d] || 'intermediate';
    } else if (line.startsWith('# Mode:')) {
      const m = line.substring(7).trim().toLowerCase();
      mode = MODE_MAP[m] || 'practice_case';
    } else if (line.startsWith('# Case Type:')) {
      const ct = line.substring(12).trim().toLowerCase();
      caseType = CASE_TYPE_MAP[ct] || null;
    } else if (line.startsWith('# Initial State:')) {
      try {
        initialStateJson = JSON.parse(line.substring(16).trim());
      } catch { /* ignore invalid JSON */ }
    }
  }

  if (!title || title.startsWith('Untitled')) errors.push('Missing title');
  if (!intro) errors.push('Missing intro text');

  // Split into stage blocks
  const stageBlocks: { order: number; lines: string[] }[] = [];
  let currentStageLines: string[] = [];
  let currentOrder = 0;

  for (const line of lines) {
    const stageMatch = line.match(/^STAGE\s+(\d+):/i);
    if (stageMatch) {
      if (currentStageLines.length > 0 && currentOrder > 0) {
        stageBlocks.push({ order: currentOrder, lines: currentStageLines });
      }
      currentOrder = parseInt(stageMatch[1]);
      currentStageLines = [];
    } else if (currentOrder > 0) {
      currentStageLines.push(line);
    }
  }
  if (currentStageLines.length > 0 && currentOrder > 0) {
    stageBlocks.push({ order: currentOrder, lines: currentStageLines });
  }

  if (stageBlocks.length === 0) errors.push('No stages found');

  const stages = stageBlocks.map(b => parseStageBlock(b.lines, b.order));

  // Validate stages
  stages.forEach((s, i) => {
    if (!s.prompt && s.stage_type !== 'read_only') {
      errors.push(`Stage ${i + 1}: Missing prompt`);
    }
    if ((s.stage_type === 'mcq' || s.stage_type === 'multi_select') && s.choices.length === 0) {
      errors.push(`Stage ${i + 1}: Missing choices`);
    }
  });

  return { title, intro_text: intro, difficulty, case_mode: mode, case_type: caseType, initial_state_json: initialStateJson, stages, parseErrors: errors };
}

export function parseClinicalCasesTxt(text: string): ParsedCase[] {
  const blocks = text.split(/\n---\s*\n/);
  return blocks
    .map((block, i) => block.trim())
    .filter(block => block.length > 0)
    .map((block, i) => parseSingleCase(block, i));
}

// ─── Component ─────────────────────────────────────────────────

export function ClinicalCaseBulkUploadModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  topicId,
}: ClinicalCaseBulkUploadModalProps) {
  const [parsedCases, setParsedCases] = useState<ParsedCase[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const createCase = useCreateClinicalCase();
  const createStage = useCreateClinicalCaseStage();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile([file]);
    if (e.target) e.target.value = '';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile([files[0]]);
    }
  }, [handleFile]);

  const handleFile = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const cases = parseClinicalCasesTxt(text);
        setParsedCases(cases);
        if (cases.length === 0) {
          toast.error('No cases found in file');
        }
      } catch (err) {
        console.error('Parse error:', err);
        toast.error('Failed to parse file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    if (!parsedCases || parsedCases.length === 0) return;

    const validCases = parsedCases.filter(c => c.parseErrors.length === 0);
    if (validCases.length === 0) {
      toast.error('No valid cases to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validCases.length; i++) {
      const pc = validCases[i];
      try {
        const created = await createCase.mutateAsync({
          title: pc.title,
          intro_text: pc.intro_text,
          module_id: moduleId,
          chapter_id: chapterId,
          topic_id: topicId,
          case_mode: pc.case_mode,
          ...(pc.case_type && { case_type: pc.case_type as any }),
          ...(pc.initial_state_json && { initial_state_json: pc.initial_state_json as any }),
          level: pc.difficulty,
          estimated_minutes: Math.max(5, pc.stages.length * 3),
          tags: [],
          is_published: false,
        });

        // Create stages sequentially to preserve order
        for (const stage of pc.stages) {
          await createStage.mutateAsync({
            caseId: created.id,
            data: {
              stage_order: stage.stage_order,
              stage_type: stage.stage_type,
              prompt: stage.prompt,
              patient_info: stage.patient_info || undefined,
              choices: stage.choices,
              correct_answer: stage.correct_answer,
              explanation: stage.explanation || undefined,
              teaching_points: stage.teaching_points,
              rubric: stage.rubric,
              consequence_text: stage.consequence_text || undefined,
              state_delta_json: stage.state_delta_json as any || undefined,
            },
          });
        }

        successCount++;
      } catch (err) {
        console.error(`Failed to import case "${pc.title}":`, err);
        failCount++;
      }

      setImportProgress(Math.round(((i + 1) / validCases.length) * 100));
    }

    setImporting(false);

    if (failCount === 0) {
      toast.success(`${successCount} case${successCount !== 1 ? 's' : ''} imported successfully`);
    } else {
      toast.warning(`${successCount} imported, ${failCount} failed`);
    }

    onOpenChange(false);
    setParsedCases(null);
    setFileName('');
  };

  const handleClose = () => {
    if (importing) return;
    onOpenChange(false);
    setParsedCases(null);
    setFileName('');
  };

  const validCount = parsedCases?.filter(c => c.parseErrors.length === 0).length || 0;
  const errorCount = parsedCases?.filter(c => c.parseErrors.length > 0).length || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Clinical Cases
          </DialogTitle>
          <DialogDescription>
            Upload a TXT file with clinical cases. Cases are separated by <code>---</code>.
          </DialogDescription>
        </DialogHeader>

        {!parsedCases ? (
          <div className="py-4">
            <input
              ref={inputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileInput}
            />
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors",
                "flex flex-col items-center gap-2"
              )}
              onClick={() => inputRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-muted-foreground" />
              <p className="font-medium">Drop your TXT file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="gap-1">
                <FileText className="w-3 h-3" />
                {fileName}
              </Badge>
              <span className="text-muted-foreground">
                {parsedCases.length} case{parsedCases.length !== 1 ? 's' : ''} found
              </span>
              {validCount > 0 && (
                <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {validCount} valid
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorCount} with errors
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => { setParsedCases(null); setFileName(''); }}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Preview */}
            <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
              <div className="space-y-3 pr-4">
                {parsedCases.map((pc, i) => (
                  <Card key={i} className={pc.parseErrors.length > 0 ? 'border-destructive/50' : ''}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm">{pc.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">{pc.case_mode.replace('_', ' ')}</Badge>
                        <Badge variant="secondary" className="text-xs">{pc.difficulty}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {pc.stages.length} stage{pc.stages.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">{pc.intro_text}</p>
                      {pc.parseErrors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {pc.parseErrors.map((err, j) => (
                            <p key={j} className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {err}
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {importing && (
              <div className="space-y-1">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Importing... {importProgress}%
                </p>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          {parsedCases && (
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <>Import {validCount} Case{validCount !== 1 ? 's' : ''}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
