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
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useCreateClinicalCase } from '@/hooks/useClinicalCases';
import { CaseLevel } from '@/types/clinicalCase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClinicalCaseBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  topicId?: string;
}

interface ParsedCase {
  title: string;
  intro_text: string;
  difficulty: CaseLevel;
  learning_objectives: string;
  max_turns: number;
  estimated_minutes: number;
  tags: string[];
  is_published: boolean;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: 'male' | 'female' | 'other';
  parseErrors: string[];
}

const DIFFICULTY_MAP: Record<string, CaseLevel> = {
  easy: 'beginner', medium: 'intermediate', hard: 'advanced',
  beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced',
};

const GENDER_MAP: Record<string, 'male' | 'female' | 'other'> = {
  male: 'male', female: 'female', other: 'other', m: 'male', f: 'female',
};

function parseSingleCase(text: string, index: number): ParsedCase {
  const lines = text.split('\n').map(l => l.trimEnd());
  const errors: string[] = [];

  let title = '';
  let intro = '';
  let difficulty: CaseLevel = 'intermediate';
  let learningObjectives = '';
  let maxTurns = 10;
  let estimatedMinutes = 15;
  let tags: string[] = [];
  let isPublished = false;
  let patientName: string | undefined;
  let patientAge: number | undefined;
  let patientGender: 'male' | 'female' | 'other' | undefined;

  let inObjectives = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if we're collecting multi-line objectives
    if (inObjectives) {
      if (trimmed.startsWith('- ')) {
        learningObjectives += (learningObjectives ? '\n' : '') + trimmed.substring(2).trim();
        continue;
      }
      inObjectives = false;
    }

    // New format: CASE: / INTRO: / LEVEL: etc.
    if (trimmed.startsWith('CASE:')) { title = trimmed.substring(5).trim(); continue; }
    if (trimmed.startsWith('INTRO:')) { intro = trimmed.substring(6).trim(); continue; }
    if (trimmed.startsWith('LEVEL:')) {
      const d = trimmed.substring(6).trim().toLowerCase();
      difficulty = DIFFICULTY_MAP[d] || 'intermediate';
      continue;
    }
    if (trimmed.startsWith('MAX_TURNS:')) { maxTurns = parseInt(trimmed.substring(10).trim()) || 10; continue; }
    if (trimmed.startsWith('ESTIMATED_MINUTES:')) { estimatedMinutes = parseInt(trimmed.substring(18).trim()) || 15; continue; }
    if (trimmed.startsWith('TAGS:')) { tags = trimmed.substring(5).split(',').map(t => t.trim()).filter(Boolean); continue; }
    if (trimmed.startsWith('PUBLISHED:')) { isPublished = trimmed.substring(10).trim().toLowerCase() === 'true'; continue; }
    if (trimmed.startsWith('PATIENT_NAME:')) { patientName = trimmed.substring(13).trim(); continue; }
    if (trimmed.startsWith('PATIENT_AGE:')) { patientAge = parseInt(trimmed.substring(12).trim()) || undefined; continue; }
    if (trimmed.startsWith('PATIENT_GENDER:')) { patientGender = GENDER_MAP[trimmed.substring(15).trim().toLowerCase()]; continue; }
    if (trimmed === 'OBJECTIVES:' || trimmed.startsWith('OBJECTIVES:')) {
      const inline = trimmed.substring(11).trim();
      if (inline) learningObjectives = inline;
      inObjectives = true;
      continue;
    }

    // Legacy format: # Title: / # Intro: etc.
    if (trimmed.startsWith('# Title:')) { title = trimmed.substring(8).trim(); continue; }
    if (trimmed.startsWith('# Intro:')) { intro = trimmed.substring(8).trim(); continue; }
    if (trimmed.startsWith('# Difficulty:')) {
      const d = trimmed.substring(13).trim().toLowerCase();
      difficulty = DIFFICULTY_MAP[d] || 'intermediate';
      continue;
    }
    if (trimmed.startsWith('# Learning Objectives:')) { learningObjectives = trimmed.substring(22).trim(); continue; }
    if (trimmed.startsWith('# Max Turns:')) { maxTurns = parseInt(trimmed.substring(12).trim()) || 10; continue; }
  }

  // If no explicit intro, use non-header/non-keyword content
  if (!intro) {
    const contentLines = lines.filter(l => !l.trim().startsWith('#') && !l.trim().match(/^(CASE|INTRO|LEVEL|MAX_TURNS|ESTIMATED_MINUTES|TAGS|PUBLISHED|PATIENT_NAME|PATIENT_AGE|PATIENT_GENDER|OBJECTIVES):/) && l.trim() && !l.trim().startsWith('- '));
    intro = contentLines.join('\n').trim();
  }

  if (!title) errors.push('Missing title (use CASE: or # Title:)');
  if (!intro) errors.push('Missing intro text (use INTRO: or # Intro:)');

  return {
    title: title || `Untitled Case ${index + 1}`,
    intro_text: intro,
    difficulty,
    learning_objectives: learningObjectives,
    max_turns: maxTurns,
    estimated_minutes: estimatedMinutes,
    tags,
    is_published: isPublished,
    patient_name: patientName,
    patient_age: patientAge,
    patient_gender: patientGender,
    parseErrors: errors,
  };
}

