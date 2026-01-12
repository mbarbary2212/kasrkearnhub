import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X } from 'lucide-react';
import { VPCase, VPCaseFormData, VPLevel } from '@/types/virtualPatient';
import { useCreateVirtualPatientCase, useUpdateVirtualPatientCase } from '@/hooks/useVirtualPatient';
import { useModuleChapters } from '@/hooks/useChapters';
import { toast } from 'sonner';

interface VPCaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  vpCase?: VPCase | null;
  onSuccess?: (caseId: string) => void;
}

export function VPCaseFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  vpCase,
  onSuccess,
}: VPCaseFormModalProps) {
  const isEditing = !!vpCase;
  
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [level, setLevel] = useState<VPLevel>('beginner');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const { data: chapters } = useModuleChapters(moduleId);
  const createCase = useCreateVirtualPatientCase();
  const updateCase = useUpdateVirtualPatientCase();

  useEffect(() => {
    if (vpCase) {
      setTitle(vpCase.title);
      setIntroText(vpCase.intro_text);
      setSelectedChapterId(vpCase.chapter_id || '');
      setLevel(vpCase.level);
      setEstimatedMinutes(vpCase.estimated_minutes);
      setTags(vpCase.tags || []);
      setIsPublished(vpCase.is_published);
    } else {
      resetForm();
      if (chapterId) {
        setSelectedChapterId(chapterId);
      }
    }
  }, [vpCase, open, chapterId]);

  const resetForm = () => {
    setTitle('');
    setIntroText('');
    setSelectedChapterId(chapterId || '');
    setLevel('beginner');
    setEstimatedMinutes(15);
    setTags([]);
    setTagInput('');
    setIsPublished(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !introText.trim()) {
      toast.error('Please fill in title and introduction');
      return;
    }

    const formData: VPCaseFormData = {
      title: title.trim(),
      intro_text: introText.trim(),
      module_id: moduleId,
      chapter_id: selectedChapterId || undefined,
      level,
      estimated_minutes: estimatedMinutes,
      tags,
      is_published: isPublished,
    };

    try {
      if (isEditing && vpCase) {
        await updateCase.mutateAsync({ id: vpCase.id, data: formData });
        toast.success('Case updated');
        onSuccess?.(vpCase.id);
      } else {
        const result = await createCase.mutateAsync(formData);
        toast.success('Case created');
        onSuccess?.(result.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save case:', error);
      toast.error('Failed to save case');
    }
  };

  const isLoading = createCase.isPending || updateCase.isPending;
  const isValid = title.trim() && introText.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Create'} Virtual Patient Case</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-4 pb-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chest Pain in a 55-year-old Male"
                className="mt-1"
              />
            </div>

            {/* Introduction */}
            <div>
              <Label htmlFor="intro">Introduction *</Label>
              <Textarea
                id="intro"
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Set the scene for this case..."
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Chapter Selection */}
            <div>
              <Label>Chapter (optional)</Label>
              <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific chapter</SelectItem>
                  {chapters?.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      Chapter {ch.chapter_number}: {ch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div>
              <Label>Difficulty Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as VPLevel)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Time */}
            <div>
              <Label htmlFor="time">Estimated Time (minutes)</Label>
              <Input
                id="time"
                type="number"
                min={5}
                max={120}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 15)}
                className="mt-1"
              />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tag and press Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Published Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Published</Label>
                <p className="text-sm text-muted-foreground">
                  Only published cases are visible to students
                </p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Case
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
