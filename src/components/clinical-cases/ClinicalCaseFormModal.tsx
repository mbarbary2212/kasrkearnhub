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
import { Loader2, X, Sparkles, Check, HelpCircle, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClinicalCase, ClinicalCaseFormData, CaseLevel } from '@/types/clinicalCase';
import { useCreateClinicalCase, useUpdateClinicalCase } from '@/hooks/useClinicalCases';
import { useModuleChapters } from '@/hooks/useChapters';
import { toast } from 'sonner';
import { SectionSelector, SectionWarningBanner } from '@/components/sections';
import { EXAMINER_AVATARS } from '@/lib/examinerAvatars';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ClinicalCaseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  topicId?: string;
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
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [learningObjectives, setLearningObjectives] = useState('');
  const [maxTurns, setMaxTurns] = useState(10);
  const [avatarId, setAvatarId] = useState(1);

  const { data: chapters } = useModuleChapters(moduleId);
  const createCase = useCreateClinicalCase();
  const updateCase = useUpdateClinicalCase();

  useEffect(() => {
    if (clinicalCase) {
      setTitle(clinicalCase.title);
      setIntroText(clinicalCase.intro_text);
      setSelectedChapterId(clinicalCase.chapter_id || '');
      setLevel(clinicalCase.level);
      setEstimatedMinutes(clinicalCase.estimated_minutes);
      setTags(clinicalCase.tags || []);
      setIsPublished(clinicalCase.is_published);
      setSectionId(clinicalCase.section_id || null);
      setLearningObjectives(clinicalCase.learning_objectives || '');
      setMaxTurns(clinicalCase.max_turns || 10);
      setAvatarId((clinicalCase as any).avatar_id ?? 1);
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
    setSectionId(null);
    setLearningObjectives('');
    setMaxTurns(10);
    setAvatarId(1);
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

    const formData: ClinicalCaseFormData & { avatar_id?: number } = {
      title: title.trim(),
      intro_text: introText.trim(),
      module_id: moduleId,
      chapter_id: selectedChapterId || undefined,
      section_id: sectionId || undefined,
      level,
      estimated_minutes: estimatedMinutes,
      tags,
      is_published: isPublished,
      learning_objectives: learningObjectives.trim() || undefined,
      max_turns: maxTurns,
      avatar_id: avatarId,
    };

    try {
      if (isEditing && clinicalCase) {
        await updateCase.mutateAsync({ id: clinicalCase.id, data: formData as any });
        toast.success('Case updated');
        onOpenChange(false);
        onSuccess?.(clinicalCase.id);
      } else {
        const result = await createCase.mutateAsync(formData as any);
        toast.success('AI Case created! Students can now practice with this case.');
        onOpenChange(false);
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
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Edit' : 'Create'} AI Case</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 pr-4 pb-4">
            <SectionWarningBanner chapterId={selectedChapterId || chapterId} />

            {/* AI Case Info */}
            <Alert className="bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <AlertDescription className="text-sm">
                This is an <strong>AI-driven case</strong>. The AI examiner will dynamically generate questions based on your introduction and learning objectives. No manual stages needed.
              </AlertDescription>
            </Alert>

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
              <Label htmlFor="intro">Clinical Scenario *</Label>
              <Textarea
                id="intro"
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Set the scene for this case — patient presentation, chief complaint, relevant history..."
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Learning Objectives */}
            <div>
              <Label htmlFor="objectives">Learning Objectives</Label>
              <Textarea
                id="objectives"
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="e.g., Assess clinical reasoning for acute chest pain, history-taking skills, ECG interpretation, initial management..."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                These guide the AI examiner's focus during the case simulation.
              </p>
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

            {/* Section Selector */}
            <SectionSelector
              chapterId={selectedChapterId || chapterId}
              value={sectionId}
              onChange={setSectionId}
            />

            <div className="grid grid-cols-2 gap-4">
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

              {/* Max Turns */}
              <div>
                <Label htmlFor="maxTurns">Max Turns</Label>
                <Input
                  id="maxTurns"
                  type="number"
                  min={5}
                  max={20}
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(parseInt(e.target.value) || 10)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Examiner Avatar */}
            <div>
              <Label>Clinical Examiner Avatar</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                {EXAMINER_AVATARS.map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => setAvatarId(exam.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
                      avatarId === exam.id
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
                        : 'border-transparent hover:border-muted-foreground/20'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-16 h-16 border border-background shadow-sm">
                        <AvatarImage src={exam.image} alt={exam.name} />
                        <AvatarFallback>{exam.name.charAt(4)}</AvatarFallback>
                      </Avatar>
                      {avatarId === exam.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-center">{exam.name}</span>
                  </button>
                ))}
              </div>
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
              <Switch 
                checked={isPublished} 
                onCheckedChange={setIsPublished}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Case' : 'Create AI Case'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
