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
  GuidedExplanationContent,
  useBulkCreateStudyResources,
  useChapterStudyResourcesByType,
} from '@/hooks/useStudyResources';
import { isFlashcardDuplicate, findDuplicates, type DuplicateResult } from '@/lib/duplicateDetection';
import { resolveSectionId } from '@/lib/csvExport';
import { useChapterSections } from '@/hooks/useSections';
import { SectionWarningBanner } from '@/components/sections/SectionWarningBanner';
import { toast } from 'sonner';

interface StudyBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  moduleId: string;
  resourceType: StudyResourceType;
}

interface ParsedItem {
  title: string;
  content: FlashcardContent | TableContent | AlgorithmContent | ExamTipContent | GuidedExplanationContent;
  sectionName?: string;
  sectionNumber?: string;
  error?: string;
}

interface ParseError {
  row: number;
  reason: string;
}

const TYPE_LABELS: Record<StudyResourceType, string> = {
  flashcard: 'Flashcards',
  table: 'Key Tables',
  algorithm: 'Pathways',
  exam_tip: 'Exam Tips',
  key_image: 'Key Images',
  mind_map: 'Mind Maps',
  infographic: 'Infographics',
  clinical_case_worked: 'Worked Cases',
  guided_explanation: 'Guided Explanations',
};

const CSV_FORMAT_FLASHCARD_NORMAL = 'title,front,back,section_name,section_number\n"Card Title","Question text","Answer text","Section Name","1"';
const CSV_FORMAT_FLASHCARD_CLOZE = 'title,cloze_text,extra,section_name,section_number\n"Burns Classification","Second degree burns involve the epidermis and a portion of the {{c1::dermis}}.","Blisters are a common clinical sign.","Section Name","1"';

const CSV_FORMATS: Record<StudyResourceType, string> = {
  flashcard: CSV_FORMAT_FLASHCARD_NORMAL,
  table: 'title,headers,row1,row2,section_name,section_number\n"Table Title","Col1|Col2|Col3","Val1|Val2|Val3","Val4|Val5|Val6","",""',
  algorithm: 'title,steps,section_name,section_number\n"Algorithm Title","Step 1 title::Step 1 desc|Step 2 title::Step 2 desc","",""',
  exam_tip: 'title,tips,section_name,section_number\n"Tips Title","Tip 1|Tip 2|Tip 3","",""',
  key_image: 'Not supported for bulk upload',
  mind_map: 'Not supported for bulk upload',
  infographic: 'Not supported for bulk upload',
  clinical_case_worked: 'Not supported for bulk upload',
  guided_explanation: 'title,topic,introduction,questions,summary,key_takeaways,section_name,section_number\n"Wound Healing","Wound healing phases","Overview of wound healing stages","What is the first phase?::Think inflammation::Hemostasis and inflammation|What follows?::Think tissue formation::Proliferation phase","Summary of wound healing","Hemostasis first|Proliferation follows|Remodeling last","",""',
};

const SIMILARITY_THRESHOLD = 0.85;

type CardSubtype = 'normal' | 'cloze';

