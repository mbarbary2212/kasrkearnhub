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

interface AdminContentActionsProps {
  chapterId: string;
  moduleId: string;
  topicId?: string; // Required for DB but we'll use a placeholder
  contentType: 'lecture' | 'resource' | 'mcq' | 'essay' | 'practical';
}

export function AdminContentActions({ chapterId, moduleId, topicId, contentType }: AdminContentActionsProps) {
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [csvText, setCsvText] = useState('');

  const addLecture = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lectures').insert({
        title,
        description: description || null,
        video_url: videoUrl || null,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId || '00000000-0000-0000-0000-000000000000', // placeholder
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-lectures', chapterId] });
      toast.success('Video added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const addResource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('resources').insert({
        title,
        description: description || null,
        external_url: fileUrl || null,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId || '00000000-0000-0000-0000-000000000000',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-resources', chapterId] });
      toast.success('Resource added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const addMcqSet = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mcq_sets').insert({
        title,
        description: description || null,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId || '00000000-0000-0000-0000-000000000000',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-mcq-sets', chapterId] });
      toast.success('MCQ Set added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const addEssay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('essays').insert({
        title,
        question: description,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId || '00000000-0000-0000-0000-000000000000',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      toast.success('Essay added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const addPractical = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('practicals').insert({
        title,
        description: description || null,
        video_url: videoUrl || null,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId || '00000000-0000-0000-0000-000000000000',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-practicals', chapterId] });
      toast.success('Practical added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkUploadMcqs = useMutation({
    mutationFn: async () => {
      // First create a MCQ set
      const { data: mcqSet, error: setError } = await supabase.from('mcq_sets').insert({
        title: title || 'Bulk MCQ Set',
        description: description || null,
        module_id: moduleId,
        chapter_id: chapterId,
        topic_id: topicId || '00000000-0000-0000-0000-000000000000',
      }).select().single();
      
      if (setError) throw setError;

      // Parse CSV: question,option1,option2,option3,option4,correct_answer,explanation
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      const questions = lines.map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
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
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
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
            {(contentType === 'lecture' || contentType === 'practical') && (
              <div>
                <Label>Video URL</Label>
                <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
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

      {contentType === 'mcq' && (
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-1" />
              Bulk Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Upload MCQs</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
