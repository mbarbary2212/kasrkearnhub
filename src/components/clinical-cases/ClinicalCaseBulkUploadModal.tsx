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
  parseErrors: string[];
}

const DIFFICULTY_MAP: Record<string, CaseLevel> = {
  easy: 'beginner', medium: 'intermediate', hard: 'advanced',
  beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced',
};

function parseSingleCase(text: string, index: number): ParsedCase {
  const lines = text.split('\n').map(l => l.trimEnd());
  const errors: string[] = [];

  let title = `Untitled Case ${index + 1}`;
  let intro = '';
  let difficulty: CaseLevel = 'intermediate';
  let learningObjectives = '';
  let maxTurns = 10;

  for (const line of lines) {
    if (line.startsWith('# Title:')) title = line.substring(8).trim();
    else if (line.startsWith('# Intro:')) intro = line.substring(8).trim();
    else if (line.startsWith('# Difficulty:')) {
      const d = line.substring(13).trim().toLowerCase();
      difficulty = DIFFICULTY_MAP[d] || 'intermediate';
    } else if (line.startsWith('# Learning Objectives:')) {
      learningObjectives = line.substring(22).trim();
    } else if (line.startsWith('# Max Turns:')) {
      maxTurns = parseInt(line.substring(12).trim()) || 10;
    }
  }

  // If no explicit intro header, use non-header content
  if (!intro) {
    const contentLines = lines.filter(l => !l.startsWith('#') && l.trim());
    intro = contentLines.join('\n').trim();
  }

  if (!title || title.startsWith('Untitled')) errors.push('Missing title');
  if (!intro) errors.push('Missing intro text');

  return { title, intro_text: intro, difficulty, learning_objectives: learningObjectives, max_turns: maxTurns, parseErrors: errors };
}

function parseClinicalCasesTxt(text: string): ParsedCase[] {
  const blocks = text.split(/\n---\s*\n/);
  return blocks
    .map(block => block.trim())
    .filter(block => block.length > 0)
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
          estimated_minutes: 15,
          tags: [],
          is_published: false,
          learning_objectives: pc.learning_objectives || undefined,
          max_turns: pc.max_turns,
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
