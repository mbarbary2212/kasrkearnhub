import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Plus, 
  GripVertical, 
  Edit2, 
  Trash2, 
  Loader2, 
  HelpCircle,
  CheckSquare,
  MessageSquare,
  Settings,
  FileText,
  Layers,
  X,
} from 'lucide-react';
import { ClinicalCase, ClinicalCaseStage, CaseStageType } from '@/types/clinicalCase';
import { 
  useClinicalCase, 
  useDeleteClinicalCaseStage,
  useReorderClinicalCaseStages,
} from '@/hooks/useClinicalCases';
import { ClinicalCaseFormModal } from './ClinicalCaseFormModal';
import { ClinicalCaseStageFormModal } from './ClinicalCaseStageFormModal';
import { ClinicalCaseQuickBuildModal } from './ClinicalCaseQuickBuildModal';
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
  const deleteStage = useDeleteClinicalCaseStage();
  const reorderStages = useReorderClinicalCaseStages();

  const [caseFormOpen, setCaseFormOpen] = useState(false);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !clinicalCase?.stages) return;

    const oldIndex = clinicalCase.stages.findIndex(s => s.id === active.id);
    const newIndex = clinicalCase.stages.findIndex(s => s.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(clinicalCase.stages, oldIndex, newIndex);
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

  const handleAddStage = () => {
    setEditingStage(null);
    setStageFormOpen(true);
  };

  const handleEditStage = (stage: ClinicalCaseStage) => {
    setEditingStage(stage);
    setStageFormOpen(true);
  };

  const handleDeleteStage = async () => {
    if (!deleteConfirmStage) return;
    try {
      await deleteStage.mutateAsync({ id: deleteConfirmStage.id, caseId });
      toast.success('Stage deleted');
      setDeleteConfirmStage(null);
      // Mutations now handle refetch automatically
    } catch (error) {
      console.error('Failed to delete stage:', error);
      toast.error('Failed to delete stage');
    }
  };

  const handleSkipForNow = () => {
    onOpenChange(false);
  };

  const stages = clinicalCase?.stages || [];
  const nextStageOrder = stages.length + 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8">
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
            {clinicalCase && (
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
            )}
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !clinicalCase ? (
            <div className="text-center py-12">
              <p className="text-destructive font-medium mb-2">Failed to load case</p>
              <p className="text-muted-foreground text-sm">Case ID: {caseId}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 pr-4 pb-4">
                {/* Case Info Section */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{clinicalCase.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {clinicalCase.level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ~{clinicalCase.estimated_minutes} min
                        </span>
                        {clinicalCase.chapter && (
                          <span className="text-sm text-muted-foreground">
                            • Chapter {clinicalCase.chapter.chapter_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCaseFormOpen(true)}>
                      <Settings className="w-4 h-4 mr-1" />
                      Edit Details
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {clinicalCase.intro_text}
                  </p>
                  {clinicalCase.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {clinicalCase.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Stages Section */}
                <div>
                  <h4 className="font-medium mb-4">
                    Stages ({stages.length})
                  </h4>

                  {stages.length === 0 ? (
                    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                      <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
                          <Layers className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Now Add Stage 1</CardTitle>
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
                        <div className="space-y-2">
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
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-between gap-2 pt-4 border-t">
            {stages.length === 0 ? (
              <Button variant="ghost" size="sm" onClick={handleSkipForNow} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Skip for now
              </Button>
            ) : (
              <div />
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {stages.length === 0 ? 'Close' : 'Done'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Case Form Modal */}
      {clinicalCase && (
        <ClinicalCaseFormModal
          open={caseFormOpen}
          onOpenChange={setCaseFormOpen}
          moduleId={moduleId}
          chapterId={clinicalCase.chapter_id || undefined}
          clinicalCase={clinicalCase}
        />
      )}

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
