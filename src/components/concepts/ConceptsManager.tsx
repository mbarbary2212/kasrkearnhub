import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { toast } from 'sonner';
import { Plus, Tag, ChevronDown, Upload, Wand2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { normalizeConceptKey } from '@/lib/conceptNormalization';
import { ConceptBulkUploadModal } from './ConceptBulkUploadModal';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useChapterConcepts,
  useCreateConcept,
  useUpdateConcept,
  useDeleteConcept,
  useReorderConcepts,
  useAutoAlignConcepts,
  Concept,
} from '@/hooks/useConcepts';
import { SortableConceptItem } from './SortableConceptItem';

interface ConceptsManagerProps {
  chapterId?: string;
  topicId?: string;
  moduleId: string;
  canManage: boolean;
}

export function ConceptsManager({ chapterId, topicId, moduleId, canManage }: ConceptsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newConceptName, setNewConceptName] = useState('');
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingConcept, setDeletingConcept] = useState<Concept | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Fetch concepts for this chapter
  const { data: concepts } = useChapterConcepts(chapterId);

  const [alignConfirmOpen, setAlignConfirmOpen] = useState(false);
  const [alignResult, setAlignResult] = useState<{ tagged: number; skipped_low_confidence: number; already_tagged: number; errors: number } | null>(null);

  // Mutations
  const createConcept = useCreateConcept();
  const updateConcept = useUpdateConcept();
  const deleteConcept = useDeleteConcept();
  const reorderConcepts = useReorderConcepts();
  const autoAlign = useAutoAlignConcepts();

  const handleAutoAlign = async (retagAll = false) => {
    if (!chapterId || !concepts || concepts.length === 0) return;
    setAlignConfirmOpen(false);
    setAlignResult(null);
    try {
      const result = await autoAlign.mutateAsync({
        chapterId,
        conceptList: concepts.map(c => ({ id: c.id, title: c.title, concept_key: c.concept_key })),
        retag_all: retagAll,
      });
      setAlignResult(result);
      const parts: string[] = [];
      if (result.tagged > 0) parts.push(`${result.tagged} tagged`);
      if (result.skipped_low_confidence > 0) parts.push(`${result.skipped_low_confidence} skipped (low confidence)`);
      if (result.already_tagged > 0) parts.push(`${result.already_tagged} already tagged`);
      if (result.errors > 0) parts.push(`${result.errors} errors`);
      toast.success(`Auto-align complete: ${parts.join(', ')}`);
    } catch {
      toast.error('Auto-align failed');
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !concepts) return;

    const oldIndex = concepts.findIndex(c => c.id === active.id);
    const newIndex = concepts.findIndex(c => c.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(concepts, oldIndex, newIndex);
      const reorderData = newOrder.map((c, index) => ({
        id: c.id,
        display_order: index,
      }));

      try {
        await reorderConcepts.mutateAsync({ concepts: reorderData });
        toast.success('Concepts reordered');
      } catch {
        toast.error('Failed to reorder concepts');
      }
    }
  };

  const handleAddConcept = async () => {
    if (!newConceptName.trim()) {
      toast.error('Please enter a concept name');
      return;
    }

    const conceptKey = normalizeConceptKey(newConceptName.trim());

    try {
      await createConcept.mutateAsync({
        module_id: moduleId,
        chapter_id: chapterId || null,
        title: newConceptName.trim(),
        concept_key: conceptKey,
        display_order: concepts?.length || 0,
      });
      setNewConceptName('');
      toast.success('Concept created');
    } catch {
      toast.error('Failed to create concept');
    }
  };

  const handleUpdateConcept = async () => {
    if (!editingConcept || !editName.trim()) return;

    try {
      await updateConcept.mutateAsync({
        id: editingConcept.id,
        title: editName.trim(),
        concept_key: normalizeConceptKey(editName.trim()),
      });
      setEditingConcept(null);
      setEditName('');
      toast.success('Concept updated');
    } catch {
      toast.error('Failed to update concept');
    }
  };

  const handleDeleteConcept = async () => {
    if (!deletingConcept) return;

    try {
      await deleteConcept.mutateAsync(deletingConcept.id);
      setDeletingConcept(null);
      toast.success('Concept deleted');
    } catch {
      toast.error('Failed to delete concept');
    }
  };

  const startEdit = (concept: Concept) => {
    setEditingConcept(concept);
    setEditName(concept.title);
  };

  if (!canManage) return null;

  const conceptCount = concepts?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mt-4 min-w-0">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Concepts</CardTitle>
                {conceptCount > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {conceptCount}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <CardDescription>
              Tag content with medical concepts for granular filtering
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Concept list with drag-and-drop */}
            {concepts && concepts.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={concepts.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {concepts.map((concept) => (
                      <SortableConceptItem
                        key={concept.id}
                        concept={concept}
                        editingConcept={editingConcept}
                        editName={editName}
                        setEditName={setEditName}
                        handleUpdateConcept={handleUpdateConcept}
                        setEditingConcept={setEditingConcept}
                        startEdit={startEdit}
                        setDeletingConcept={setDeletingConcept}
                        isUpdating={updateConcept.isPending}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No concepts yet. Add your first concept below.
              </p>
            )}

            {/* Add new concept */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New concept name..."
                value={newConceptName}
                onChange={(e) => setNewConceptName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddConcept();
                }}
              />
              <Button
                onClick={handleAddConcept}
                disabled={createConcept.isPending || !newConceptName.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button
                onClick={() => setBulkUploadOpen(true)}
                size="sm"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
              {chapterId && concepts && concepts.length > 0 && (
                <Button
                  onClick={() => setAlignConfirmOpen(true)}
                  size="sm"
                  variant="outline"
                  disabled={autoAlign.isPending}
                >
                  {autoAlign.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-1" />
                  )}
                  Auto-Align
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingConcept} onOpenChange={() => setDeletingConcept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Concept</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingConcept?.title}"?
              Content tagged with this concept will become untagged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConcept}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Modal */}
      <ConceptBulkUploadModal
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        moduleId={moduleId}
        chapterId={chapterId}
        topicId={topicId}
        existingConcepts={concepts || []}
      />

      {/* Auto-Align Confirmation Dialog */}
      <AlertDialog open={alignConfirmOpen} onOpenChange={setAlignConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Align Content to Concepts</AlertDialogTitle>
            <AlertDialogDescription>
              This will use AI to scan all untagged content in this chapter and automatically assign the most relevant concept to each item. Items the AI is unsure about (confidence &lt; 60%) will be left untagged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAutoAlign(false)}>
              Align Untagged Only
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleAutoAlign(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Re-tag All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Align Progress */}
      {autoAlign.isPending && (
        <Card className="mt-2">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Auto-aligning content…</p>
                <p className="text-xs text-muted-foreground">Processing all content tables with AI</p>
                <Progress className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Collapsible>
  );
}
