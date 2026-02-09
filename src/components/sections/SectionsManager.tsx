import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';
import { Plus, Layers } from 'lucide-react';
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
  useChapterSections,
  useTopicSections,
  useChapterSectionsEnabled,
  useTopicSectionsEnabled,
  useToggleChapterSections,
  useToggleTopicSections,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  Section,
} from '@/hooks/useSections';
import { SortableSectionItem } from './SortableSectionItem';

interface SectionsManagerProps {
  chapterId?: string;
  topicId?: string;
  canManage: boolean;
}

export function SectionsManager({ chapterId, topicId, canManage }: SectionsManagerProps) {
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  
  // Determine scope
  const isChapterScope = !!chapterId;
  
  // Fetch sections enabled status
  const { data: chapterEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: topicEnabled } = useTopicSectionsEnabled(topicId);
  const sectionsEnabled = isChapterScope ? chapterEnabled : topicEnabled;
  
  // Fetch sections
  const { data: chapterSections } = useChapterSections(chapterId);
  const { data: topicSections } = useTopicSections(topicId);
  const sections = isChapterScope ? chapterSections : topicSections;
  
  // Mutations
  const toggleChapterSections = useToggleChapterSections();
  const toggleTopicSections = useToggleTopicSections();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sections) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(sections, oldIndex, newIndex);
      const reorderData = newOrder.map((s, index) => ({
        id: s.id,
        display_order: index,
      }));

      try {
        await reorderSections.mutateAsync({ sections: reorderData });
        toast.success('Sections reordered');
      } catch {
        toast.error('Failed to reorder sections');
      }
    }
  };
  
  const handleToggleSections = async (enabled: boolean) => {
    try {
      if (isChapterScope && chapterId) {
        await toggleChapterSections.mutateAsync({ chapterId, enabled });
      } else if (topicId) {
        await toggleTopicSections.mutateAsync({ topicId, enabled });
      }
      toast.success(enabled ? 'Sections enabled' : 'Sections disabled');
    } catch {
      toast.error('Failed to update sections setting');
    }
  };
  
  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      toast.error('Please enter a section name');
      return;
    }
    
    try {
      await createSection.mutateAsync({
        name: newSectionName.trim(),
        chapter_id: chapterId,
        topic_id: topicId,
      });
      setNewSectionName('');
      toast.success('Section created');
    } catch {
      toast.error('Failed to create section');
    }
  };
  
  const handleUpdateSection = async () => {
    if (!editingSection || !editName.trim()) return;
    
    try {
      await updateSection.mutateAsync({
        id: editingSection.id,
        name: editName.trim(),
      });
      setEditingSection(null);
      setEditName('');
      toast.success('Section updated');
    } catch {
      toast.error('Failed to update section');
    }
  };
  
  const handleDeleteSection = async () => {
    if (!deletingSection) return;
    
    try {
      await deleteSection.mutateAsync(deletingSection.id);
      setDeletingSection(null);
      toast.success('Section deleted');
    } catch {
      toast.error('Failed to delete section');
    }
  };
  
  const startEdit = (section: Section) => {
    setEditingSection(section);
    setEditName(section.name);
  };
  
  if (!canManage) return null;
  
  return (
    <Card className="mt-6 max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Sections</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="enable-sections" className="text-sm text-muted-foreground">
              Enable
            </Label>
            <Switch
              id="enable-sections"
              checked={sectionsEnabled ?? false}
              onCheckedChange={handleToggleSections}
              disabled={toggleChapterSections.isPending || toggleTopicSections.isPending}
            />
          </div>
        </div>
        <CardDescription>
          Organize content into sections for better student navigation
        </CardDescription>
      </CardHeader>
      
      {sectionsEnabled && (
        <CardContent className="space-y-4">
          {/* Section list with drag-and-drop */}
          {sections && sections.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sections.map((section) => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      editingSection={editingSection}
                      editName={editName}
                      setEditName={setEditName}
                      handleUpdateSection={handleUpdateSection}
                      setEditingSection={setEditingSection}
                      startEdit={startEdit}
                      setDeletingSection={setDeletingSection}
                      isUpdating={updateSection.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No sections yet. Add your first section below.
            </p>
          )}
          
          {/* Add new section */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New section name..."
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSection();
              }}
            />
            <Button
              onClick={handleAddSection}
              disabled={createSection.isPending || !newSectionName.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Section
            </Button>
          </div>
        </CardContent>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSection?.name}"? 
              Content assigned to this section will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
