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
import { Plus, Pencil, Trash2, GripVertical, Layers } from 'lucide-react';
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
  Section,
} from '@/hooks/useSections';

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
    <Card className="mt-6">
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
          {/* Section list */}
          {sections && sections.length > 0 ? (
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  
                  {editingSection?.id === section.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSection();
                          if (e.key === 'Escape') {
                            setEditingSection(null);
                            setEditName('');
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdateSection}
                        disabled={updateSection.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSection(null);
                          setEditName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{section.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(section)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingSection(section)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
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
