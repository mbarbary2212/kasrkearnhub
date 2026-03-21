import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  StudyResourceType,
  StudyResource,
  ResourceContent,
  FlashcardContent,
  TableContent,
  AlgorithmContent,
  ExamTipContent,
  KeyImageContent,
  MindMapContent,
  ClinicalCaseWorkedContent,
  GuidedExplanationContent,
  useCreateStudyResource,
  useUpdateStudyResource,
  useChapterStudyResources,
  useTopicStudyResources,
} from '@/hooks/useStudyResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';
import { MindMapForm } from './MindMapForm';
import { InfographicForm } from './InfographicForm';
import { WorkedCaseForm } from './WorkedCaseForm';
import { GuidedExplanationForm } from './GuidedExplanationForm';
import { SectionSelector, SectionWarningBanner } from '@/components/sections';

interface StudyResourceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  moduleId: string;
  resourceType: StudyResourceType;
  resource?: StudyResource | null;
}

const TYPE_LABELS: Record<StudyResourceType, string> = {
  flashcard: 'Flashcard',
  table: 'Key Table',
  algorithm: 'Pathway',
  exam_tip: 'Exam Tip',
  key_image: 'Key Image',
  mind_map: 'Mind Map',
  infographic: 'Infographic',
  clinical_case_worked: 'Worked Case',
  guided_explanation: 'Guided Explanation',
};

