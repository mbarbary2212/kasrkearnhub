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
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { Loader2, Upload, ClipboardPaste, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportCaseJsonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (json: Record<string, unknown>) => Promise<void>;
  isPending: boolean;
}

type InputMode = 'file' | 'paste';

/**
 * Attempts to parse potentially malformed JSON from LLM output.
 * Handles: missing outer braces, markdown code fences, trailing commas.
 */
function robustJsonParse(raw: string): Record<string, unknown> {
  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  text = text.trim();

  // If it doesn't start with {, wrap it
  if (!text.startsWith('{')) {
    text = `{${text}`;
  }
  if (!text.endsWith('}')) {
    text = `${text}}`;
  }

  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(text);
}

export function ImportCaseJsonModal({ open, onOpenChange, onImport, isPending }: ImportCaseJsonModalProps) {
  const [mode, setMode] = useState<InputMode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [fileContent, setFileContent] = useState<string>();
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);

  const reset = () => {
    setPasteText('');
    setFileName(undefined);
    setFileContent(undefined);
    setParseError(null);
    setParsed(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setParseError(null);
    setParsed(null);
    try {
      const text = await file.text();
      setFileContent(text);
    } catch {
      setParseError('Could not read file');
    }
  };

  const rawText = mode === 'paste' ? pasteText : fileContent;

  const handleParse = () => {
    if (!rawText?.trim()) {
      setParseError('No content to parse');
      return;
    }
    try {
      const json = robustJsonParse(rawText);
      if (!json.case_meta || !(json.case_meta as any)?.title) {
        setParseError('Invalid case JSON: missing case_meta.title');
        return;
      }
      setParsed(json);
      setParseError(null);
    } catch (err: any) {
      setParseError(`JSON parse error: ${err.message}`);
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    await onImport(parsed);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Case from JSON</DialogTitle>
          <DialogDescription>
            Upload a JSON file or paste the JSON text directly from ChatGPT/Claude.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={mode === 'paste' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setMode('paste'); setParseError(null); setParsed(null); }}
          >
            <ClipboardPaste className="w-4 h-4 mr-1" />
            Paste Text
          </Button>
          <Button
            variant={mode === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setMode('file'); setParseError(null); setParsed(null); }}
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload File
          </Button>
        </div>

        {/* Input area */}
        {mode === 'paste' ? (
          <Textarea
            placeholder='Paste your JSON here... (e.g. {"case_meta": {"title": "..."}, ...})'
            value={pasteText}
            onChange={(e) => { setPasteText(e.target.value); setParsed(null); setParseError(null); }}
            className="min-h-[200px] font-mono text-xs"
          />
        ) : (
          <DragDropZone
            id="import-case-json"
            onFileSelect={handleFileSelect}
            accept=".json,.txt"
            acceptedTypes={['.json', '.txt']}
            fileName={fileName}
          />
        )}

        {/* Parse status */}
        {parseError && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {parsed && (
          <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Valid case JSON: <strong>{(parsed.case_meta as any)?.title}</strong>
              {' '}({(parsed.case_meta as any)?.level || 'intermediate'})
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {!parsed ? (
            <Button onClick={handleParse} disabled={!rawText?.trim()}>
              Validate JSON
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Import as Draft
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
