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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Info, AlertCircle } from 'lucide-react';
import { ClinicalCase, ClinicalCaseFormData, CaseLevel } from '@/types/clinicalCase';
import { useCreateClinicalCase, useUpdateClinicalCase } from '@/hooks/useClinicalCases';
import { useModuleChapters } from '@/hooks/useChapters';
import { toast } from 'sonner';

const MIN_STAGES_TO_PUBLISH = 3;

interface ClinicalCaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  clinicalCase?: ClinicalCase | null;
  onSuccess?: (caseId: string) => void;
}

export function ClinicalCaseFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  clinicalCase,
  onSuccess,
}: ClinicalCaseFormModalProps) {
  const isEditing = !!clinicalCase;
  
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [level, setLevel] = useState<CaseLevel>('beginner');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const { data: chapters } = useModuleChapters(moduleId);
  const createCase = useCreateClinicalCase();
  const updateCase = useUpdateClinicalCase();

  // Check if case can be published (editing mode only)
  const currentStageCount = clinicalCase?.stage_count || 0;
  const canPublish = currentStageCount >= MIN_STAGES_TO_PUBLISH;

  useEffect(() => {
    if (clinicalCase) {
      setTitle(clinicalCase.title);
      setIntroText(clinicalCase.intro_text);
      setSelectedChapterId(clinicalCase.chapter_id || '');
      setLevel(clinicalCase.level);
      setEstimatedMinutes(clinicalCase.estimated_minutes);
      setTags(clinicalCase.tags || []);
      setIsPublished(clinicalCase.is_published);
    } else {
      resetForm();
      if (chapterId) {
        setSelectedChapterId(chapterId);
      }
    }
  }, [clinicalCase, open, chapterId]);

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

  const handlePublishedChange = (checked: boolean) => {
    if (checked && isEditing && !canPublish) {
      toast.error(`Add at least ${MIN_STAGES_TO_PUBLISH} stages before publishing`);
      return;
    }
    setIsPublished(checked);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !introText.trim()) {
      toast.error('Please fill in title and introduction');
      return;
    }

    // Prevent publishing if not enough stages
    if (isPublished && isEditing && !canPublish) {
      toast.error(`Add at least ${MIN_STAGES_TO_PUBLISH} stages before publishing`);
      return;
    }

    const formData: ClinicalCaseFormData = {
      title: title.trim(),
      intro_text: introText.trim(),
      module_id: moduleId,
      chapter_id: selectedChapterId || undefined,
      case_mode: 'practice_case',
      level,
      estimated_minutes: estimatedMinutes,
      tags,
      is_published: isEditing ? isPublished : false, // New cases always start unpublished
    };

    try {
      if (isEditing && clinicalCase) {
        await updateCase.mutateAsync({ id: clinicalCase.id, data: formData });
        toast.success('Case updated');
        onOpenChange(false);
        onSuccess?.(clinicalCase.id);
      } else {
        const result = await createCase.mutateAsync(formData);
        toast.success('Case created! Now add stages to build your case.');
        onOpenChange(false);
        // Auto-open builder after creation
        onSuccess?.(result.id);
      }
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
            {/* Step 1 Helper for new cases */}
            {!isEditing && (
              <Alert className="bg-primary/5 border-primary/20">
                <Info className="w-4 h-4 text-primary" />
                <AlertDescription className="text-sm">
                  <strong>Step 1 of 2:</strong> This creates the case header only. 
                  Next, you will add stages (questions) to build the scenario.
                </AlertDescription>
              </Alert>
            )}

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
              <Select 
                value={selectedChapterId || "none"} 
                onValueChange={(v) => setSelectedChapterId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific chapter</SelectItem>
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
              <Select value={level} onValueChange={(v) => setLevel(v as CaseLevel)}>
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

            {/* Published Toggle - Only show in edit mode */}
            {isEditing && (
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Published</Label>
                  <p className="text-sm text-muted-foreground">
                    Only published cases are visible to students
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch 
                          checked={isPublished} 
                          onCheckedChange={handlePublishedChange}
                          disabled={!canPublish && !isPublished}
                        />
                      </div>
                    </TooltipTrigger>
                    {!canPublish && (
                      <TooltipContent>
                        <p>Add at least {MIN_STAGES_TO_PUBLISH} stages before publishing</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Warning if trying to publish without enough stages */}
            {isEditing && !canPublish && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  This case has {currentStageCount} stage{currentStageCount !== 1 ? 's' : ''}. 
                  Add at least {MIN_STAGES_TO_PUBLISH} stages before publishing.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Case' : 'Create Case & Add Stages →'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