export function StudyResourceFormModal({
  open,
  onOpenChange,
  chapterId,
  topicId,
  moduleId,
  resourceType,
  resource,
}: StudyResourceFormModalProps) {
  const containerId = chapterId || topicId;
  const { isModuleAdmin, isTopicAdmin } = useAuthContext();
  const createResource = useCreateStudyResource();
  const updateResource = useUpdateStudyResource();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<ResourceContent>(getDefaultContent(resourceType));
  const [uploading, setUploading] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const isEditing = !!resource;

  // Fetch existing resources for duplicate detection
  const { data: chapterResources } = useChapterStudyResources(chapterId);
  const { data: topicResources } = useTopicStudyResources(topicId);
  const existingResources = (chapterResources || topicResources || []).filter(
    r => r.resource_type === resourceType && !r.is_deleted
  );

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setContent(resource.content);
      setSectionId((resource as any).section_id || null);
    } else {
      setTitle('');
      setContent(getDefaultContent(resourceType));
      setSectionId(null);
    }
  }, [resource, resourceType, open]);

  const checkForDuplicates = (): string | null => {
    if (isEditing) return null;
    const normalizedTitle = title.trim().toLowerCase();
    const match = existingResources.find(r => r.title.trim().toLowerCase() === normalizedTitle);
    if (match) return `A resource with the title "${match.title}" already exists.`;
    return null;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // Check for duplicates before creating
    if (!isEditing) {
      const warning = checkForDuplicates();
      if (warning) {
        setDuplicateWarning(warning);
        return;
      }
    }

    await performSave();
  };

  const performSave = async () => {
    setDuplicateWarning(null);
    try {
      if (isEditing) {
        await updateResource.mutateAsync({
          id: resource.id,
          title,
          content,
          section_id: sectionId,
        });
        toast.success('Resource updated');
      } else {
        await createResource.mutateAsync({
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
          resource_type: resourceType,
          title,
          content,
          folder: null,
          section_id: sectionId,
        });
        toast.success('Resource created');
      }
      onOpenChange(false);
    } catch (error) {
      const message = getPermissionErrorMessage(error, {
        action: isEditing ? 'edit' : 'add',
        contentType: 'study_resource',
        isModuleAdmin,
        isTopicAdmin,
      });
      toast.error(message);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${moduleId}/${containerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('study-resources')
        .upload(filePath, file, { contentType: file.type || undefined });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('study-resources')
        .getPublicUrl(filePath);

      setContent((prev) => ({
        ...(prev as KeyImageContent),
        imageUrl: publicUrl,
      }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit' : 'Add'} {TYPE_LABELS[resourceType]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <SectionWarningBanner chapterId={chapterId} topicId={topicId} />
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${TYPE_LABELS[resourceType].toLowerCase()} title`}
            />
          </div>

          <SectionSelector
            chapterId={chapterId}
            topicId={topicId}
            value={sectionId}
            onChange={setSectionId}
          />

          {resourceType === 'flashcard' && (
            <FlashcardForm
              content={content as FlashcardContent}
              onChange={(c) => setContent(c)}
            />
          )}

          {resourceType === 'table' && (
            <TableForm
              content={content as TableContent}
              onChange={(c) => setContent(c)}
            />
          )}

          {resourceType === 'algorithm' && (
            <AlgorithmForm
              content={content as AlgorithmContent}
              onChange={(c) => setContent(c)}
            />
          )}

          {resourceType === 'exam_tip' && (
            <ExamTipForm
              content={content as ExamTipContent}
              onChange={(c) => setContent(c)}
            />
          )}

          {resourceType === 'key_image' && (
            <KeyImageForm
              content={content as KeyImageContent}
              onChange={(c) => setContent(c)}
              onUpload={handleImageUpload}
              uploading={uploading}
            />
          )}

          {resourceType === 'mind_map' && (
            <MindMapForm
              content={content as MindMapContent}
              onChange={(c) => setContent(c)}
              onUpload={handleImageUpload}
              uploading={uploading}
            />
          )}

          {resourceType === 'infographic' && (
            <InfographicForm
              content={content as import('@/hooks/useStudyResources').InfographicContent}
              onChange={(c) => setContent(c)}
              onUpload={handleImageUpload}
              uploading={uploading}
            />
          )}

          {resourceType === 'clinical_case_worked' && (
            <WorkedCaseForm
              content={content as ClinicalCaseWorkedContent}
              onChange={(c) => setContent(c)}
            />
          )}

          {resourceType === 'guided_explanation' && (
            <GuidedExplanationForm
              content={content as GuidedExplanationContent}
              onChange={(c) => setContent(c)}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createResource.isPending || updateResource.isPending}
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!duplicateWarning} onOpenChange={() => setDuplicateWarning(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Possible Duplicate
          </AlertDialogTitle>
          <AlertDialogDescription>
            {duplicateWarning} Do you want to upload anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={performSave}>Upload Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function getDefaultContent(type: StudyResourceType): ResourceContent {
  switch (type) {
    case 'flashcard':
      return { front: '', back: '' };
    case 'table':
      return { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
    case 'algorithm':
      return { steps: [{ title: '', description: '' }] };
    case 'exam_tip':
      return { tips: [''] };
    case 'key_image':
      return { imageUrl: '', caption: '', labels: [] };
    case 'mind_map':
      return { imageUrl: '', description: '', central_concept: '', nodes: [] };
    case 'infographic':
      return { fileUrl: '', description: '' };
    case 'clinical_case_worked':
      return {
        history: '',
        clinical_examination: '',
        provisional_diagnosis: '',
        differential_diagnosis: [''],
        investigations: [{ test: '', justification: '' }],
        final_diagnosis: '',
        management_plan: '',
        key_learning_points: [''],
      };
    case 'guided_explanation':
      return {
        topic: '',
        introduction: '',
        guided_questions: [{ question: '', hint: '', reveal_answer: '' }],
        summary: '',
        key_takeaways: [''],
      };
  }
}

function FlashcardForm({
  content,
  onChange,
}: {
  content: FlashcardContent;
  onChange: (c: FlashcardContent) => void;
}) {
  const isCloze = content.card_type === 'cloze';

  return (
    <div className="space-y-4">
      {/* Card Type Toggle */}
      <div className="space-y-2">
        <Label>Card Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isCloze ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ ...content, card_type: 'normal', cloze_text: undefined, extra: undefined })}
          >
            Normal
          </Button>
          <Button
            type="button"
            variant={isCloze ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ ...content, card_type: 'cloze', cloze_text: content.cloze_text || '' })}
          >
            Cloze
          </Button>
        </div>
      </div>

      {isCloze ? (
        <>
          <div className="space-y-2">
            <Label>Cloze Text</Label>
            <Textarea
              value={content.cloze_text || ''}
              onChange={(e) => onChange({ ...content, cloze_text: e.target.value })}
              placeholder='e.g. Second degree burns involve the epidermis and a portion of the {{c1::dermis}}.'
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Wrap answers in <code className="bg-muted px-1 rounded">{'{{c1::answer}}'}</code> syntax
            </p>
          </div>
          <div className="space-y-2">
            <Label>Extra / Clinical Note (Optional)</Label>
            <Textarea
              value={content.extra || ''}
              onChange={(e) => onChange({ ...content, extra: e.target.value })}
              placeholder="Optional clinical context or explanation"
              rows={2}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Front (Question)</Label>
            <Textarea
              value={content.front}
              onChange={(e) => onChange({ ...content, front: e.target.value })}
              placeholder="Enter the question or term"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Back (Answer)</Label>
            <Textarea
              value={content.back}
              onChange={(e) => onChange({ ...content, back: e.target.value })}
              placeholder="Enter the answer or definition"
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}

function TableForm({
  content,
  onChange,
}: {
  content: TableContent;
  onChange: (c: TableContent) => void;
}) {
  const addColumn = () => {
    const newHeaders = [...content.headers, `Column ${content.headers.length + 1}`];
    const newRows = content.rows.map((row) => [...row, '']);
    onChange({ headers: newHeaders, rows: newRows });
  };

  const addRow = () => {
    const newRow = content.headers.map(() => '');
    onChange({ ...content, rows: [...content.rows, newRow] });
  };

  const removeColumn = (index: number) => {
    if (content.headers.length <= 1) return;
    const newHeaders = content.headers.filter((_, i) => i !== index);
    const newRows = content.rows.map((row) => row.filter((_, i) => i !== index));
    onChange({ headers: newHeaders, rows: newRows });
  };

  const removeRow = (index: number) => {
    if (content.rows.length <= 1) return;
    onChange({ ...content, rows: content.rows.filter((_, i) => i !== index) });
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...content.headers];
    newHeaders[index] = value;
    onChange({ ...content, headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...content.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    onChange({ ...content, rows: newRows });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {content.headers.map((header, i) => (
                <th key={i} className="p-1">
                  <div className="flex gap-1">
                    <Input
                      value={header}
                      onChange={(e) => updateHeader(i, e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeColumn(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
              ))}
              <th className="p-1 w-10">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={addColumn}>
                  <Plus className="w-3 h-3" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-1">
                    <Input
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="text-xs"
                    />
                  </td>
                ))}
                <td className="p-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => removeRow(rowIndex)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="outline" onClick={addRow}>
        <Plus className="w-3 h-3 mr-1" />
        Add Row
      </Button>
    </div>
  );
}

function AlgorithmForm({
  content,
  onChange,
}: {
  content: AlgorithmContent;
  onChange: (c: AlgorithmContent) => void;
}) {
  const addStep = () => {
    onChange({ steps: [...content.steps, { title: '', description: '' }] });
  };

  const removeStep = (index: number) => {
    if (content.steps.length <= 1) return;
    onChange({ steps: content.steps.filter((_, i) => i !== index) });
  };

  const updateStep = (index: number, field: 'title' | 'description', value: string) => {
    const newSteps = [...content.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange({ steps: newSteps });
  };

  return (
    <div className="space-y-4">
      {content.steps.map((step, index) => (
        <div key={index} className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-2">
            {index + 1}
          </div>
          <div className="flex-1 space-y-2">
            <Input
              value={step.title}
              onChange={(e) => updateStep(index, 'title', e.target.value)}
              placeholder="Step title"
            />
            <Textarea
              value={step.description}
              onChange={(e) => updateStep(index, 'description', e.target.value)}
              placeholder="Step description (optional)"
              rows={2}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="mt-2"
            onClick={() => removeStep(index)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addStep}>
        <Plus className="w-3 h-3 mr-1" />
        Add Step
      </Button>
    </div>
  );
}

function ExamTipForm({
  content,
  onChange,
}: {
  content: ExamTipContent;
  onChange: (c: ExamTipContent) => void;
}) {
  const addTip = () => {
    onChange({ tips: [...content.tips, ''] });
  };

  const removeTip = (index: number) => {
    if (content.tips.length <= 1) return;
    onChange({ tips: content.tips.filter((_, i) => i !== index) });
  };

  const updateTip = (index: number, value: string) => {
    const newTips = [...content.tips];
    newTips[index] = value;
    onChange({ tips: newTips });
  };

  return (
    <div className="space-y-3">
      {content.tips.map((tip, index) => (
        <div key={index} className="flex gap-2">
          <span className="text-primary mt-2">•</span>
          <Input
            value={tip}
            onChange={(e) => updateTip(index, e.target.value)}
            placeholder="Enter tip"
            className="flex-1"
          />
          <Button size="icon" variant="ghost" onClick={() => removeTip(index)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addTip}>
        <Plus className="w-3 h-3 mr-1" />
        Add Tip
      </Button>
    </div>
  );
}

function KeyImageForm({
  content,
  onChange,
  onUpload,
  uploading,
}: {
  content: KeyImageContent;
  onChange: (c: KeyImageContent) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const addLabel = () => {
    onChange({ ...content, labels: [...(content.labels || []), ''] });
  };

  const removeLabel = (index: number) => {
    onChange({ ...content, labels: content.labels?.filter((_, i) => i !== index) });
  };

  const updateLabel = (index: number, value: string) => {
    const newLabels = [...(content.labels || [])];
    newLabels[index] = value;
    onChange({ ...content, labels: newLabels });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image</Label>
        {content.imageUrl ? (
          <div className="space-y-2">
            <img
              src={content.imageUrl}
              alt="Preview"
              className="max-h-[200px] rounded-lg object-contain bg-muted"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ ...content, imageUrl: '' })}
            >
              Remove Image
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Upload an image</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="image-upload"
            />
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <label htmlFor="image-upload" className="cursor-pointer">
                {uploading ? 'Uploading...' : 'Choose File'}
              </label>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Or use external URL</Label>
        <Input
          value={content.imageUrl}
          onChange={(e) => onChange({ ...content, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Caption</Label>
        <Input
          value={content.caption}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
          placeholder="Enter image caption"
        />
      </div>

      <div className="space-y-2">
        <Label>Labels (optional)</Label>
        {content.labels?.map((label, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => updateLabel(index, e.target.value)}
              placeholder="Enter label"
              className="flex-1"
            />
            <Button size="icon" variant="ghost" onClick={() => removeLabel(index)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addLabel}>
          <Plus className="w-3 h-3 mr-1" />
          Add Label
        </Button>
      </div>
    </div>
  );
}
