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
} from 'lucide-react';
import { VPCase, VPStage, VPStageType } from '@/types/virtualPatient';
import { 
  useVirtualPatientCase, 
  useDeleteVirtualPatientStage,
  useReorderVirtualPatientStages,
} from '@/hooks/useVirtualPatient';
import { VPCaseFormModal } from './VPCaseFormModal';
import { VPStageFormModal } from './VPStageFormModal';
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

interface VPCaseBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  moduleId: string;
}

const stageTypeIcons: Record<VPStageType, typeof HelpCircle> = {
  mcq: HelpCircle,
  multi_select: CheckSquare,
  short_answer: MessageSquare,
};

const stageTypeLabels: Record<VPStageType, string> = {
  mcq: 'Single Choice',
  multi_select: 'Multi-select',
  short_answer: 'Short Answer',
};

function SortableStageItem({
  stage,
  onEdit,
  onDelete,
}: {
  stage: VPStage;
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

export function VPCaseBuilderModal({
  open,
  onOpenChange,
  caseId,
  moduleId,
}: VPCaseBuilderModalProps) {
  const { data: vpCase, isLoading } = useVirtualPatientCase(caseId);
  const deleteStage = useDeleteVirtualPatientStage();
  const reorderStages = useReorderVirtualPatientStages();

  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<VPStage | null>(null);
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<VPStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !vpCase?.stages) return;

    const oldIndex = vpCase.stages.findIndex(s => s.id === active.id);
    const newIndex = vpCase.stages.findIndex(s => s.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(vpCase.stages, oldIndex, newIndex);
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

  const handleEditStage = (stage: VPStage) => {
    setEditingStage(stage);
    setStageFormOpen(true);
  };

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

  const stages = vpCase?.stages || [];
  const nextStageOrder = stages.length + 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Case Builder
              {vpCase && !vpCase.is_published && (
                <Badge variant="secondary">Draft</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : vpCase ? (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-6 pr-4 pb-4">
                {/* Case Info Section */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{vpCase.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {vpCase.level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ~{vpCase.estimated_minutes} min
                        </span>
                        {vpCase.chapter && (
                          <span className="text-sm text-muted-foreground">
                            • Chapter {vpCase.chapter.chapter_number}
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
                    {vpCase.intro_text}
                  </p>
                  {vpCase.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {vpCase.tags.map((tag) => (
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
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">
                      Stages ({stages.length})
                    </h4>
                    <Button size="sm" onClick={handleAddStage}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stage
                    </Button>
                  </div>

                  {stages.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <p className="text-muted-foreground mb-4">
                        No stages added yet. Add your first stage to build the case.
                      </p>
                      <Button onClick={handleAddStage}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add First Stage
                      </Button>
                    </div>
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
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Case not found</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Case Form Modal */}
      {vpCase && (
        <VPCaseFormModal
          open={caseFormOpen}
          onOpenChange={setCaseFormOpen}
          moduleId={moduleId}
          chapterId={vpCase.chapter_id || undefined}
          vpCase={vpCase}
        />
      )}

      {/* Stage Form Modal */}
      <VPStageFormModal
        open={stageFormOpen}
        onOpenChange={setStageFormOpen}
        caseId={caseId}
        stageOrder={editingStage?.stage_order || nextStageOrder}
        stage={editingStage}
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
