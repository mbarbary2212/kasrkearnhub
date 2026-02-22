import { useState, useEffect } from 'react';
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
import { Loader2, X, AlertCircle } from 'lucide-react';
import { ClinicalCase, ClinicalCaseFormData, CaseLevel } from '@/types/clinicalCase';
import { useUpdateClinicalCase } from '@/hooks/useClinicalCases';
import { useModuleChapters } from '@/hooks/useChapters';
import { toast } from 'sonner';
import { SectionSelector } from '@/components/sections';

const getMinStagesToPublish = (caseMode: string | undefined) => {
  return caseMode === 'read_case' ? 1 : 3;
};

interface CaseBuilderDetailsTabProps {
  clinicalCase: ClinicalCase;
  moduleId: string;
}

export function CaseBuilderDetailsTab({ clinicalCase, moduleId }: CaseBuilderDetailsTabProps) {
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [level, setLevel] = useState<CaseLevel>('beginner');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: chapters } = useModuleChapters(moduleId);
  const updateCase = useUpdateClinicalCase();

  const caseMode = clinicalCase.case_mode;
  const currentStageCount = clinicalCase.stage_count || 0;
  const minStages = getMinStagesToPublish(caseMode);
  const canPublish = currentStageCount >= minStages;

  useEffect(() => {
    setTitle(clinicalCase.title);
    setIntroText(clinicalCase.intro_text);
    setSelectedChapterId(clinicalCase.chapter_id || '');
    setLevel(clinicalCase.level);
    setEstimatedMinutes(clinicalCase.estimated_minutes);
    setTags(clinicalCase.tags || []);
    setIsPublished(clinicalCase.is_published);
    setSectionId(clinicalCase.section_id || null);
    setIsDirty(false);
  }, [clinicalCase]);

  const markDirty = () => setIsDirty(true);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      markDirty();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
    markDirty();
  };

  const handleSave = async () => {
    if (!title.trim() || !introText.trim()) {
      toast.error('Please fill in title and introduction');
      return;
    }

    const isAttemptingToPublish = isPublished && !clinicalCase.is_published;
    if (isAttemptingToPublish && !canPublish) {
      toast.error(`Add at least ${minStages} stages before publishing`);
      return;
    }

    const formData: ClinicalCaseFormData = {
      title: title.trim(),
      intro_text: introText.trim(),
      module_id: moduleId,
      chapter_id: selectedChapterId || undefined,
      section_id: sectionId || undefined,
      case_mode: clinicalCase.case_mode,
      level,
      estimated_minutes: estimatedMinutes,
      tags,
      is_published: isPublished,
    };

    try {
      await updateCase.mutateAsync({ id: clinicalCase.id, data: formData });
      toast.success('Case details saved');
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save case:', error);
      toast.error('Failed to save case');
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
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
          onChange={(e) => { setIntroText(e.target.value); markDirty(); }}
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
          onValueChange={(v) => { setSelectedChapterId(v === "none" ? "" : v); markDirty(); }}
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
        chapterId={selectedChapterId || clinicalCase.chapter_id || undefined}
        value={sectionId}
        onChange={(v) => { setSectionId(v); markDirty(); }}
      />

      {/* Level */}
      <div>
        <Label>Difficulty Level</Label>
        <Select value={level} onValueChange={(v) => { setLevel(v as CaseLevel); markDirty(); }}>
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
          onChange={(e) => { setEstimatedMinutes(parseInt(e.target.value) || 15); markDirty(); }}
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch 
                  checked={isPublished} 
                  onCheckedChange={async (checked) => { 
                    if (checked && !canPublish) {
                      toast.error(`Add at least ${minStages} stages before publishing`);
                      return;
                    }
                    setIsPublished(checked);
                    try {
                      await updateCase.mutateAsync({ 
                        id: clinicalCase.id, 
                        data: { is_published: checked } 
                      });
                      toast.success(checked ? 'Case published!' : 'Case unpublished');
                    } catch {
                      setIsPublished(!checked); // revert on failure
                      toast.error('Failed to update publish status');
                    }
                  }}
                  disabled={(!canPublish && !isPublished) || updateCase.isPending}
                />
              </div>
            </TooltipTrigger>
            {!canPublish && (
              <TooltipContent>
                <p>Add at least {minStages} stages before publishing</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {!canPublish && !clinicalCase.is_published && (
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            This case has {currentStageCount} stage{currentStageCount !== 1 ? 's' : ''}. 
            Add at least {minStages} stages before publishing.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      {isDirty && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateCase.isPending || !title.trim() || !introText.trim()}>
            {updateCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Details
          </Button>
        </div>
      )}
    </div>
  );
}
