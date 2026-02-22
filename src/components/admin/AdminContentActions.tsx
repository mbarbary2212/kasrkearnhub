import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Upload, ShieldAlert, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { isValidVideoUrl, detectVideoSource, normalizeVideoInput } from '@/lib/video';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { EssayFormSchema, validateBatch } from '@/lib/validators';
import { logActivity } from '@/lib/activityLog';
import { SectionSelector } from '@/components/sections';
import { SectionWarningBanner } from '@/components/sections/SectionWarningBanner';
import { AudioUploadDialog } from '@/components/admin/AudioUploadDialog';
import { resolveSectionId } from '@/lib/csvExport';
import { useChapterSections } from '@/hooks/useSections';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { normalizeText } from '@/lib/duplicateDetection';

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

interface AdminContentActionsProps {
  chapterId?: string;
  moduleId: string;
  topicId?: string;
  contentType: 'lecture' | 'resource' | 'mcq' | 'essay' | 'practical';
}

interface ParsedEssayRow {
  title: string;
  question: string;
  modelAnswer: string;
  sectionId: string | null;
  sectionName: string;
  selected: boolean;
  isDuplicate: boolean;
  error?: string;
}

export function AdminContentActions({ chapterId, moduleId, topicId, contentType }: AdminContentActionsProps) {
  const auth = useAuthContext();
  const { data: sections = [] } = useChapterSections(chapterId);

  // Fetch existing essays for duplicate detection
  const { data: existingEssays = [] } = useQuery({
    queryKey: ['chapter-essays-for-dedup', chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      const { data } = await supabase
        .from('essays')
        .select('id, title')
        .eq('chapter_id', chapterId)
        .eq('is_deleted', false);
      return data || [];
    },
    enabled: !!chapterId,
  });

  const showAddControls = !!(
    auth.isTeacher ||
    auth.isAdmin ||
    auth.isModuleAdmin ||
    auth.isTopicAdmin ||
    auth.isDepartmentAdmin ||
    auth.isPlatformAdmin ||
    auth.isSuperAdmin
  );

  const {
    guard,
    dialog,
    canManage: canManageContent,
    isCheckingPermission: permissionLoading,
  } = useAddPermissionGuard({
    moduleId,
    chapterId: chapterId ?? null,
    topicId: topicId ?? null,
  });

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const queryClient = useQueryClient();

  // Helper to create permission-aware error handler
  const handlePermissionError = (error: Error | unknown, action: 'add' | 'edit' | 'delete') => {
    const message = getPermissionErrorMessage(error, {
      action,
      contentType,
      isModuleAdmin: auth.isModuleAdmin,
      isTopicAdmin: auth.isTopicAdmin,
      isChapterAdmin: auth.isTopicAdmin, // Topic admins are essentially chapter admins in this context
    });
    toast.error(message);
  };

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [csvText, setCsvText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [parsedEssayRows, setParsedEssayRows] = useState<ParsedEssayRow[]>([]);
  const [essayParseErrors, setEssayParseErrors] = useState<string[]>([]);

  const processEssayCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      setEssayParseErrors(['No data found in CSV']);
      setParsedEssayRows([]);
      return;
    }

    const firstRowParts = parseCSVLine(lines[0]);
    const firstRowLower = firstRowParts.map(h => h.toLowerCase().trim());
    const knownHeaders = ['title', 'question', 'model_answer', 'scenario_text', 'questions', 'section_name', 'section_number', 'keywords', 'rating'];
    const hasHeaders = firstRowLower.some(h => knownHeaders.includes(h));

    let headerMap: Record<string, number> = {};
    let startIndex = 0;

    if (hasHeaders) {
      startIndex = 1;
      firstRowLower.forEach((h, idx) => { headerMap[h] = idx; });
    }

    const col = (row: string[], name: string): string => {
      if (hasHeaders && headerMap[name] !== undefined) return row[headerMap[name]]?.trim() || '';
      return '';
    };

    const rows: ParsedEssayRow[] = [];
    const errors: string[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      let rowTitle: string, question: string, mAnswer: string;
      let sName = '';
      let sNumber = '';

      if (hasHeaders) {
        rowTitle = col(parts, 'title');
        const scenarioText = col(parts, 'scenario_text');
        const questionsCol = col(parts, 'questions');
        const questionCol = col(parts, 'question');

        if (questionCol) {
          question = questionCol;
        } else if (scenarioText || questionsCol) {
          question = [scenarioText, questionsCol].filter(Boolean).join('\n\n');
        } else {
          question = '';
        }

        mAnswer = col(parts, 'model_answer');
        sName = col(parts, 'section_name');
        sNumber = col(parts, 'section_number');
      } else {
        rowTitle = parts[0]?.trim() || '';
        question = parts[1]?.trim() || '';
        mAnswer = parts[2]?.trim() || '';
      }

      const rowNum = i + 1;
      let error: string | undefined;

      if (!rowTitle) error = `Row ${rowNum}: Missing title`;
      else if (!question) error = `Row ${rowNum}: Missing question`;

      if (error) errors.push(error);

      const resolvedSectionId = resolveSectionId(sections, sName, sNumber);

      const isDuplicate = rowTitle ? existingEssays.some(
        e => normalizeText(e.title) === normalizeText(rowTitle)
      ) : false;

      rows.push({
        title: rowTitle,
        question,
        modelAnswer: mAnswer,
        sectionId: resolvedSectionId,
        sectionName: sName,
        selected: !isDuplicate && !error,
        isDuplicate,
        error,
      });
    }

    setParsedEssayRows(rows);
    setEssayParseErrors(errors);
  }, [sections, existingEssays]);

  const addLecture = useMutation({
    mutationFn: async () => {
      // Normalize video URL (extract from iframe if needed)
      const normalizedUrl = normalizeVideoInput(videoUrl);
      
      // Validate video URL if provided
      if (normalizedUrl && !isValidVideoUrl(normalizedUrl)) {
        throw new Error('Invalid video URL. Please use a YouTube, Vimeo, or Google Drive link.');
      }
      const { error } = await supabase.from('lectures').insert({
        title,
        description: description || null,
        video_url: normalizedUrl || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        section_id: sectionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-lectures', moduleId] });
      toast.success('Video added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const addResource = useMutation({
    mutationFn: async () => {
      let finalFileUrl = fileUrl || null;

      // If a file was uploaded, upload to storage first
      if (uploadedFile) {
        setUploading(true);
        try {
          const fileExt = uploadedFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `documents/${moduleId}/${chapterId || 'general'}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('study-resources')
            .upload(filePath, uploadedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('study-resources')
            .getPublicUrl(filePath);

          finalFileUrl = publicUrl;
        } finally {
          setUploading(false);
        }
      }

      const { error } = await supabase.from('resources').insert({
        title,
        description: description || null,
        file_url: uploadedFile ? finalFileUrl : null,
        external_url: !uploadedFile ? fileUrl || null : null,
        resource_type: uploadedFile ? 'pdf' : 'link',
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        section_id: sectionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-resources', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-resources', moduleId] });
      toast.success('Document added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const addMcqSet = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mcq_sets').insert({
        title,
        description: description || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        section_id: sectionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-mcq-sets', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-mcq-sets', moduleId] });
      toast.success('MCQ Set added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const addEssay = useMutation({
    mutationFn: async () => {
      // Validate before insert
      const validation = EssayFormSchema.safeParse({
        title,
        question: description,
        model_answer: modelAnswer || null,
      });
      
      if (!validation.success) {
        const messages = validation.error.errors.map(e => e.message);
        throw new Error(`Validation failed: ${messages.join(', ')}`);
      }

      const { data, error } = await supabase.from('essays').insert({
        title,
        question: description,
        model_answer: modelAnswer || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        section_id: sectionId,
      }).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essay-count', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-essays', moduleId] });
      toast.success('Essay added successfully');
      setOpen(false);
      resetForm();
      // Log activity
      logActivity({
        action: 'created_essay',
        entity_type: 'essay',
        entity_id: data?.id,
        scope: { module_id: moduleId, chapter_id: chapterId, topic_id: topicId },
        metadata: { source: 'admin_form' },
      });
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const addPractical = useMutation({
    mutationFn: async () => {
      // Validate video URL if provided
      if (videoUrl && !isValidVideoUrl(videoUrl)) {
        throw new Error('Invalid video URL. Please use a YouTube or Google Drive link.');
      }
      const { error } = await supabase.from('practicals').insert({
        title,
        description: description || null,
        video_url: videoUrl || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        section_id: sectionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-practicals', moduleId] });
      toast.success('Practical added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const bulkUploadMcqs = useMutation({
    mutationFn: async () => {
      // First create a MCQ set
      const { data: mcqSet, error: setError } = await supabase.from('mcq_sets').insert({
        title: title || 'Bulk MCQ Set',
        description: description || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
      }).select().single();
      
      if (setError) throw setError;

      // Parse CSV: question,option1,option2,option3,option4,correct_answer,explanation
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      const questions = lines.map((line, index) => {
        const parts = parseCSVLine(line);
        return {
          mcq_set_id: mcqSet.id,
          question: parts[0] || '',
          options: JSON.stringify([parts[1], parts[2], parts[3], parts[4]].filter(Boolean)),
          correct_answer: parseInt(parts[5]) || 0,
          explanation: parts[6] || null,
          display_order: index + 1,
        };
      });

      const { error: questionsError } = await supabase.from('mcq_questions').insert(questions);
      if (questionsError) throw questionsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-mcq-sets', chapterId] });
      toast.success('MCQs uploaded successfully');
      setBulkOpen(false);
      resetForm();
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const bulkUploadPracticals = useMutation({
    mutationFn: async () => {
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      // Skip header row if it looks like a header
      const startIndex = lines[0]?.toLowerCase().includes('title') ? 1 : 0;
      
      const practicals = [];
      for (let i = startIndex; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts[0]) {
          practicals.push({
            title: parts[0],
            description: parts[1] || null,
            video_url: parts[2] || null,
            module_id: moduleId,
            chapter_id: chapterId || null,
            topic_id: topicId || null,
          });
        }
      }

      if (practicals.length === 0) throw new Error('No valid rows found');

      const { error } = await supabase.from('practicals').insert(practicals);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-practicals', moduleId] });
      toast.success('Practicals uploaded successfully');
      setBulkOpen(false);
      resetForm();
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const bulkUploadEssays = useMutation({
    mutationFn: async () => {
      const selectedRows = parsedEssayRows.filter(r => r.selected && !r.error);
      if (selectedRows.length === 0) throw new Error('No items selected for import');

      const essaysToInsert = selectedRows.map(row => ({
        title: row.title,
        question: row.question,
        model_answer: row.modelAnswer || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
        ...(row.sectionId ? { section_id: row.sectionId } : {}),
      }));

      // Validate batch before insert
      const { valid, invalid, stats } = validateBatch(EssayFormSchema, essaysToInsert, 0);
      
      if (invalid.length > 0) {
        const errorDetails = invalid.slice(0, 5).map(
          i => `Row ${i.row}: ${i.errors[0]}`
        ).join('\n');
        throw new Error(`${stats.invalidCount} row(s) failed validation:\n${errorDetails}`);
      }

      if (valid.length === 0) throw new Error('No valid rows after validation');

      // Map back original section names from parsed rows
      const sectionNameMap = new Map<string, string>();
      selectedRows.forEach(r => {
        if (r.sectionName) sectionNameMap.set(r.title, r.sectionName);
      });

      const { error } = await supabase.from('essays').insert(
        valid.map(essay => ({
          title: essay.title,
          question: essay.question,
          model_answer: essay.model_answer || null,
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
          ...(essay.section_id ? { section_id: essay.section_id } : {}),
          original_section_name: sectionNameMap.get(essay.title) || null,
        }))
      );
      if (error) throw error;
      return { count: valid.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essay-count', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-essays', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['chapter-essays-for-dedup', chapterId] });
      toast.success(`${data?.count || 0} short question(s) uploaded successfully`);
      setBulkOpen(false);
      resetForm();
      setParsedEssayRows([]);
      setEssayParseErrors([]);
      logActivity({
        action: 'bulk_upload_essay',
        entity_type: 'essay',
        scope: { module_id: moduleId, chapter_id: chapterId, topic_id: topicId },
        metadata: { source: 'csv_import', count: data?.count },
      });
    },
    onError: (error) => handlePermissionError(error, 'add'),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setModelAnswer('');
    setVideoUrl('');
    setFileUrl('');
    setCsvText('');
    setUploadedFile(null);
    setSectionId(null);
    setParsedEssayRows([]);
    setEssayParseErrors([]);
  };

  const handleSubmit = () => {
    switch (contentType) {
      case 'lecture':
        addLecture.mutate();
        break;
      case 'resource':
        addResource.mutate();
        break;
      case 'mcq':
        addMcqSet.mutate();
        break;
      case 'essay':
        addEssay.mutate();
        break;
      case 'practical':
        addPractical.mutate();
        break;
    }
  };

  const labels = {
    lecture: { title: 'Add Video', titleField: 'Video Title', descField: 'Description' },
    resource: { title: 'Add Resource', titleField: 'Resource Title', descField: 'Description' },
    mcq: { title: 'Add MCQ Set', titleField: 'Set Title', descField: 'Description' },
    essay: { title: 'Add Essay', titleField: 'Essay Title', descField: 'Question' },
    practical: { title: 'Add Practical', titleField: 'Practical Title', descField: 'Description' },
  };

  const label = labels[contentType];

  return (
    <div className="flex gap-2 items-center">
      {dialog}
      {/* Permission warning for admins without access */}
      {!permissionLoading && showAddControls && !canManageContent && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <ShieldAlert className="h-3 w-3" />
              <span>Not your module</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>You can only manage content in modules you've been assigned to. Contact a Platform Admin if you need access.</p>
          </TooltipContent>
        </Tooltip>
      )}

      {showAddControls && contentType === 'resource' && (
        <AudioUploadDialog
          moduleId={moduleId}
          chapterId={chapterId}
          topicId={topicId}
        />
      )}

      {showAddControls && (
        <Dialog open={open} onOpenChange={setOpen}>
          <Button size="sm" variant="outline" onClick={() => guard(() => setOpen(true))}>
            <Plus className="w-4 h-4 mr-1" />
            {label.title}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{label.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{label.titleField}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>{label.descField}</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              {contentType === 'essay' && (
                <div>
                  <Label>Model Answer (optional)</Label>
                  <Textarea 
                    value={modelAnswer} 
                    onChange={e => setModelAnswer(e.target.value)} 
                    placeholder="Enter the model answer that students can reveal"
                    rows={4}
                  />
                </div>
              )}
              {(contentType === 'lecture' || contentType === 'practical') && (
                <div>
                  <Label>Video URL</Label>
                  <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports YouTube and Google Drive. Drive videos must be shared as "Anyone with the link can view".
                  </p>
                </div>
              )}
              {contentType === 'resource' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Upload PDF File</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                            setFileUrl(''); // Clear URL when file is selected
                          }
                        }}
                        className="block w-full text-sm text-muted-foreground
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-medium
                          file:bg-primary file:text-primary-foreground
                          hover:file:bg-primary/90
                          cursor-pointer"
                      />
                      {uploadedFile && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Selected: {uploadedFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">External URL</Label>
                    <Input 
                      value={fileUrl} 
                      onChange={e => {
                        setFileUrl(e.target.value);
                        setUploadedFile(null); // Clear file when URL is entered
                      }} 
                      placeholder="https://..." 
                      className="mt-2"
                      disabled={!!uploadedFile}
                    />
                  </div>
                </div>
              )}
              <SectionSelector
                chapterId={chapterId}
                topicId={topicId}
                value={sectionId}
                onChange={setSectionId}
              />
              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={uploading || addResource.isPending}
              >
                {uploading ? 'Uploading...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {(contentType === 'mcq' || contentType === 'practical' || contentType === 'essay') && showAddControls && (
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <Button size="sm" variant="outline" onClick={() => guard(() => setBulkOpen(true))}>
            <Upload className="w-4 h-4 mr-1" />
            Bulk Upload
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {contentType === 'mcq' && 'Bulk Upload MCQs'}
                {contentType === 'practical' && 'Bulk Upload Practicals'}
                {contentType === 'essay' && 'Bulk Upload Short Questions'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {contentType === 'mcq' && (
                <>
                  <div>
                    <Label>Set Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>CSV Format: question,option1,option2,option3,option4,correct_answer(0-3),explanation</Label>
                    <Textarea 
                      value={csvText} 
                      onChange={e => setCsvText(e.target.value)} 
                      rows={10}
                      placeholder="What is X?,Option A,Option B,Option C,Option D,0,Explanation here"
                    />
                  </div>
                  <Button onClick={() => bulkUploadMcqs.mutate()} className="w-full">
                    Upload MCQs
                  </Button>
                </>
              )}
              {contentType === 'practical' && (
                <>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">CSV Format:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      title,description,video_url{"\n"}"Practical Title","Description text","https://youtube.com/..."
                    </pre>
                  </div>
                  <DragDropZone
                    id="practical-csv-upload"
                    onFileSelect={(file) => {
                      const reader = new FileReader();
                      reader.onload = () => setCsvText(String(reader.result ?? ''));
                      reader.readAsText(file);
                    }}
                    accept=".csv"
                    acceptedTypes={['.csv']}
                    maxSizeMB={10}
                  />
                  {csvText && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">CSV loaded. Ready to upload.</p>
                    </div>
                  )}
                  <Button onClick={() => bulkUploadPracticals.mutate()} disabled={!csvText} className="w-full">
                    Upload Practicals
                  </Button>
                </>
              )}
              {contentType === 'essay' && (
                <>
                  <SectionWarningBanner chapterId={chapterId} topicId={topicId} />
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">CSV Format:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      title,question,model_answer,section_name,section_number{"\n"}"Question Title","Question text","Model answer text","Section Name","1"
                    </pre>
                  </div>
                  <DragDropZone
                    id="essay-csv-upload"
                    onFileSelect={(file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const text = String(reader.result ?? '');
                        setCsvText(text);
                        processEssayCSV(text);
                      };
                      reader.readAsText(file);
                    }}
                    accept=".csv"
                    acceptedTypes={['.csv']}
                    maxSizeMB={10}
                  />

                  {/* Parse errors */}
                  {essayParseErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-1">{essayParseErrors.length} error(s) found:</p>
                        <ul className="list-disc pl-4 text-xs space-y-0.5">
                          {essayParseErrors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {essayParseErrors.length > 5 && (
                            <li>...and {essayParseErrors.length - 5} more</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Duplicate summary */}
                  {parsedEssayRows.length > 0 && parsedEssayRows.some(r => r.isDuplicate) && (
                    <Alert>
                      <Copy className="h-4 w-4" />
                      <AlertDescription>
                        {parsedEssayRows.filter(r => r.isDuplicate).length} duplicate(s) detected (auto-skipped). You can re-select them if needed.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Parsed rows preview */}
                  {parsedEssayRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Review Items</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setParsedEssayRows(prev => prev.map(r => ({ ...r, selected: !r.error })))}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setParsedEssayRows(prev => prev.map(r => ({ ...r, selected: false })))}
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[280px] border rounded-lg">
                        <div className="divide-y">
                          {parsedEssayRows.map((row, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-3 p-3 text-sm ${
                                row.error ? 'bg-destructive/5' : row.isDuplicate ? 'bg-muted/50' : ''
                              }`}
                            >
                              <Checkbox
                                checked={row.selected}
                                disabled={!!row.error}
                                onCheckedChange={(checked) => {
                                  setParsedEssayRows(prev => prev.map((r, i) =>
                                    i === idx ? { ...r, selected: !!checked } : r
                                  ));
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                  <span className="font-medium truncate">{row.title || '(no title)'}</span>
                                  {row.isDuplicate && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Duplicate</Badge>
                                  )}
                                  {row.error && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Error</Badge>
                                  )}
                                  {row.sectionName && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{row.sectionName}</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {row.question || '(no question)'}
                                </p>
                                {row.modelAnswer && (
                                  <p className="text-xs text-muted-foreground/70 line-clamp-1">
                                    Answer: {row.modelAnswer}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Summary bar */}
                      <div className="flex items-center justify-between text-sm bg-muted p-2 rounded-lg">
                        <span className="text-muted-foreground">
                          {parsedEssayRows.length} parsed
                          {parsedEssayRows.some(r => r.isDuplicate) && (
                            <> · {parsedEssayRows.filter(r => r.isDuplicate).length} duplicates</>
                          )}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          {parsedEssayRows.filter(r => r.selected).length} will be imported
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => bulkUploadEssays.mutate()}
                    disabled={parsedEssayRows.filter(r => r.selected).length === 0 || bulkUploadEssays.isPending}
                    className="w-full"
                  >
                    {bulkUploadEssays.isPending
                      ? 'Uploading...'
                      : `Upload ${parsedEssayRows.filter(r => r.selected).length} Short Question(s)`
                    }
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
