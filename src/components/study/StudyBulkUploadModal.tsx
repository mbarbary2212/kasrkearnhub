import { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Check, AlertTriangle, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import {
  StudyResourceType,
  StudyResourceInsert,
  FlashcardContent,
  TableContent,
  AlgorithmContent,
  ExamTipContent,
  useBulkCreateStudyResources,
  useChapterStudyResourcesByType,
} from '@/hooks/useStudyResources';
import { isFlashcardDuplicate, findDuplicates, type DuplicateResult } from '@/lib/duplicateDetection';
import { resolveSectionId } from '@/lib/csvExport';
import { useChapterSections } from '@/hooks/useSections';
import { toast } from 'sonner';

interface ConceptLookup {
  id: string;
  concept_key: string;
  title: string;
}

interface StudyBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  moduleId: string;
  resourceType: StudyResourceType;
  concepts?: ConceptLookup[];
}

interface ParsedItem {
  title: string;
  content: FlashcardContent | TableContent | AlgorithmContent | ExamTipContent;
  sectionName?: string;
  sectionNumber?: number;
  conceptKey?: string;
  error?: string;
}

interface ParseError {
  row: number;
  reason: string;
}

const TYPE_LABELS: Record<StudyResourceType, string> = {
  flashcard: 'Flashcards',
  table: 'Key Tables',
  algorithm: 'Algorithms',
  exam_tip: 'Exam Tips',
  key_image: 'Key Images',
  mind_map: 'Mind Maps',
  infographic: 'Infographics',
  clinical_case_worked: 'Worked Cases',
  guided_explanation: 'Guided Explanations',
};

const CSV_FORMATS: Record<StudyResourceType, string> = {
  flashcard: 'title,front,back,section_name,section_number\n"Card Title","Question text","Answer text","Section Name","1"',
  table: 'title,headers,row1,row2,section_name,section_number\n"Table Title","Col1|Col2|Col3","Val1|Val2|Val3","Val4|Val5|Val6","",""',
  algorithm: 'title,steps,section_name,section_number\n"Algorithm Title","Step 1 title::Step 1 desc|Step 2 title::Step 2 desc","",""',
  exam_tip: 'title,tips,section_name,section_number\n"Tips Title","Tip 1|Tip 2|Tip 3","",""',
  key_image: 'Not supported for bulk upload',
  mind_map: 'Not supported for bulk upload',
  infographic: 'Not supported for bulk upload',
  clinical_case_worked: 'Not supported for bulk upload',
  guided_explanation: 'Not supported for bulk upload',
};

const SIMILARITY_THRESHOLD = 0.85;

