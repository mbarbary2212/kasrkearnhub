import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Upload } from 'lucide-react';
import { isValidVideoUrl, detectVideoSource, normalizeVideoInput } from '@/lib/video';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';

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

export function AdminContentActions({ chapterId, moduleId, topicId, contentType }: AdminContentActionsProps) {
  const { isModuleAdmin, isTopicAdmin } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const queryClient = useQueryClient();

  // Helper to create permission-aware error handler
  const handlePermissionError = (error: Error | unknown, action: 'add' | 'edit' | 'delete') => {
    const message = getPermissionErrorMessage(error, {
      action,
      contentType,
      isModuleAdmin,
      isTopicAdmin,
      isChapterAdmin: isTopicAdmin, // Topic admins are essentially chapter admins in this context
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
      const { error } = await supabase.from('resources').insert({
        title,
        description: description || null,
        external_url: fileUrl || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-resources', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-resources', moduleId] });
      toast.success('Resource added successfully');
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
      const { error } = await supabase.from('essays').insert({
        title,
        question: description,
        model_answer: modelAnswer || null,
        module_id: moduleId,
        chapter_id: chapterId || null,
        topic_id: topicId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-essays', moduleId] });
      toast.success('Essay added successfully');
      setOpen(false);
      resetForm();
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
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      // Skip header row if it looks like a header
      const startIndex = lines[0]?.toLowerCase().includes('title') ? 1 : 0;
      
      const essays = [];
      for (let i = startIndex; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts[0] && parts[1]) {
          essays.push({
            title: parts[0],
            question: parts[1],
            model_answer: parts[2] || null,
            module_id: moduleId,
            chapter_id: chapterId || null,
            topic_id: topicId || null,
          });
        }
      }

      if (essays.length === 0) throw new Error('No valid rows found');

      const { error } = await supabase.from('essays').insert(essays);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-essays', moduleId] });
      toast.success('Short questions uploaded successfully');
      setBulkOpen(false);
      resetForm();
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
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            {label.title}
          </Button>
        </DialogTrigger>
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
              <div>
                <Label>File/External URL</Label>
                <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
            <Button onClick={handleSubmit} className="w-full">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {(contentType === 'mcq' || contentType === 'practical' || contentType === 'essay') && (
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-1" />
              Bulk Upload
            </Button>
          </DialogTrigger>
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
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">CSV Format:</p>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      title,question,model_answer{"\n"}"Question Title","Question text","Model answer text"
                    </pre>
                  </div>
                  <DragDropZone
                    id="essay-csv-upload"
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
                  <Button onClick={() => bulkUploadEssays.mutate()} disabled={!csvText} className="w-full">
                    Upload Short Questions
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
