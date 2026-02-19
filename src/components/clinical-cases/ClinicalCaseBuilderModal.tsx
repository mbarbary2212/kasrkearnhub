import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  GripVertical, 
  Edit2, 
  Trash2, 
  Loader2, 
  HelpCircle,
  CheckSquare,
  MessageSquare,
  FileText,
  Layers,
  X,
  AlertCircle,
} from 'lucide-react';
import { ClinicalCase, ClinicalCaseStage, CaseStageType, CaseLevel } from '@/types/clinicalCase';
import { 
  useClinicalCase, 
  useUpdateClinicalCase,
  useDeleteClinicalCaseStage,
  useReorderClinicalCaseStages,
} from '@/hooks/useClinicalCases';
import { useModuleChapters } from '@/hooks/useChapters';
import { ClinicalCaseStageFormModal } from './ClinicalCaseStageFormModal';
import { ClinicalCaseQuickBuildModal } from './ClinicalCaseQuickBuildModal';
import { ConceptSelect } from '@/components/content/ConceptSelect';
import { SectionSelector } from '@/components/sections';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface ClinicalCaseBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  moduleId: string;
}

const stageTypeIcons: Record<CaseStageType, typeof HelpCircle> = {
  mcq: HelpCircle,
  multi_select: CheckSquare,
  short_answer: MessageSquare,
  read_only: FileText,
};

const stageTypeLabels: Record<CaseStageType, string> = {
  mcq: 'Single Choice',
  multi_select: 'Multi-select',
  short_answer: 'Short Answer',
  read_only: 'Read Only',
};

const getMinStagesToPublish = (caseMode: string | undefined) => {
  return caseMode === 'read_case' ? 1 : 3;
};

