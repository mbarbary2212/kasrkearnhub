import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { normalizeConceptKey } from '@/lib/conceptNormalization';
import { useCreateConcept, useUpdateConcept, Concept } from '@/hooks/useConcepts';
import * as XLSX from 'xlsx';

type InputMode = 'lines' | 'csv' | 'file';
type DuplicatePolicy = 'skip' | 'update';
type RowStatus = 'new' | 'exists' | 'invalid';

interface ParsedRow {
  title: string;
  conceptKey: string;
  status: RowStatus;
  existingId?: string;
}

interface ConceptBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  topicId?: string;
  existingConcepts: Concept[];
}

export function ConceptBulkUploadModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  topicId,
  existingConcepts,
}: ConceptBulkUploadModalProps) {
  const [mode, setMode] = useState<InputMode>('lines');
  const [linesText, setLinesText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const createConcept = useCreateConcept();
  const updateConcept = useUpdateConcept();

  const existingKeyMap = useMemo(() => {
    const map = new Map<string, Concept>();
    existingConcepts.forEach(c => map.set(c.concept_key, c));
    return map;
  }, [existingConcepts]);

  const classifyRows = (rows: { title: string; conceptKey: string }[]): ParsedRow[] => {
    const seenKeys = new Set<string>();
    return rows.map(row => {
      if (!row.title.trim() || !row.conceptKey) {
        return { ...row, status: 'invalid' as RowStatus };
      }
      if (seenKeys.has(row.conceptKey)) {
        return { ...row, status: 'exists' as RowStatus };
      }
      seenKeys.add(row.conceptKey);
      const existing = existingKeyMap.get(row.conceptKey);
      if (existing) {
        return { ...row, status: 'exists' as RowStatus, existingId: existing.id };
      }
      return { ...row, status: 'new' as RowStatus };
    });
  };

  const parseLines = (text: string): ParsedRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = lines.map(line => ({
      title: line,
      conceptKey: normalizeConceptKey(line),
    }));
    return classifyRows(rows);
  };

  const parseCsv = (text: string): ParsedRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    // Skip header if it looks like one
    const start = lines[0]?.toLowerCase().includes('title') ? 1 : 0;
    const rows = lines.slice(start).map(line => {
      const parts = line.split(',').map(p => p.trim());
      const title = parts[0] || '';
      const conceptKey = parts[1] ? normalizeConceptKey(parts[1]) : normalizeConceptKey(title);
      return { title, conceptKey };
    });
    return classifyRows(rows);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        const rows = json.map(row => {
          const title = (row.title || row.Title || row.name || row.Name || Object.values(row)[0] || '').toString().trim();
          const rawKey = (row.concept_key || row.key || row.Key || '').toString().trim();
          const conceptKey = rawKey ? normalizeConceptKey(rawKey) : normalizeConceptKey(title);
          return { title, conceptKey };
        });

        const classified = classifyRows(rows);
        setParsedRows(classified);
        setStep('preview');
      } catch {
        toast.error('Failed to parse file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePreview = () => {
    let rows: ParsedRow[];
    if (mode === 'lines') {
      rows = parseLines(linesText);
    } else {
      rows = parseCsv(csvText);
    }
    if (rows.length === 0) {
      toast.error('No concepts found in input');
      return;
    }
    setParsedRows(rows);
    setStep('preview');
  };

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    parseFile(file);
  };

  const hasInvalid = parsedRows.some(r => r.status === 'invalid');
  const newRows = parsedRows.filter(r => r.status === 'new');
  const existsRows = parsedRows.filter(r => r.status === 'exists');

  const handleConfirm = async () => {
    setIsImporting(true);
    let created = 0;
    let skipped = 0;
    let updated = 0;
    const maxOrder = existingConcepts.reduce((max, c) => Math.max(max, c.display_order ?? 0), -1);

    try {
      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (row.status === 'invalid') continue;

        if (row.status === 'exists') {
          if (duplicatePolicy === 'update' && row.existingId) {
            await updateConcept.mutateAsync({
              id: row.existingId,
              title: row.title,
              concept_key: row.conceptKey,
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        await createConcept.mutateAsync({
          module_id: moduleId,
          chapter_id: chapterId || null,
          title: row.title,
          concept_key: row.conceptKey,
          display_order: maxOrder + 1 + created,
        });
        created++;
      }

      const parts: string[] = [];
      if (created > 0) parts.push(`${created} created`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (skipped > 0) parts.push(`${skipped} skipped`);
      toast.success(parts.join(', '));
      handleClose();
    } catch {
      toast.error('Import failed partway through');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setLinesText('');
    setCsvText('');
    setFileName('');
    setParsedRows([]);
    setDuplicatePolicy('skip');
    onOpenChange(false);
  };

  const modeButtons: { id: InputMode; label: string }[] = [
    { id: 'lines', label: 'Lines' },
    { id: 'csv', label: 'CSV' },
    { id: 'file', label: 'File' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Concepts</DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {modeButtons.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    mode === m.id
                      ? 'bg-background text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'lines' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Paste one concept per line. Concept keys are auto-generated.
                </p>
                <Textarea
                  placeholder={"Varicose veins\nDeep vein thrombosis\nChronic venous insufficiency\nVenous ulcer"}
                  value={linesText}
                  onChange={e => setLinesText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {mode === 'csv' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Paste CSV with <code className="text-xs bg-muted px-1 rounded">title,concept_key</code> columns. Missing keys are auto-generated.
                </p>
                <Textarea
                  placeholder={"title,concept_key\nVaricose veins,varicose_veins\nDeep vein thrombosis,"}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {mode === 'file' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Upload a <code className="text-xs bg-muted px-1 rounded">.csv</code> or <code className="text-xs bg-muted px-1 rounded">.xlsx</code> file with a <strong>title</strong> column.
                </p>
                <DragDropZone
                  id="concept-bulk-upload"
                  onFileSelect={handleFileSelect}
                  accept=".csv,.xlsx"
                  acceptedTypes={['.csv', '.xlsx']}
                  fileName={fileName}
                />
              </div>
            )}

            {mode !== 'file' && (
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={handlePreview}
                  disabled={mode === 'lines' ? !linesText.trim() : !csvText.trim()}
                >
                  Preview
                </Button>
              </DialogFooter>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1 border-green-500/30 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> {newRows.length} new
              </Badge>
              <Badge variant="outline" className="gap-1 border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" /> {existsRows.length} existing
              </Badge>
              {hasInvalid && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> {parsedRows.filter(r => r.status === 'invalid').length} invalid
                </Badge>
              )}
            </div>

            {/* Duplicate policy */}
            {existsRows.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Duplicate policy</Label>
                <RadioGroup value={duplicatePolicy} onValueChange={(v) => setDuplicatePolicy(v as DuplicatePolicy)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="skip" id="dp-skip" />
                    <Label htmlFor="dp-skip" className="text-sm">Skip duplicates</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="update" id="dp-update" />
                    <Label htmlFor="dp-update" className="text-sm">Update existing title</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Preview table */}
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Concept Key</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{row.title || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.conceptKey || '—'}</TableCell>
                      <TableCell>
                        {row.status === 'new' && (
                          <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/30 text-xs">New</Badge>
                        )}
                        {row.status === 'exists' && (
                          <Badge variant="outline" className="text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">Exists</Badge>
                        )}
                        {row.status === 'invalid' && (
                          <Badge variant="destructive" className="text-xs">Invalid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('input')}>Back</Button>
              <Button
                onClick={handleConfirm}
                disabled={hasInvalid || newRows.length === 0 && (duplicatePolicy !== 'update' || existsRows.length === 0) || isImporting}
              >
                {isImporting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Confirm Import
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
