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
import { Plus, Upload, ShieldAlert, AlertTriangle, Copy, CheckCircle2, Link, Loader2, Check, ExternalLink } from 'lucide-react';
import { isValidVideoUrl, detectVideoSource, normalizeVideoInput, uploadVideoToStorage } from '@/lib/video';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';
import { EssayFormSchema, validateBatch } from '@/lib/validators';
import { logActivity } from '@/lib/activityLog';
import { SectionSelector } from '@/components/sections';
import { SectionWarningBanner } from '@/components/sections/SectionWarningBanner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AudioUploadDialog } from '@/components/admin/AudioUploadDialog';
import { resolveSectionId } from '@/lib/csvExport';
import { useChapterSections } from '@/hooks/useSections';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { normalizeText } from '@/lib/duplicateDetection';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

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
  hideAudio?: boolean;
  documentSubtype?: string;
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
  keywords?: string[];
  rating?: number;
  questionType?: string;
  rubricJson?: Record<string, unknown>;
  maxPoints?: number;
}

export function AdminContentActions({ chapterId, moduleId, topicId, contentType, hideAudio, documentSubtype }: AdminContentActionsProps) {
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

  // Fetch existing doctors for this module (stored in lecture description field)
  const { data: existingDoctors = [] } = useQuery({
    queryKey: ['module-doctors', moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lectures')
        .select('description')
        .eq('module_id', moduleId)
        .eq('is_deleted', false)
        .not('description', 'is', null);
      const unique = [...new Set((data || []).map((l) => l.description).filter(Boolean))];
      return unique.sort() as string[];
    },
    enabled: !!moduleId && contentType === 'lecture',
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

  // Lecture-specific: mode toggle + doctor + YouTube upload
  const [videoMode, setVideoMode] = useState<'link' | 'upload'>('link');
  const [doctor, setDoctor] = useState('');
  const [doctorSelectVal, setDoctorSelectVal] = useState('');
  const [ytFile, setYtFile] = useState<File | null>(null);
  type YtStatus = 'idle' | 'uploading' | 'finalizing' | 'done' | 'error';
  const [ytStatus, setYtStatus] = useState<YtStatus>('idle');
  const [ytProgress, setYtProgress] = useState(0);
  const [ytPrivacy, setYtPrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted');
  const [ytUrl, setYtUrl] = useState('');
  const [ytError, setYtError] = useState('');
  const [parsedEssayRows, setParsedEssayRows] = useState<ParsedEssayRow[]>([]);
  const [essayParseErrors, setEssayParseErrors] = useState<string[]>([]);
  const [defaultMarking, setDefaultMarking] = useState<number>(10);

  const processEssayCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      setEssayParseErrors(['No data found in CSV']);
      setParsedEssayRows([]);
      return;
    }

    const firstRowParts = parseCSVLine(lines[0]);
    const firstRowLower = firstRowParts.map(h => h.toLowerCase().trim());
    const knownHeaders = ['title', 'question', 'model_answer', 'scenario_text', 'questions', 'section_name', 'section_number', 'keywords', 'rating', 'question_type', 'rubric_json', 'max_points'];
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

      // Parse optional new fields
      const keywordsRaw = col(parts, 'keywords');
      const ratingRaw = col(parts, 'rating');
      const questionTypeRaw = col(parts, 'question_type');
      const rubricJsonRaw = col(parts, 'rubric_json');
      const maxPointsRaw = col(parts, 'max_points');

      const rowNum = i + 1;
      let error: string | undefined;

      if (!rowTitle) error = `Row ${rowNum}: Missing title`;
      else if (!question) error = `Row ${rowNum}: Missing question`;

      // Parse keywords (pipe-separated)
      const keywords = keywordsRaw ? keywordsRaw.split('|').map(k => k.trim()).filter(Boolean) : undefined;

      // Parse rating (5-20) — text labels are silently ignored
      let rating: number | undefined;
      if (ratingRaw) {
        const parsed = parseInt(ratingRaw, 10);
        if (!isNaN(parsed)) {
          if (parsed < 5 || parsed > 20) {
            error = error || `Row ${rowNum}: Rating must be between 5 and 20`;
          } else {
            rating = parsed;
          }
        }
        // Non-numeric strings (e.g. "Intermediate") are silently skipped
      }

      // Parse question_type
      const questionType = questionTypeRaw || undefined;

      // Parse rubric_json
      let rubricJson: Record<string, unknown> | undefined;
      if (rubricJsonRaw) {
        try {
          rubricJson = JSON.parse(rubricJsonRaw);
        } catch {
          error = error || `Row ${rowNum}: Invalid rubric_json (malformed JSON)`;
        }
      }

      // Parse max_points (5-20) — text labels are silently ignored
      let maxPoints: number | undefined;
      if (maxPointsRaw) {
        const parsed = parseInt(maxPointsRaw, 10);
        if (!isNaN(parsed)) {
          if (parsed < 5 || parsed > 20) {
            error = error || `Row ${rowNum}: max_points must be between 5 and 20`;
          } else {
            maxPoints = parsed;
          }
        }
      }

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
        keywords,
        rating,
        questionType,
        rubricJson,
        maxPoints,
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
        throw new Error('Invalid video URL. Please use a YouTube or Google Drive link.');
      }
      const doctorValue = doctor.trim() || null;
      const { error } = await supabase.from('lectures').insert({
        title,
        description: doctorValue,
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
        ...(documentSubtype ? { document_subtype: documentSubtype } : {}),
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
        ...(row.keywords ? { keywords: row.keywords } : {}),
        ...(row.rating !== undefined ? { rating: row.rating } : {}),
        ...(row.questionType ? { question_type: row.questionType } : {}),
        ...(row.rubricJson ? { rubric_json: row.rubricJson } : {}),
        ...(row.maxPoints !== undefined ? { max_points: row.maxPoints } : {}),
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

      // Use essaysToInsert (which has all fields) filtered to only valid indices
      const validIndices = new Set(essaysToInsert.map((_, i) => i).filter(i => !invalid.some(inv => inv.index === i)));
      const validEssays = essaysToInsert.filter((_, i) => validIndices.has(i));

      // Map back original section names from parsed rows
      const sectionNameMap = new Map<string, string>();
      selectedRows.forEach(r => {
        if (r.sectionName) sectionNameMap.set(r.title, r.sectionName);
      });

      const { error } = await supabase.from('essays').insert(
        validEssays.map(essay => {
          const { rubric_json, ...rest } = essay as any;
          return {
            ...rest,
            original_section_name: sectionNameMap.get(essay.title) || null,
            rating: essay.rating ?? defaultMarking,
            max_points: essay.max_points ?? defaultMarking,
            ...(rubric_json ? { rubric_json: rubric_json as any } : {}),
          };
        })
      );
      if (error) throw error;
      return { count: validEssays.length };
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
    setVideoMode('link');
    setDoctor('');
    setDoctorSelectVal('');
    setYtFile(null);
    setYtStatus('idle');
    setYtProgress(0);
    setYtPrivacy('unlisted');
    setYtUrl('');
    setYtError('');
  };

  const handleYtUpload = async () => {
    if (!ytFile) { toast.error('Please select a video file.'); return; }
    if (!title.trim()) { toast.error('Please enter a video title.'); return; }
    if (!chapterId) { toast.error('Chapter ID is missing.'); return; }

    setYtStatus('uploading');
    setYtProgress(0);
    setYtError('');

    try {
      const storagePath = `${Date.now()}_${ytFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = SUPABASE_URL;

      await uploadVideoToStorage({
        file: ytFile,
        storagePath,
        supabaseUrl,
        accessToken: session?.access_token ?? '',
        onProgress: setYtProgress,
      });

      setYtStatus('finalizing');

      const { data: fnData, error: fnError } = await supabase.functions.invoke('youtube-upload', {
        body: {
          action: 'upload',
          storage_path: storagePath,
          title,
          description: description,
          privacy: ytPrivacy,
          chapter_id: chapterId,
          module_id: moduleId,
          doctor: doctor.trim() || null,
        },
      });
      if (fnError) throw new Error(fnError.message);

      setYtUrl(fnData?.youtube_url ?? '');
      setYtStatus('done');
      toast.success('Video uploaded to YouTube and linked!');
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-lectures', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
    } catch (err) {
      const msg = (err as Error).message;
      setYtError(msg);
      setYtStatus('error');
      toast.error(`Upload failed: ${msg}`);
    }
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

      {showAddControls && canManageContent && contentType === 'resource' && !hideAudio && (
        <AudioUploadDialog
          moduleId={moduleId}
          chapterId={chapterId}
          topicId={topicId}
        />
      )}

      {showAddControls && canManageContent && (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <Button size="sm" variant="outline" onClick={() => guard(() => setOpen(true))}>
            <Plus className="w-4 h-4 mr-1" />
            {label.title}
          </Button>
          <DialogContent className={contentType === 'lecture' && videoMode === 'upload' ? 'max-w-lg' : undefined}>
            <DialogHeader>
              <DialogTitle>{label.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[calc(90vh-8rem)] overflow-y-auto">

              {/* Lecture mode toggle */}
              {contentType === 'lecture' && (
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setVideoMode('link')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                      videoMode === 'link'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    Link Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                      videoMode === 'upload'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload to YouTube
                  </button>
                </div>
              )}

              {/* Title field — shown for all except lecture upload in done state */}
              {!(contentType === 'lecture' && videoMode === 'upload' && ytStatus === 'done') && (
                <div>
                  <Label>{label.titleField}</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={contentType === 'lecture' && videoMode === 'upload' && ['uploading', 'finalizing'].includes(ytStatus)}
                  />
                </div>
              )}

              {/* Description — non-lecture types only (for lecture, description field replaced by Doctor) */}
              {contentType !== 'lecture' && (
                <div>
                  <Label>{label.descField}</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              )}

              {/* Doctor field — lecture only */}
              {contentType === 'lecture' && !(videoMode === 'upload' && ytStatus === 'done') && (
                <div className="space-y-1.5">
                  <Label>Doctor <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  <Select
                    value={doctorSelectVal}
                    onValueChange={(v) => {
                      setDoctorSelectVal(v);
                      if (v !== '__custom') setDoctor(v === '__none' ? '' : v);
                      else setDoctor('');
                    }}
                    disabled={videoMode === 'upload' && ['uploading', 'finalizing'].includes(ytStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No doctor</SelectItem>
                      {existingDoctors.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      <SelectItem value="__custom">+ Add new doctor…</SelectItem>
                    </SelectContent>
                  </Select>
                  {doctorSelectVal === '__custom' && (
                    <Input
                      value={doctor}
                      onChange={e => setDoctor(e.target.value)}
                      placeholder="e.g. Dr. Ahmed"
                      autoFocus
                      disabled={videoMode === 'upload' && ['uploading', 'finalizing'].includes(ytStatus)}
                    />
                  )}
                </div>
              )}

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

              {/* Link mode: video URL */}
              {contentType === 'lecture' && videoMode === 'link' && (
                <div>
                  <Label>Video URL</Label>
                  <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports YouTube and Google Drive. Drive videos must be shared as "Anyone with the link can view".
                  </p>
                </div>
              )}

              {/* Upload mode: YouTube upload flow */}
              {contentType === 'lecture' && videoMode === 'upload' && (
                <div className="space-y-3">
                  {ytStatus === 'done' ? (
                    <div className="rounded-md bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-800 px-4 py-3 space-y-2">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Upload complete — lecture linked successfully!
                      </p>
                      {ytUrl && (
                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 underline flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View on YouTube
                        </a>
                      )}
                      <Button variant="outline" size="sm" onClick={() => { resetForm(); setOpen(false); }}>
                        Done
                      </Button>
                    </div>
                  ) : ytStatus === 'error' ? (
                    <div className="rounded-md bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-800 px-4 py-3 space-y-2">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Upload failed: {ytError}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => { setYtStatus('idle'); setYtError(''); }}>
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label>Video File</Label>
                        <Input
                          type="file"
                          accept="video/*"
                          disabled={['uploading', 'finalizing'].includes(ytStatus)}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setYtFile(f);
                            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                        <Input
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Video description…"
                          disabled={['uploading', 'finalizing'].includes(ytStatus)}
                        />
                      </div>
                      <div>
                        <Label>Privacy</Label>
                        <Select value={ytPrivacy} onValueChange={(v) => setYtPrivacy(v as typeof ytPrivacy)} disabled={['uploading', 'finalizing'].includes(ytStatus)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unlisted">Unlisted</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {['uploading', 'finalizing'].includes(ytStatus) && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            {ytStatus === 'uploading' ? `Uploading to server… ${ytProgress}%` : 'Sending to YouTube & creating lecture…'}
                          </p>
                          <Progress
                            value={ytStatus === 'uploading' ? ytProgress : undefined}
                            className={ytStatus !== 'uploading' ? 'animate-pulse' : ''}
                          />
                        </div>
                      )}
                      <Button
                        onClick={handleYtUpload}
                        disabled={['uploading', 'finalizing'].includes(ytStatus) || !ytFile || !title.trim()}
                        className="w-full gap-2"
                      >
                        {['uploading', 'finalizing'].includes(ytStatus) ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />{ytStatus === 'uploading' ? `Uploading… ${ytProgress}%` : 'Finalizing…'}</>
                        ) : (
                          <><Upload className="w-4 h-4" />Upload to YouTube</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Practical type video URL */}
              {contentType === 'practical' && (
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
              {!(contentType === 'lecture' && videoMode === 'upload') && (
                <SectionSelector
                  chapterId={chapterId}
                  topicId={topicId}
                  value={sectionId}
                  onChange={setSectionId}
                />
              )}
              {(contentType !== 'lecture' || videoMode === 'link') && (
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={uploading || addResource.isPending}
                >
                  {uploading ? 'Uploading...' : 'Save'}
                </Button>
              )}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {contentType === 'mcq' && 'Bulk Upload MCQs'}
                {contentType === 'practical' && 'Bulk Upload Practicals'}
                {contentType === 'essay' && 'Bulk Upload Short Questions'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[calc(90vh-8rem)] overflow-y-auto pr-1">
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
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium whitespace-nowrap">Default Marking (out of):</Label>
                    <Select value={String(defaultMarking)} onValueChange={v => setDefaultMarking(Number(v))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 5).map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">CSV Format:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      title,question,model_answer,section_name,section_number{"\n"}"Question Title","Question text","Model answer text","Section Name","1"{"\n\n"}Rating column can be a text label (e.g. "Intermediate") or a number 5-20.{"\n"}If no numeric rating is provided, the default marking above is used.
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