function SortableStageItem({
  stage,
  onEdit,
  onDelete,
}: {
  stage: ClinicalCaseStage;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = stageTypeIcons[stage.stage_type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <Badge variant="outline" className="shrink-0">
        Stage {stage.stage_order}
      </Badge>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {stageTypeLabels[stage.stage_type]}
          </span>
        </div>
        <p className="text-sm truncate">{stage.prompt}</p>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function ClinicalCaseBuilderModal({
  open,
  onOpenChange,
  caseId,
  moduleId,
}: ClinicalCaseBuilderModalProps) {
  const { data: clinicalCase, isLoading } = useClinicalCase(caseId);
  const updateCase = useUpdateClinicalCase();
  const deleteStage = useDeleteClinicalCaseStage();
  const reorderStages = useReorderClinicalCaseStages();
  const { data: chapters } = useModuleChapters(moduleId);

  // Details form state
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [level, setLevel] = useState<CaseLevel>('beginner');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [detailsDirty, setDetailsDirty] = useState(false);

  // Stage modals
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [quickBuildOpen, setQuickBuildOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ClinicalCaseStage | null>(null);
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<ClinicalCaseStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync form state from fetched case data
  useEffect(() => {
    if (clinicalCase) {
      setTitle(clinicalCase.title);
      setIntroText(clinicalCase.intro_text);
      setSelectedChapterId(clinicalCase.chapter_id || '');
      setSectionId(clinicalCase.section_id || null);
      setConceptId(clinicalCase.concept_id || null);
      setLevel(clinicalCase.level);
      setEstimatedMinutes(clinicalCase.estimated_minutes);
      setTags(clinicalCase.tags || []);
      setIsPublished(clinicalCase.is_published);
      setDetailsDirty(false);
    }
  }, [clinicalCase]);

  // Track dirty state
  const markDirty = () => { if (!detailsDirty) setDetailsDirty(true); };

  const caseMode = clinicalCase?.case_mode;
  const stages = clinicalCase?.stages || [];
  const currentStageCount = stages.length;
  const minStages = getMinStagesToPublish(caseMode);
  const canPublish = currentStageCount >= minStages;
  const nextStageOrder = stages.length + 1;

  // Tag helpers
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
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
  };

  const handlePublishedChange = (checked: boolean) => {
    if (checked && !canPublish) {
      toast.warning(`This case needs at least ${minStages} stages to be visible to students`);
    }
    setIsPublished(checked);
    markDirty();
  };

  const handleSaveDetails = async () => {
    if (!title.trim() || !introText.trim()) {
      toast.error('Please fill in title and introduction');
      return;
    }
    const isAttemptingToPublish = isPublished && !clinicalCase?.is_published;
    if (isAttemptingToPublish && !canPublish) {
      toast.error(`Add at least ${minStages} stages before publishing`);
      return;
    }

    try {
      await updateCase.mutateAsync({
        id: caseId,
        data: {
          title: title.trim(),
          intro_text: introText.trim(),
          module_id: moduleId,
          chapter_id: selectedChapterId || undefined,
          section_id: sectionId || undefined,
          concept_id: conceptId || undefined,
          case_mode: caseMode ?? 'practice_case',
          level,
          estimated_minutes: estimatedMinutes,
          tags,
          is_published: isPublished,
        },
      });
      toast.success('Case details saved');
      setDetailsDirty(false);
    } catch (error) {
      console.error('Failed to save case:', error);
      toast.error('Failed to save case');
    }
  };

  // Stage drag & drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(stages, oldIndex, newIndex);
      try {
        await reorderStages.mutateAsync({
          caseId,
          stageIds: newOrder.map(s => s.id),
        });
        toast.success('Stages reordered');
      } catch (error) {
        console.error('Failed to reorder stages:', error);
        toast.error('Failed to reorder stages');
      }
    }
  };

  const handleAddStage = () => { setEditingStage(null); setStageFormOpen(true); };
  const handleEditStage = (stage: ClinicalCaseStage) => { setEditingStage(stage); setStageFormOpen(true); };

  const handleDeleteStage = async () => {
    if (!deleteConfirmStage) return;
    try {
      await deleteStage.mutateAsync({ id: deleteConfirmStage.id, caseId });
      toast.success('Stage deleted');
      setDeleteConfirmStage(null);
    } catch (error) {
      console.error('Failed to delete stage:', error);
      toast.error('Failed to delete stage');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2">
                Case Builder
                {clinicalCase && !clinicalCase.is_published && (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </DialogTitle>
              {clinicalCase && (
                <Badge variant="outline" className="ml-2">
                  {stages.length} stage{stages.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !clinicalCase ? (
            <div className="text-center py-12">
              <p className="text-destructive font-medium mb-2">Failed to load case</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col">
              <TabsList className="flex-shrink-0 w-full justify-start">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="stages" className="flex items-center gap-1.5">
                  Stages
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {stages.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* ====== DETAILS TAB ====== */}
              <TabsContent value="details" className="flex-1 min-h-0 mt-0">
                <div className="flex-1 min-h-0 overflow-y-auto h-full">
                  <div className="space-y-4 pr-2 pb-4 pt-4">
                    {/* Title */}
                    <div>
                      <Label htmlFor="case-title">Title *</Label>
                      <Input
                        id="case-title"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                        placeholder="e.g., Chest Pain in a 55-year-old Male"
                        className="mt-1"
                      />
                    </div>

                    {/* Introduction */}
                    <div>
                      <Label htmlFor="case-intro">Introduction *</Label>
                      <Textarea
                        id="case-intro"
                        value={introText}
                        onChange={(e) => { setIntroText(e.target.value); markDirty(); }}
                        placeholder="Set the scene for this case..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    {/* Chapter & Difficulty row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                Ch {ch.chapter_number}: {ch.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
                    </div>

                    {/* Section & Time row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SectionSelector
                        chapterId={selectedChapterId || undefined}
                        value={sectionId}
                        onChange={(v) => { setSectionId(v); markDirty(); }}
                      />

                      <div>
                        <Label htmlFor="case-time">Estimated Time (min)</Label>
                        <Input
                          id="case-time"
                          type="number"
                          min={5}
                          max={120}
                          value={estimatedMinutes}
                          onChange={(e) => { setEstimatedMinutes(parseInt(e.target.value) || 15); markDirty(); }}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Concept */}
                    <ConceptSelect
                      moduleId={moduleId}
                      chapterId={selectedChapterId || undefined}
                      sectionId={sectionId}
                      value={conceptId}
                      onChange={(v) => { setConceptId(v); markDirty(); }}
                    />

                    {/* Search Tags */}
                    <div>
                      <Label>Search Tags (optional)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
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

                    <Separator />

                    {/* Published Toggle */}
                    <div className="flex items-center justify-between py-1">
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
                  </div>
                </div>

                {/* Save button for details */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={handleSaveDetails}
                    disabled={!title.trim() || !introText.trim() || updateCase.isPending || !detailsDirty}
                  >
                    {updateCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </TabsContent>

              {/* ====== STAGES TAB ====== */}
              <TabsContent value="stages" className="flex-1 min-h-0 mt-0 flex flex-col">
                <div className="flex items-center justify-between py-3 flex-shrink-0">
                  <h4 className="font-medium">Stages ({stages.length})</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuickBuildOpen(true)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Quick Build
                    </Button>
                    <Button size="sm" onClick={handleAddStage}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stage
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {stages.length === 0 ? (
                    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                      <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
                          <Layers className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Add Stage 1</CardTitle>
                        <CardDescription className="text-base">
                          Stages are the steps of the scenario: history, exam, investigations, diagnosis, management.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <Button onClick={handleAddStage} className="w-full">
                          <Plus className="w-4 h-4 mr-1" />
                          Add First Stage
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setQuickBuildOpen(true)}
                          className="w-full"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Quick Build (Paste Template)
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={stages.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 pb-4">
                          {stages.map((stage) => (
                            <SortableStageItem
                              key={stage.id}
                              stage={stage}
                              onEdit={() => handleEditStage(stage)}
                              onDelete={() => setDeleteConfirmStage(stage)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Stage Form Modal */}
      <ClinicalCaseStageFormModal
        open={stageFormOpen}
        onOpenChange={setStageFormOpen}
        caseId={caseId}
        stageOrder={editingStage?.stage_order || nextStageOrder}
        stage={editingStage}
      />

      {/* Quick Build Modal */}
      <ClinicalCaseQuickBuildModal
        open={quickBuildOpen}
        onOpenChange={setQuickBuildOpen}
        caseId={caseId}
        currentStageCount={stages.length}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmStage} onOpenChange={() => setDeleteConfirmStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Stage {deleteConfirmStage?.stage_order}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStage} className="bg-destructive text-destructive-foreground">
              {deleteStage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
