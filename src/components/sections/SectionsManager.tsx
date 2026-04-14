import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, Layers, ChevronDown, Wand2, Loader2, FileCheck, FileX, Copy } from 'lucide-react';
import { useAutoTagSections } from '@/hooks/useAutoTagSections';
import { useExtractSections } from '@/hooks/useExtractSections';
import { supabase } from '@/integrations/supabase/client';
import { SectionReassignDialog } from './SectionReassignDialog';
import { useQuery } from '@tanstack/react-query';
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
  const [isOpen, setIsOpen] = useState(false);
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
  const { autoTag, isRunning: isAutoTagging, progress: autoTagProgress } = useAutoTagSections();
  const { extractAndInsert, isExtracting } = useExtractSections();

  // Check if a PDF is linked to this chapter
  const { data: linkedDoc } = useQuery({
    queryKey: ['admin-doc-linked', chapterId, topicId],
    queryFn: async () => {
      const col = chapterId ? 'chapter_id' : 'topic_id';
      const val = chapterId || topicId;
      if (!val) return null;
      const { data } = await supabase
        .from('admin_documents')
        .select('id, title')
        .eq(col, val)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!(chapterId || topicId),
  });
  
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
        // Auto-extract sections from PDF if enabling and no sections exist yet
        if (enabled && (!sections || sections.length === 0)) {
          await extractAndInsert(chapterId);
        }
      } else if (topicId) {
        await toggleTopicSections.mutateAsync({ topicId, enabled });
      }
      toast.success(enabled ? 'Sections enabled' : 'Sections disabled');
    } catch {
      toast.error('Failed to update sections setting');
    }
  };

  const handleAutoDetectSections = async () => {
    if (!chapterId) {
      toast.error('Auto-detect is available for chapter PDFs only');
      return;
    }

    try {
      await extractAndInsert(chapterId);
    } catch {
      toast.error('Failed to auto-detect sections');
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
    } catch (err: any) {
      const msg = err?.message || 'Failed to create section';
      toast.error(msg);
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
  
  const handleAutoTag = async () => {
    if (!sections?.length) {
      toast.error('Create sections first before auto-tagging');
      return;
    }
    try {
      const results = await autoTag(sections, chapterId, topicId);
      const totalTagged = results.reduce((sum, r) => sum + r.tagged, 0);
      const totalEligible = results.reduce((sum, r) => sum + r.total, 0);
      const aiTagged = (results as any).__aiTagged || 0;
      const keywordTagged = (results as any).__keywordTagged || 0;
      if (totalTagged === 0) {
        toast.info('No unassigned content could be matched to sections.');
      } else {
        const parts = [];
        if (keywordTagged > 0) parts.push(`${keywordTagged} by keywords`);
        if (aiTagged > 0) parts.push(`${aiTagged} by AI`);
        toast.success(`Auto-tagged ${totalTagged} of ${totalEligible} items (${parts.join(', ')}) across ${results.filter(r => r.tagged > 0).length} content type(s).`);
      }
    } catch {
      toast.error('Auto-tag failed');
    }
  };
  
  const handleCopyPrompt = () => {
    if (!sections?.length) return;
    const list = sections
      .map((s, i) => `${s.section_number ?? i + 1}. ${s.name}`)
      .join('\n');
    const prompt = `Below is a list of sections from this chapter:\n\n${list}\n\nAfter watching this video, determine which of the above sections its content belongs to. It may belong to more than one section. For each applicable section, provide a thorough explanation — not just a brief mention — detailing the specific concepts, themes, or topics in the video that directly relate to that section. If the video spans multiple sections, explain the connection to each one separately.`;
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard');
  };

  if (!canManage) return null;

  const sectionCount = sections?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mt-6 max-w-2xl">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Sections</CardTitle>
                {sectionCount > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {sectionCount}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {isChapterScope && (
                  <>
                    {linkedDoc ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <FileCheck className="h-3.5 w-3.5" />
                        PDF linked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileX className="h-3.5 w-3.5" />
                        No PDF
                      </span>
                    )}
                    {sectionsEnabled && !!sections?.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPrompt}
                        title="Copy a prompt you can paste into an AI to identify which sections this video belongs to"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Prompt
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoDetectSections}
                      disabled={!sectionsEnabled || isExtracting || !linkedDoc}
                      title={!linkedDoc ? 'Upload a PDF first' : undefined}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      {isExtracting ? 'Detecting...' : 'Auto Detect'}
                    </Button>
                  </>
                )}
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
        </CollapsibleTrigger>
        
        <CollapsibleContent>
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
              ) : isExtracting ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting sections from PDF...
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

              {/* Auto-Tag button */}
              {sections && sections.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoTag}
                      disabled={isAutoTagging}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      {isAutoTagging ? (autoTagProgress || 'Auto-tagging...') : 'Auto-Tag Content to Sections'}
                    </Button>
                  </div>
                  {autoTagProgress && (
                    <p className="text-xs text-muted-foreground mt-1">{autoTagProgress}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Uses keyword matching and AI to automatically assign unassigned content to the correct sections.
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </CollapsibleContent>
      </Card>
      
      {/* Reassign & Delete dialog */}
      <SectionReassignDialog
        open={!!deletingSection}
        onOpenChange={(open) => { if (!open) setDeletingSection(null); }}
        section={deletingSection}
        allSections={sections || []}
        mode="delete"
        onConfirm={handleDeleteSection}
      />
    </Collapsible>
  );
}