function parseClinicalCasesTxt(text: string): ParsedCase[] {
  // Split on blank line between cases or --- separator
  const blocks = text.split(/\n(?:\s*\n){2,}|\n---\s*\n/);
  return blocks
    .map(block => block.trim())
    .filter(block => {
      if (block.length === 0) return false;
      // Skip blocks that are only comments (no data lines)
      const dataLines = block.split('\n').filter(l => {
        const t = l.trim();
        return t && !t.startsWith('# ===') && !t.startsWith('# AI Cases') && !t.startsWith('# HOW') && !t.startsWith('# TEMPLATE') && !(t.startsWith('#') && !t.startsWith('# Title:') && !t.startsWith('# Intro:') && !t.startsWith('# Difficulty:') && !t.startsWith('# Learning') && !t.startsWith('# Max'));
      });
      return dataLines.length > 0;
    })
    .map((block, i) => parseSingleCase(block, i));
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const cases = parseClinicalCasesTxt(text);
        setParsedCases(cases);
        if (cases.length === 0) toast.error('No cases found in file');
      } catch (err) {
        console.error('Parse error:', err);
        toast.error('Failed to parse file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile([file]);
    if (e.target) e.target.value = '';
  }, [handleFile]);

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
        await createCase.mutateAsync({
          title: pc.title,
          intro_text: pc.intro_text,
          module_id: moduleId,
          chapter_id: chapterId,
          topic_id: topicId,
          level: pc.difficulty,
          estimated_minutes: pc.estimated_minutes,
          tags: pc.tags,
          is_published: pc.is_published,
          learning_objectives: pc.learning_objectives || undefined,
          max_turns: pc.max_turns,
          patient_name: pc.patient_name,
          patient_age: pc.patient_age,
          patient_gender: pc.patient_gender,
        });
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
            Import AI Cases from File
          </DialogTitle>
          <DialogDescription>
            Upload a TXT file with case metadata. Cases are separated by <code>---</code>.
            Each case needs: <code># Title:</code>, <code># Intro:</code>, <code># Difficulty:</code>, and optionally <code># Learning Objectives:</code> and <code># Max Turns:</code>.
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
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all w-full",
                "flex flex-col items-center gap-2",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 bg-background hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleFile([e.dataTransfer.files[0]]); }}
            >
              <FileText className={cn("w-10 h-10 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
              <p className="font-medium">{isDragging ? 'Drop file here...' : 'Drop your TXT file here'}</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          </div>
        ) : (
          <>
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

            <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
              <div className="space-y-3 pr-4">
                {parsedCases.map((pc, i) => (
                  <Card key={i} className={pc.parseErrors.length > 0 ? 'border-destructive/50' : ''}>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm">{pc.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{pc.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">{pc.max_turns} turns</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">{pc.intro_text}</p>
                      {pc.learning_objectives && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Objectives: {pc.learning_objectives}</p>
                      )}
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
          </>
        )}

        {importing && (
          <div className="space-y-2">
            <Progress value={importProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              Importing... {importProgress}%
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          {parsedCases && (
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {validCount} Case{validCount !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
