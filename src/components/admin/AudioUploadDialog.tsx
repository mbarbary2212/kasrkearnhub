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
import { Music, Plus } from 'lucide-react';
import { SectionSelector } from '@/components/sections';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';

interface AudioUploadDialogProps {
  moduleId: string;
  chapterId?: string;
  topicId?: string;
  showButton?: boolean;
  triggerButton?: React.ReactNode;
}

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/ogg', 'audio/webm'];
const ACCEPTED_EXTENSIONS = '.mp3,.m4a,.wav,.ogg,.webm,.mp4';

export function AudioUploadDialog({
  moduleId,
  chapterId,
  topicId,
  showButton = true,
  triggerButton,
}: AudioUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { guard, dialog: permissionDialog } = useAddPermissionGuard({
    moduleId,
    chapterId: chapterId ?? null,
    topicId: topicId ?? null,
  });

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      toast.error('Invalid audio format. Please use MP3, M4A, WAV, OGG, or WebM.');
      return;
    }

    setAudioFile(file);

    // Extract duration from audio file
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDurationSeconds(Math.round(audio.duration));
      }
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => {
      console.error('Could not load audio metadata');
      URL.revokeObjectURL(audio.src);
    };
    audio.src = URL.createObjectURL(file);

    // Auto-fill title from filename if empty
    if (!title) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(baseName);
    }
  };

  const uploadAudio = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error('No audio file selected');
      if (!title.trim()) throw new Error('Title is required');

      setUploading(true);

      try {
        // Upload to storage
        const fileExt = audioFile.name.split('.').pop()?.toLowerCase() || 'm4a';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${moduleId}/${chapterId || 'general'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources-audio')
          .upload(storagePath, audioFile);

        if (uploadError) throw uploadError;

        // Insert resource record
        const { error: insertError } = await supabase.from('resources').insert({
          title: title.trim(),
          description: description.trim() || null,
          resource_type: 'audio',
          audio_storage_path: storagePath,
          duration_seconds: durationSeconds,
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
          section_id: sectionId,
        });

        if (insertError) {
          // Clean up uploaded file if insert fails
          await supabase.storage.from('resources-audio').remove([storagePath]);
          throw insertError;
        }
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-resources', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['module-resources', moduleId] });
      toast.success('Audio resource added successfully');
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error uploading audio:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload audio');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSectionId(null);
    setAudioFile(null);
    setDurationSeconds(null);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {permissionDialog}
      <Dialog open={open} onOpenChange={setOpen}>
        {showButton && (
          <DialogTrigger asChild>
            {triggerButton || (
              <Button size="sm" variant="outline" onClick={() => guard(() => setOpen(true))}>
                <Music className="w-4 h-4 mr-1" />
                Add Audio
              </Button>
            )}
          </DialogTrigger>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Add Audio Resource
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter audio title"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the audio content"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Audio File</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
                {audioFile && (
                  <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                    <p className="font-medium truncate">{audioFile.name}</p>
                    <p className="text-muted-foreground">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                      {durationSeconds && ` • ${formatDuration(durationSeconds)}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <SectionSelector
              chapterId={chapterId}
              topicId={topicId}
              value={sectionId}
              onChange={setSectionId}
            />

            <Button
              onClick={() => uploadAudio.mutate()}
              className="w-full"
              disabled={uploading || !audioFile || !title.trim()}
            >
              {uploading ? 'Uploading...' : 'Upload Audio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