export function StudyBulkUploadModal({
  open,
  onOpenChange,
  chapterId,
  topicId,
  moduleId,
  resourceType,
}: StudyBulkUploadModalProps) {
  const containerId = chapterId || topicId;
  const bulkCreate = useBulkCreateStudyResources();
  const { data: existingResources } = useChapterStudyResourcesByType(chapterId, resourceType);
  const { data: sections = [] } = useChapterSections(chapterId);

  const [parsedData, setParsedData] = useState<DuplicateResult<ParsedItem>[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [cardSubtype, setCardSubtype] = useState<CardSubtype>('normal');

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
    setCardSubtype('normal');
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
      
      const firstLine = lines[0];
      const hasHeader = isHeaderLine(firstLine);
      const headerMapping = hasHeader ? buildHeaderMapping(firstLine) : undefined;
      const startIndex = hasHeader ? 1 : 0;

      // Determine effective type for parsing
      const effectiveSubtype = resourceType === 'flashcard' ? cardSubtype : undefined;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = parseCSVLine(line);
          const item = parseLineByType(values, resourceType, i + 1, headerMapping, effectiveSubtype);
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
    [resourceType, cardSubtype, detectDuplicates]
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
        
        return {
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
          resource_type: resourceType,
          title: item.item.title,
          content: item.item.content,
          section_id: sectionId,
          original_section_name: item.item.sectionName || null,
          original_section_number: item.item.sectionNumber || null,
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
          <DialogTitle>
            {resourceType === 'flashcard'
              ? `Import ${cardSubtype === 'cloze' ? 'Cloze ' : ''}Flashcards`
              : `Bulk Upload ${TYPE_LABELS[resourceType]}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Card subtype toggle for flashcards */}
          {resourceType === 'flashcard' && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              <Button
                size="sm"
                variant={cardSubtype === 'normal' ? 'default' : 'outline'}
                onClick={() => { setCardSubtype('normal'); setParsedData([]); setErrors([]); setFileName(''); }}
                className="text-xs"
              >
                Flashcard
              </Button>
              <Button
                size="sm"
                variant={cardSubtype === 'cloze' ? 'default' : 'outline'}
                onClick={() => { setCardSubtype('cloze'); setParsedData([]); setErrors([]); setFileName(''); }}
                className="text-xs"
              >
                Cloze
              </Button>
            </div>
          )}

          {/* Section Warning */}
          <SectionWarningBanner chapterId={chapterId} topicId={topicId} />
          {/* CSV Format Example */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">CSV Format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {resourceType === 'flashcard'
                ? (cardSubtype === 'cloze' ? CSV_FORMAT_FLASHCARD_CLOZE : CSV_FORMAT_FLASHCARD_NORMAL)
                : CSV_FORMATS[resourceType]}
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
  headerMapping?: Record<string, number>,
  cardSubtype?: 'normal' | 'cloze'
): ParsedItem {
  if (values.length < 2) {
    return { title: '', content: { front: '', back: '' }, error: 'Not enough columns' };
  }

  const title = values[0];
  if (!title) {
    return { title: '', content: { front: '', back: '' }, error: 'Title is required' };
  }
  
  // Extract section info - check header mapping first, then fall back to last columns
  const getSectionInfo = (): { sectionName?: string; sectionNumber?: string } => {
    if (headerMapping) {
      const sectionNameIdx = headerMapping['section_name'];
      const sectionNumIdx = headerMapping['section_number'];
      const sectionName = sectionNameIdx !== undefined ? values[sectionNameIdx]?.trim() : undefined;
      const sectionNumRaw = sectionNumIdx !== undefined ? values[sectionNumIdx]?.trim() : undefined;
      const sectionNumber = sectionNumRaw || undefined;
      return { 
        sectionName: sectionName || undefined, 
        sectionNumber,
      };
    }
    return {};
  };
  
  const { sectionName, sectionNumber } = getSectionInfo();

  switch (type) {
    case 'flashcard': {
      // Support cloze cards via header mapping
      const cardTypeIdx = headerMapping?.['card_type'];
      const clozeTextIdx = headerMapping?.['cloze_text'];
      const extraIdx = headerMapping?.['extra'];
      
      const cardTypeVal = cardTypeIdx !== undefined ? values[cardTypeIdx]?.trim().toLowerCase() : undefined;
      const clozeTextVal = clozeTextIdx !== undefined ? values[clozeTextIdx]?.trim() : undefined;
      const extraVal = extraIdx !== undefined ? values[extraIdx]?.trim() : undefined;
      
      const isCloze = cardTypeVal === 'cloze' && !!clozeTextVal;
      
      if (!isCloze && values.length < 3) {
        return { title, content: { front: '', back: '' }, error: 'Flashcard requires title, front, and back (or card_type=cloze with cloze_text)' };
      }
      
      const content: FlashcardContent = {
        front: values[1] || '',
        back: values[2] || '',
        ...(isCloze && { card_type: 'cloze' as const, cloze_text: clozeTextVal }),
        ...(extraVal && { extra: extraVal }),
      };
      
      return {
        title,
        content,
        sectionName,
        sectionNumber,
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
        return { title, content: { steps: [] }, error: 'Pathway requires title and steps' };
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
    case 'guided_explanation': {
      // CSV: title, topic, introduction, questions (Q::Hint::Answer|...), summary, key_takeaways (T1|T2|...)
      const topicIdx = headerMapping?.['topic'] ?? 1;
      const introIdx = headerMapping?.['introduction'] ?? 2;
      const questionsIdx = headerMapping?.['questions'] ?? 3;
      const summaryIdx = headerMapping?.['summary'] ?? 4;
      const takeawaysIdx = headerMapping?.['key_takeaways'] ?? 5;

      const topic = values[topicIdx]?.trim() || '';
      const introduction = values[introIdx]?.trim() || '';
      const questionsRaw = values[questionsIdx]?.trim() || '';
      const summary = values[summaryIdx]?.trim() || '';
      const takeawaysRaw = values[takeawaysIdx]?.trim() || '';

      if (!topic || !questionsRaw) {
        return { title, content: { front: '', back: '' }, error: 'Guided explanation requires topic and at least one question' };
      }

      const guided_questions = questionsRaw.split('|').map((q) => {
        const parts = q.split('::').map((p) => p.trim());
        return {
          question: parts[0] || '',
          hint: parts[1] || undefined,
          reveal_answer: parts[2] || '',
        };
      });

      const key_takeaways = takeawaysRaw ? takeawaysRaw.split('|').map((t) => t.trim()) : [];

      return {
        title,
        content: { topic, introduction, guided_questions, summary, key_takeaways } as GuidedExplanationContent,
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
    'topic': 'topic',
    'introduction': 'introduction',
    'questions': 'questions',
    'summary': 'summary',
    'key_takeaways': 'key_takeaways',
    'keytakeaways': 'key_takeaways',
    'takeaways': 'key_takeaways',
    'section_name': 'section_name',
    'sectionname': 'section_name',
    'section': 'section_name',
    'section_number': 'section_number',
    'sectionnumber': 'section_number',
    'section_num': 'section_number',
    // Flashcard cloze columns
    'card_type': 'card_type',
    'cardtype': 'card_type',
    'type': 'card_type',
    'cloze_text': 'cloze_text',
    'clozetext': 'cloze_text',
    'text': 'cloze_text',
    'extra': 'extra',
    'hint': 'extra',
    'explanation': 'extra',
    'context': 'extra',
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
    lower.includes('topic') ||
    lower.includes('cloze_text') ||
    lower.includes('card_type')
  );
}
