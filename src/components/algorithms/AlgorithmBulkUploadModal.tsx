import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { parseAlgorithmCsv } from '@/hooks/useInteractiveAlgorithms';
import { AlgorithmJson } from '@/types/algorithm';

interface AlgorithmBulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (algorithms: { title: string; json: AlgorithmJson }[]) => void;
  importing?: boolean;
}

const CSV_TEMPLATE = `pathway_title,node_id,step_type,content,option_text,next_node
Chest Pain Assessment,node_1,information,Patient presents with chest pain,, node_2
Chest Pain Assessment,node_2,decision,Is the pain acute or chronic?,Acute onset,node_3
Chest Pain Assessment,node_2,decision,Is the pain acute or chronic?,Chronic/recurring,node_4
Chest Pain Assessment,node_3,emergency,Immediate ECG and troponin levels,,node_5
Chest Pain Assessment,node_4,action,Schedule outpatient cardiology referral,,node_5
Chest Pain Assessment,node_5,end,Assessment complete,,`;

export function AlgorithmBulkUploadModal({ open, onClose, onImport, importing }: AlgorithmBulkUploadModalProps) {
  const [parsed, setParsed] = useState<{ title: string; json: AlgorithmJson }[] | null>(null);
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
        setParsed(results);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsed?.length) return;
    onImport(parsed);
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
            Each row represents a node in the decision tree.
          </p>

          <Button variant="outline" size="sm" onClick={() => {
            const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'algorithm_template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-3 h-3 mr-1" /> Download Template
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
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  <CheckCircle className="w-4 h-4 inline mr-1 text-accent" />
                  Found {parsed.length} algorithm{parsed.length !== 1 ? 's' : ''}:
                </p>
                {parsed.map((alg, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1">{alg.title}</span>
                    <Badge variant="secondary" className="text-xs">{alg.json.nodes.length} steps</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!parsed?.length || importing}>
            {importing ? 'Importing...' : `Import ${parsed?.length || 0} Algorithm${(parsed?.length || 0) !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
