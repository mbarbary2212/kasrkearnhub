import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, AlertCircle, CheckCircle, BarChart3, GitBranch, Flag, Route } from 'lucide-react';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { parseAlgorithmCsv, validateAlgorithmGraph, GraphValidationResult } from '@/hooks/useInteractiveAlgorithms';
import { AlgorithmJson } from '@/types/algorithm';

interface AlgorithmBulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (algorithms: { title: string; json: AlgorithmJson }[]) => void;
  importing?: boolean;
}

const CSV_TEMPLATE = `pathway_title,node_id,step_type,content,option_text,next_node
Chest Pain Assessment,node_1,information,"Patient presents with chest pain, shortness of breath",,node_2
Chest Pain Assessment,node_2,decision,"Is the pain acute or chronic?",Acute onset,node_3
Chest Pain Assessment,node_2,decision,"Is the pain acute or chronic?",Chronic/recurring,node_4
Chest Pain Assessment,node_3,emergency,"Immediate ECG and troponin levels",,node_5
Chest Pain Assessment,node_4,action,"Schedule outpatient cardiology referral",,node_5
Chest Pain Assessment,node_5,end,"Assessment complete",,`;

interface ParsedPathway {
  title: string;
  json: AlgorithmJson;
  validation: GraphValidationResult;
}

export function AlgorithmBulkUploadModal({ open, onClose, onImport, importing }: AlgorithmBulkUploadModalProps) {
  const [parsed, setParsed] = useState<ParsedPathway[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>();

  const handleFile = (file: File) => {
    setError(null);
    setParsed(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const results = parseAlgorithmCsv(text);
        if (results.length === 0) {
          setError('No valid pathways found in CSV. Check the format.');
          return;
        }
        const withValidation: ParsedPathway[] = results.map(r => ({
          ...r,
          validation: validateAlgorithmGraph(r.json),
        }));
        setParsed(withValidation);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  };

  const hasErrors = parsed?.some(p => !p.validation.valid) ?? false;

  const handleImport = () => {
    if (!parsed?.length || hasErrors) return;
    onImport(parsed.map(p => ({ title: p.title, json: p.json })));
  };

  const handleClose = () => {
    setParsed(null);
    setError(null);
    setFileName(undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Pathways from File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to create multiple interactive pathways at once.
            Each row represents a node in the decision tree. Wrap content containing commas in quotes.
          </p>

          <Button variant="outline" size="sm" onClick={() => window.open('/admin?tab=help-templates', '_blank')}>
            <Download className="w-3 h-3 mr-1" /> Get Template
          </Button>
          </Button>

          <DragDropZone
            id="algorithm-bulk-upload"
            onFileSelect={handleFile}
            accept=".csv"
            fileName={fileName}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {parsed && (
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {parsed.map((alg, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {alg.validation.valid ? (
                        <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="text-sm font-medium flex-1">{alg.title}</span>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <BarChart3 className="w-3 h-3" /> {alg.validation.stats.totalNodes} nodes
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <GitBranch className="w-3 h-3" /> {alg.validation.stats.decisionNodes} decisions
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Flag className="w-3 h-3" /> {alg.validation.stats.terminalNodes} end nodes
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Route className="w-3 h-3" /> depth {alg.validation.stats.longestPath}
                      </Badge>
                    </div>

                    {/* Validation errors */}
                    {!alg.validation.valid && (
                      <div className="space-y-1 mt-1">
                        {alg.validation.errors.map((err, j) => (
                          <p key={j} className="text-xs text-destructive flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {hasErrors && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              Fix validation errors before importing. All pathways must pass validation.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!parsed?.length || hasErrors || importing}>
            {importing ? 'Importing...' : `Import ${parsed?.length || 0} Pathway${(parsed?.length || 0) !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