export function StudyBulkUploadModal({
  open,
  onOpenChange,
  chapterId,
  topicId,
  moduleId,
  resourceType,
  concepts = [],
}: StudyBulkUploadModalProps) {
  const containerId = chapterId || topicId;
  const bulkCreate = useBulkCreateStudyResources();
  const { data: existingResources } = useChapterStudyResourcesByType(chapterId, resourceType);
  const { data: sections = [] } = useChapterSections(chapterId);

  const [parsedData, setParsedData] = useState<DuplicateResult<ParsedItem>[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
  };

  const detectDuplicates = useCallback((parsed: ParsedItem[]): DuplicateResult<ParsedItem>[] => {
    if (resourceType !== 'flashcard' || !existingResources) {
      // For non-flashcard types, just return without duplicate detection
      return parsed.map((item, index) => ({
        item,
        rowIndex: index + 1,
        isExactDuplicate: false,
        isPossibleDuplicate: false,
        similarity: 0,
        status: 'pending' as const,
      }));
    }

    // For flashcards, do duplicate detection
    const existingForComparison = existingResources.map(r => ({
      id: r.id,
      front: (r.content as FlashcardContent).front || '',
      back: (r.content as FlashcardContent).back || '',
    }));

    const parsedForComparison = parsed.map(p => ({
      front: (p.content as FlashcardContent).front || '',
      back: (p.content as FlashcardContent).back || '',
    }));

    const results = findDuplicates(
      parsedForComparison,
      existingForComparison,
      (a, b) => isFlashcardDuplicate(a, b),
      SIMILARITY_THRESHOLD
    );

    return results.map((result, index) => ({
      ...result,
      item: parsed[index],
      status: (result.isExactDuplicate ? 'skip' : 'pending') as 'pending' | 'import' | 'skip',
    }));
  }, [resourceType, existingResources]);

  const processCSV = useCallback(
    (text: string) => {
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setErrors([{ row: 0, reason: 'CSV must have at least a header row and one data row' }]);
        return;
      }

      const parsed: ParsedItem[] = [];
      const parseErrors: ParseError[] = [];
      
      // Check if first line is a header and build mapping
      const firstLine = lines[0];
      const hasHeader = isHeaderLine(firstLine);
      const headerMapping = hasHeader ? buildHeaderMapping(firstLine) : undefined;
      const startIndex = hasHeader ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = parseCSVLine(line);
          const item = parseLineByType(values, resourceType, i + 1, headerMapping);
          if (item.error) {
            parseErrors.push({ row: i + 1, reason: item.error });
          } else {
            parsed.push(item);
          }
        } catch (e) {
          parseErrors.push({ row: i + 1, reason: (e as Error).message });
        }
      }

      const withDuplicates = detectDuplicates(parsed);
      setParsedData(withDuplicates);
      setErrors(parseErrors);
    },
    [resourceType, detectDuplicates]
  );

  const handleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  }, [processCSV]);


  const toggleItemStatus = (index: number) => {
    setParsedData(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, status: item.status === 'skip' ? 'import' : 'skip' }
        : item
    ));
  };

  const itemsToImport = useMemo(() => 
    parsedData.filter(p => p.status !== 'skip').length,
    [parsedData]
  );

  const exactDuplicates = useMemo(() => 
    parsedData.filter(p => p.isExactDuplicate).length,
    [parsedData]
  );

  const possibleDuplicates = useMemo(() => 
    parsedData.filter(p => p.isPossibleDuplicate).length,
    [parsedData]
  );

  const handleImport = async () => {
    const toImport = parsedData.filter(p => p.status !== 'skip');
    
    if (toImport.length === 0) {
      toast.error('No items to import');
      return;
    }

    try {
      const resources: StudyResourceInsert[] = toImport.map((item) => {
        // Resolve section from parsed data
        const sectionId = resolveSectionId(sections, item.item.sectionName, item.item.sectionNumber);
        
        // Resolve concept from parsed data
        let conceptId: string | null = null;
        if (item.item.conceptKey && concepts.length > 0) {
          const normalizedKey = item.item.conceptKey.trim().toLowerCase();
          const matched = concepts.find(c => c.concept_key.toLowerCase() === normalizedKey);
          if (matched) conceptId = matched.id;
        }
        
        return {
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
          resource_type: resourceType,
          title: item.item.title,
          content: item.item.content,
          section_id: sectionId,
          concept_id: conceptId,
          concept_auto_assigned: conceptId ? false : undefined,
          concept_ai_confidence: null,
        };
      });

      await bulkCreate.mutateAsync(resources);
      toast.success(`Imported ${resources.length} items`);
      resetState();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to import resources');
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload {TYPE_LABELS[resourceType]}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* CSV Format Example */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">CSV Format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {CSV_FORMATS[resourceType]}
            </pre>
          </div>

          {/* File Upload Area with Drag & Drop */}
          <DragDropZone
            id={`csv-upload-${resourceType}`}
            onFileSelect={handleFileSelect}
            accept=".csv"
            fileName={fileName}
            acceptedTypes={['.csv']}
            maxSizeMB={10}
          />

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  {errors.length} error(s) found:
                </p>
                <ScrollArea className="h-24">
                  <ul className="text-xs space-y-1">
                    {errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.reason}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Duplicate Summary */}
          {parsedData.length > 0 && (exactDuplicates > 0 || possibleDuplicates > 0) && (
            <Alert className="border-amber-500/50 bg-amber-50/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Duplicate Detection:</strong>
                {exactDuplicates > 0 && (
                  <span className="ml-2">
                    {exactDuplicates} exact duplicate(s) found (auto-skipped)
                  </span>
                )}
                {possibleDuplicates > 0 && (
                  <span className="ml-2">
                    {possibleDuplicates} possible duplicate(s) detected
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="border rounded-lg">
              <div className="px-4 py-2 bg-muted border-b flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  {parsedData.length} items parsed, {itemsToImport} will be imported
                </span>
              </div>
              <ScrollArea className="h-48">
                <div className="p-2 space-y-1">
                  {parsedData.map((item, index) => (
                    <div
                      key={index}
                      className={`text-sm px-3 py-2 rounded flex items-center gap-3 ${
                        item.isExactDuplicate 
                          ? 'bg-red-50 border border-red-200' 
                          : item.isPossibleDuplicate 
                            ? 'bg-amber-50 border border-amber-200' 
                            : 'bg-accent/30'
                      }`}
                    >
                      <Checkbox
                        checked={item.status !== 'skip'}
                        onCheckedChange={() => toggleItemStatus(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {index + 1}.
                          </span>
                          <span className="font-medium truncate">{item.item.title}</span>
                        </div>
                        {item.isExactDuplicate && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Exact duplicate
                          </Badge>
                        )}
                        {item.isPossibleDuplicate && !item.isExactDuplicate && (
                          <Badge variant="outline" className="mt-1 text-xs bg-amber-100 text-amber-800 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {Math.round(item.similarity * 100)}% similar
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={itemsToImport === 0 || bulkCreate.isPending}
          >
            {bulkCreate.isPending ? 'Importing...' : `Import ${itemsToImport} Items`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

// Parse line based on resource type
function parseLineByType(
  values: string[],
  type: StudyResourceType,
  rowNum: number,
  headerMapping?: Record<string, number>
): ParsedItem {
  if (values.length < 2) {
    return { title: '', content: { front: '', back: '' }, error: 'Not enough columns' };
  }

  const title = values[0];
  if (!title) {
    return { title: '', content: { front: '', back: '' }, error: 'Title is required' };
  }
  
  // Extract section info - check header mapping first, then fall back to last columns
  const getSectionInfo = (): { sectionName?: string; sectionNumber?: number } => {
    if (headerMapping) {
      const sectionNameIdx = headerMapping['section_name'];
      const sectionNumIdx = headerMapping['section_number'];
      const sectionName = sectionNameIdx !== undefined ? values[sectionNameIdx]?.trim() : undefined;
      const sectionNumRaw = sectionNumIdx !== undefined ? values[sectionNumIdx]?.trim() : undefined;
      const sectionNumber = sectionNumRaw ? parseInt(sectionNumRaw, 10) : undefined;
      return { 
        sectionName: sectionName || undefined, 
        sectionNumber: !isNaN(sectionNumber as number) ? sectionNumber : undefined 
      };
    }
    return {};
  };
  
  const { sectionName, sectionNumber } = getSectionInfo();

  // Extract concept key from header mapping
  const getConceptKey = (): string | undefined => {
    if (headerMapping) {
      const conceptKeyIdx = headerMapping['concept_key'];
      if (conceptKeyIdx !== undefined) return values[conceptKeyIdx]?.trim() || undefined;
    }
    return undefined;
  };
  const conceptKey = getConceptKey();

  switch (type) {
    case 'flashcard': {
      if (values.length < 3) {
        return { title, content: { front: '', back: '' }, error: 'Flashcard requires title, front, and back' };
      }
      return {
        title,
        content: { front: values[1], back: values[2] } as FlashcardContent,
        sectionName,
        sectionNumber,
        conceptKey,
      };
    }
    case 'table': {
      if (values.length < 3) {
        return { title, content: { headers: [], rows: [] }, error: 'Table requires at least title, headers, and one row' };
      }
      // For table, need to find where section columns end and row data begins
      const headers = values[1].split('|').map((h) => h.trim());
      // Find rows - exclude section_name and section_number columns if present
      let rowEndIndex = values.length;
      if (headerMapping) {
        const sectionCols = [headerMapping['section_name'], headerMapping['section_number']].filter(i => i !== undefined);
        if (sectionCols.length > 0) {
          rowEndIndex = Math.min(...sectionCols);
        }
      }
      const rows = values.slice(2, rowEndIndex).filter(r => r.trim()).map((r) => r.split('|').map((c) => c.trim()));
      return {
        title,
        content: { headers, rows } as TableContent,
        sectionName,
        sectionNumber,
      };
    }
    case 'algorithm': {
      if (values.length < 2) {
        return { title, content: { steps: [] }, error: 'Algorithm requires title and steps' };
      }
      const steps = values[1].split('|').map((s) => {
        const [stepTitle, description = ''] = s.split('::').map((x) => x.trim());
        return { title: stepTitle, description };
      });
      return {
        title,
        content: { steps } as AlgorithmContent,
        sectionName,
        sectionNumber,
      };
    }
    case 'exam_tip': {
      if (values.length < 2) {
        return { title, content: { tips: [] }, error: 'Exam tips require title and tips' };
      }
      const tips = values[1].split('|').map((t) => t.trim());
      return {
        title,
        content: { tips } as ExamTipContent,
        sectionName,
        sectionNumber,
      };
    }
    default:
      return { title: '', content: { front: '', back: '' }, error: `Unsupported type: ${type}` };
  }
}

// Build header mapping from first row
function buildHeaderMapping(headerLine: string): Record<string, number> {
  const mapping: Record<string, number> = {};
  const headers = parseCSVLine(headerLine);
  
  const columnMappings: Record<string, string> = {
    'title': 'title',
    'front': 'front',
    'back': 'back',
    'headers': 'headers',
    'steps': 'steps',
    'tips': 'tips',
    'section_name': 'section_name',
    'sectionname': 'section_name',
    'section': 'section_name',
    'section_number': 'section_number',
    'sectionnumber': 'section_number',
    'section_num': 'section_number',
    'concept_key': 'concept_key',
    'conceptkey': 'concept_key',
    'concept_id_key': 'concept_key',
    'concept_title': 'concept_title',
    'concepttitle': 'concept_title',
    'concept_name': 'concept_title',
    'conceptname': 'concept_title',
  };
  
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().replace(/[\s_-]+/g, '_').replace(/[^a-z0-9_]/g, '');
    const target = columnMappings[normalized];
    if (target && mapping[target] === undefined) {
      mapping[target] = index;
    }
  });
  
  return mapping;
}

// Check if line is a header
function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes('title') && (
    lower.includes('front') || 
    lower.includes('headers') || 
    lower.includes('steps') || 
    lower.includes('tips') ||
    lower.includes('concept')
  );
}
