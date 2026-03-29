import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { logActivity } from '@/lib/activityLog';

// ── CSV parsing ──

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const VALID_DIFFICULTIES = ['easy', 'moderate', 'difficult'] as const;

interface ParsedCaseRow {
  chapterName: string;
  topicName: string;
  difficulty: string;
  caseStem: string;
  questions: { text: string; answer: string }[];
  explanation: string;
  selected: boolean;
  error?: string;
  resolvedChapterId?: string;
  resolvedTopicId?: string;
}

interface Props {
  moduleId: string;
  chapterId?: string;
  topicId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaseScenarioBulkUpload({ moduleId, chapterId, topicId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedCaseRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Fetch chapters for name resolution
  const { data: chapters = [] } = useQuery({
    queryKey: ['module-chapters-lookup', moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('module_chapters')
        .select('id, title')
        .eq('module_id', moduleId);
      return data || [];
    },
    enabled: !!moduleId,
  });

  // Fetch topics for name resolution
  const { data: topics = [] } = useQuery({
    queryKey: ['module-topics-lookup', moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, name')
        .eq('module_id', moduleId);
      return data || [];
    },
    enabled: !!moduleId,
  });

  const processCSV = useCallback((text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    // Detect header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('chapter') || firstLine.includes('case_stem') || firstLine.includes('difficulty');
    const startIdx = hasHeader ? 1 : 0;

    // Build header map
    let headerMap: Record<string, number> = {};
    if (hasHeader) {
      const headers = parseCSVLine(lines[0]);
      headers.forEach((h, i) => { headerMap[h.toLowerCase().replace(/\s+/g, '_')] = i; });
    } else {
      // Default column order
      ['chapter', 'topic', 'difficulty', 'case_stem', 'question_1', 'answer_1', 'question_2', 'answer_2', 'question_3', 'answer_3', 'explanation']
        .forEach((h, i) => { headerMap[h] = i; });
    }

    const col = (parts: string[], name: string) => {
      const idx = headerMap[name];
      return idx !== undefined ? (parts[idx] || '').trim() : '';
    };

    const rows: ParsedCaseRow[] = [];
    const errors: string[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.every(p => !p)) continue; // skip blank

      const chapterName = col(parts, 'chapter');
      const topicName = col(parts, 'topic');
      const difficulty = col(parts, 'difficulty').toLowerCase();
      const caseStem = col(parts, 'case_stem');
      const q1 = col(parts, 'question_1');
      const a1 = col(parts, 'answer_1');
      const q2 = col(parts, 'question_2');
      const a2 = col(parts, 'answer_2');
      const q3 = col(parts, 'question_3');
      const a3 = col(parts, 'answer_3');
      const explanation = col(parts, 'explanation');

      const rowNum = i + 1;
      let error: string | undefined;

      // Validate required fields
      if (!caseStem) error = `Row ${rowNum}: Missing case_stem`;
      else if (!q1) error = `Row ${rowNum}: At least 1 question required`;
      else if (!a1) error = `Row ${rowNum}: Answer required for question_1`;

      // Validate difficulty
      if (!error && !VALID_DIFFICULTIES.includes(difficulty as any)) {
        error = `Row ${rowNum}: Invalid difficulty "${difficulty}" (use easy, moderate, or difficult)`;
      }

      // Resolve chapter
      let resolvedChapterId = chapterId;
      if (!resolvedChapterId && chapterName) {
        const match = chapters.find(c => c.title.toLowerCase() === chapterName.toLowerCase());
        if (match) resolvedChapterId = match.id;
        else if (!error) error = `Row ${rowNum}: Chapter "${chapterName}" not found`;
      }
      if (!resolvedChapterId && !error) {
        error = `Row ${rowNum}: No chapter specified or matched`;
      }

      // Resolve topic
      let resolvedTopicId = topicId;
      if (!resolvedTopicId && topicName) {
        const match = topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
        if (match) resolvedTopicId = match.id;
        // topic is optional, don't error
      }

      // Build questions
      const questions: { text: string; answer: string }[] = [];
      if (q1) questions.push({ text: q1, answer: a1 });
      if (q2) questions.push({ text: q2, answer: a2 });
      if (q3) questions.push({ text: q3, answer: a3 });

      if (error) errors.push(error);

      rows.push({
        chapterName,
        topicName,
        difficulty,
        caseStem,
        questions,
        explanation,
        selected: !error,
        error,
        resolvedChapterId,
        resolvedTopicId,
      });
    }

    setParsedRows(rows);
    setParseErrors(errors);
  }, [chapterId, topicId, chapters, topics]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const selected = parsedRows.filter(r => r.selected && !r.error);
      if (selected.length === 0) throw new Error('No valid rows selected');

      let insertedCount = 0;
      for (const row of selected) {
        // Insert parent case_scenario
        const { data: caseData, error: caseError } = await supabase
          .from('case_scenarios')
          .insert({
            module_id: moduleId,
            chapter_id: row.resolvedChapterId || null,
            topic_id: row.resolvedTopicId || null,
            difficulty: row.difficulty as 'easy' | 'moderate' | 'difficult',
            stem: row.caseStem,
            tags: [],
          })
          .select('id')
          .single();

        if (caseError) throw caseError;

        // Insert child questions
        const questionInserts = row.questions.map((q, idx) => ({
          case_id: caseData.id,
          question_text: q.text,
          model_answer: q.answer || null,
          explanation: idx === row.questions.length - 1 ? (row.explanation || null) : null,
          question_type: 'short_answer' as const,
          max_marks: 5,
          display_order: idx + 1,
        }));

        const { error: qError } = await supabase
          .from('case_scenario_questions')
          .insert(questionInserts);

        if (qError) throw qError;
        insertedCount++;
      }

      return insertedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['case-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['case-scenario-pool'] });
      toast.success(`${count} case scenario${count !== 1 ? 's' : ''} imported successfully`);
      logActivity({
        action: 'bulk_uploaded_case_scenarios',
        entity_type: 'case_scenario',
        scope: { module_id: moduleId, chapter_id: chapterId, topic_id: topicId },
        metadata: { count },
      });
      onOpenChange(false);
      setCsvText('');
      setParsedRows([]);
      setParseErrors([]);
    },
    onError: (err: any) => {
      toast.error(`Upload failed: ${err.message || 'Unknown error'}`);
    },
  });

