import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Settings,
} from 'lucide-react';
import { ClinicalCaseStage, CaseStageType } from '@/types/clinicalCase';
import {
  useClinicalCase,
  useDeleteClinicalCaseStage,
  useReorderClinicalCaseStages,
} from '@/hooks/useClinicalCases';
import { ClinicalCaseQuickBuildModal } from './ClinicalCaseQuickBuildModal';
import { CaseBuilderDetailsTab } from './CaseBuilderDetailsTab';
import { CaseBuilderStageEditor } from './CaseBuilderStageEditor';
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
  isEditing,
  onEdit,
  onDelete,
}: {
  stage: ClinicalCaseStage;
  isEditing: boolean;
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
        isDragging && "opacity-50 shadow-lg",
        isEditing && "border-primary"
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

  const [activeTab, setActiveTab] = useState<string>('stages');
  const [quickBuildOpen, setQuickBuildOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [addingNewStage, setAddingNewStage] = useState(false);
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<ClinicalCaseStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const stages = clinicalCase?.stages || [];
  const nextStageOrder = stages.length + 1;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !clinicalCase?.stages) return;

    const oldIndex = clinicalCase.stages.findIndex(s => s.id === active.id);
    const newIndex = clinicalCase.stages.findIndex(s => s.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(clinicalCase.stages, oldIndex, newIndex);
      try {
        await reorderStages.mutateAsync({ caseId, stageIds: newOrder.map(s => s.id) });
        toast.success('Stages reordered');
      } catch {
        toast.error('Failed to reorder stages');
      }
    }
  };

  const handleDeleteStage = async () => {
    if (!deleteConfirmStage) return;
    try {
      await deleteStage.mutateAsync({ id: deleteConfirmStage.id, caseId });
      toast.success('Stage deleted');
      setDeleteConfirmStage(null);
      if (editingStageId === deleteConfirmStage.id) setEditingStageId(null);
    } catch {
      toast.error('Failed to delete stage');
    }
  };

  const handleAddStage = () => {
    setEditingStageId(null);
    setAddingNewStage(true);
  };

  const handleEditStage = (stageId: string) => {
    setAddingNewStage(false);
    setEditingStageId(editingStageId === stageId ? null : stageId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle className="flex items-center gap-2">
                Case Builder
                {clinicalCase && !clinicalCase.is_published && (
                  <Badge variant="secondary">Draft</Badge>
                )}
                {clinicalCase && (
                  <Badge variant="outline">
                    {stages.length} stage{stages.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </DialogTitle>
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="details" className="gap-1.5">
                  <Settings className="w-4 h-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="stages" className="gap-1.5">
                  <Layers className="w-4 h-4" />
                  Stages ({stages.length})
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="flex-1 min-h-0 overflow-y-auto mt-4">
                <CaseBuilderDetailsTab clinicalCase={clinicalCase} moduleId={moduleId} />
              </TabsContent>

              {/* Stages Tab */}
              <TabsContent value="stages" className="flex-1 min-h-0 overflow-y-auto mt-4">
                <div className="space-y-4 pb-4">
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setQuickBuildOpen(true)}>
                      <FileText className="w-4 h-4 mr-1" />
                      Quick Build
                    </Button>
                    <Button size="sm" onClick={handleAddStage}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stage
                    </Button>
                  </div>

                  {stages.length === 0 && !addingNewStage ? (
                    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                      <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
                          <Layers className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">Add Your First Stage</CardTitle>
                        <CardDescription className="text-base">
                          Stages are the steps of the scenario: history, exam, investigations, diagnosis, management.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <Button onClick={handleAddStage} className="w-full">
                          <Plus className="w-4 h-4 mr-1" />
                          Add First Stage
                        </Button>
                        <Button variant="outline" onClick={() => setQuickBuildOpen(true)} className="w-full">
                          <FileText className="w-4 h-4 mr-1" />
                          Quick Build (Paste Template)
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {stages.map((stage) => (
                            <div key={stage.id}>
                              <SortableStageItem
                                stage={stage}
                                isEditing={editingStageId === stage.id}
                                onEdit={() => handleEditStage(stage.id)}
                                onDelete={() => setDeleteConfirmStage(stage)}
                              />
                              {editingStageId === stage.id && (
                                <div className="mt-2">
                                  <CaseBuilderStageEditor
                                    caseId={caseId}
                                    stageOrder={stage.stage_order}
                                    stage={stage}
                                    onClose={() => setEditingStageId(null)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Inline new stage editor */}
                  {addingNewStage && (
                    <>
                      <Separator />
                      <CaseBuilderStageEditor
                        caseId={caseId}
                        stageOrder={nextStageOrder}
                        onClose={() => setAddingNewStage(false)}
                      />
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