  const validCount = parsedRows.filter(r => r.selected && !r.error).length;
  const errorCount = parsedRows.filter(r => r.error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bulk Upload Case Scenarios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 max-h-[calc(90vh-8rem)] overflow-y-auto pr-1">
          {/* Format guide */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">CSV Format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground">
              chapter,topic,difficulty,case_stem,question_1,answer_1,question_2,answer_2,question_3,answer_3,explanation
            </pre>
            <ul className="text-xs text-muted-foreground mt-2 space-y-0.5 list-disc pl-4">
              <li>Each row = one clinical case (1–3 sub-questions)</li>
              <li>Difficulty: easy, moderate, or difficult</li>
              <li>Chapter must match an existing chapter name</li>
              <li>At least question_1 and answer_1 are required</li>
            </ul>
          </div>

          {/* File drop zone */}
          <DragDropZone
            id="case-scenario-csv-upload"
            onFileSelect={(file) => {
              const reader = new FileReader();
              reader.onload = () => {
                const text = String(reader.result ?? '');
                setCsvText(text);
                processCSV(text);
              };
              reader.readAsText(file);
            }}
            accept=".csv"
            acceptedTypes={['.csv']}
            maxSizeMB={10}
          />

          {/* Parse results */}
          {parsedRows.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {validCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-muted-foreground">of {parsedRows.length} total rows</span>
              </div>

              {/* Error list */}
              {parseErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4 text-xs space-y-0.5">
                      {parseErrors.slice(0, 8).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {parseErrors.length > 8 && (
                        <li>… and {parseErrors.length - 8} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Row preview */}
              <ScrollArea className="max-h-56 border rounded-lg">
                <div className="divide-y">
                  {parsedRows.map((row, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 text-xs ${row.error ? 'bg-destructive/5' : ''}`}>
                      <Checkbox
                        checked={row.selected}
                        disabled={!!row.error}
                        onCheckedChange={(checked) => {
                          const updated = [...parsedRows];
                          updated[i] = { ...updated[i], selected: !!checked };
                          setParsedRows(updated);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {row.caseStem?.slice(0, 80) || '(empty stem)'}
                          {row.caseStem && row.caseStem.length > 80 ? '…' : ''}
                        </p>
                        <div className="flex gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{row.difficulty}</Badge>
                          <span className="text-muted-foreground">{row.questions.length} Q</span>
                          {row.chapterName && <span className="text-muted-foreground">Ch: {row.chapterName}</span>}
                        </div>
                        {row.error && (
                          <p className="text-destructive mt-0.5">{row.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={validCount === 0 || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending
              ? 'Uploading…'
              : `Upload ${validCount} Case Scenario${validCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
