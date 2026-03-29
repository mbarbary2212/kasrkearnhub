import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Table2, Lightbulb, Image, FileText, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminContentActions } from '@/components/admin/AdminContentActions';
import ResourceList from '@/components/content/ResourceList';
import { ResourcesDeleteManager, ResourceKind } from '@/components/content/ResourcesDeleteManager';
import { StudyDisclaimer } from '@/components/study/StudyDisclaimer';
import { StudyResourceTypeSection } from '@/components/study/StudyResourceTypeSection';
import { StudyResourceFormModal } from '@/components/study/StudyResourceFormModal';
import { StudyBulkUploadModal } from '@/components/study/StudyBulkUploadModal';
import { TableResourceView } from '@/components/study/TableResourceView';
import { RichDocumentViewer } from '@/components/study/RichDocumentViewer';
import {
  useChapterStudyResources,
  useDeleteStudyResource,
  StudyResourceType,
  StudyResource,
} from '@/hooks/useStudyResources';
import { useUpdateContent } from '@/hooks/useContentCrud';
import { useChapterSections } from '@/hooks/useSections';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  resource_type?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  document_subtype?: string | null;
  rich_content?: string | null;
  section_id?: string | null;
}

interface ResourcesTabContentProps {
  chapterId: string;
  moduleId: string;
  resources: Resource[];
  resourcesLoading: boolean;
  canManageContent: boolean;
  isSuperAdmin: boolean;
}

// Flashcards removed - now a top-level tab
// Algorithms removed - now under Clinical Tools tab
const STUDY_RESOURCE_TYPES: { type: StudyResourceType | 'documents'; label: string; icon: React.ReactNode }[] = [
  { type: 'documents' as any, label: 'Documents & Summaries', icon: <FileText className="w-4 h-4" /> },
  { type: 'table', label: 'Tables', icon: <Table2 className="w-4 h-4" /> },
  { type: 'exam_tip', label: 'Exam Tips', icon: <Lightbulb className="w-4 h-4" /> },
  { type: 'key_image', label: 'Images', icon: <Image className="w-4 h-4" /> },
];

export function ResourcesTabContent({
  chapterId,
  moduleId,
  resources,
  resourcesLoading,
  canManageContent,
  isSuperAdmin,
}: ResourcesTabContentProps) {
  const queryClient = useQueryClient();
  const auth = useAuthContext();

  const showAddControls = !!(
    auth.isTeacher ||
    auth.isAdmin ||
    auth.isModuleAdmin ||
    auth.isTopicAdmin ||
    auth.isDepartmentAdmin ||
    auth.isPlatformAdmin ||
    auth.isSuperAdmin
  );

  const { guard, dialog } = useAddPermissionGuard({ moduleId, chapterId });

  const { data: studyResources, isLoading: studyResourcesLoading } = useChapterStudyResources(chapterId);
  const deleteStudyResource = useDeleteStudyResource();
  const { data: sections = [] } = useChapterSections(chapterId);
  const updateContent = useUpdateContent('resources');
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<StudyResourceType>('flashcard');
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [editDocModalOpen, setEditDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Resource | null>(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocSection, setEditDocSection] = useState<string>('none');

  // Group study resources by type
  const resourcesByType = useMemo(() => {
    const grouped: Partial<Record<StudyResourceType, StudyResource[]>> = {};

    if (!studyResources) return grouped;

    studyResources.forEach((resource) => {
      if (!grouped[resource.resource_type]) {
        grouped[resource.resource_type] = [];
      }
      grouped[resource.resource_type]!.push(resource);
    });

    return grouped;
  }, [studyResources]);

  // Filter resources by search query
  const filteredResourcesByType = useMemo(() => {
    if (!searchQuery.trim()) return resourcesByType;

    const query = searchQuery.toLowerCase();
    const filtered: Partial<Record<StudyResourceType, StudyResource[]>> = {};

    Object.entries(resourcesByType).forEach(([type, items]) => {
      if (items) {
        filtered[type as StudyResourceType] = items.filter((r) => {
          const titleMatch = r.title.toLowerCase().includes(query);
          const contentStr = JSON.stringify(r.content).toLowerCase();
          return titleMatch || contentStr.includes(query);
        });
      }
    });

    return filtered;
  }, [resourcesByType, searchQuery]);

  // Filter documents by search query (non-summary, non-socratic)
  const filteredDocuments = useMemo(() => {
    const docs = resources.filter(r => !r.document_subtype || r.document_subtype === 'summary');
    if (!searchQuery.trim()) return docs;
    const query = searchQuery.toLowerCase();
    return docs.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.rich_content?.toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);

  // Split into summaries and regular docs for rendering
  const summaryDocs = useMemo(() => filteredDocuments.filter(r => r.document_subtype === 'summary'), [filteredDocuments]);
  const regularDocs = useMemo(() => filteredDocuments.filter(r => !r.document_subtype), [filteredDocuments]);

  const handleAddResource = (type: StudyResourceType) => {
    setSelectedType(type);
    setEditingResource(null);
    setFormModalOpen(true);
  };

  const handleBulkUpload = (type: StudyResourceType) => {
    setSelectedType(type);
    setBulkModalOpen(true);
  };

  const handleEdit = (resource: StudyResource) => {
    setSelectedType(resource.resource_type);
    setEditingResource(resource);
    setFormModalOpen(true);
  };

  // Centralized delete handler for the ResourcesDeleteManager
  const handleDeleteResource = useCallback(async (kind: ResourceKind, id: string) => {
    await deleteStudyResource.mutateAsync({ id, chapterId });
    toast.success('Resource deleted');
  }, [deleteStudyResource, chapterId]);

  const handleEditDocument = useCallback((resource: Resource) => {
    setEditingDoc(resource);
    setEditDocTitle(resource.title);
    setEditDocSection((resource as any).section_id || 'none');
    setEditDocModalOpen(true);
  }, []);

  const handleSaveDocument = useCallback(async () => {
    if (!editingDoc) return;
    try {
      await updateContent.mutateAsync({
        id: editingDoc.id,
        data: {
          title: editDocTitle,
          section_id: editDocSection === 'none' ? null : editDocSection,
        },
        moduleId,
        chapterId,
      });
      toast.success('Document updated');
      setEditDocModalOpen(false);
      setEditingDoc(null);
    } catch (err) {
      toast.error('Failed to update document');
    }
  }, [editingDoc, editDocTitle, editDocSection, updateContent, moduleId, chapterId]);

  // Refetch all resources
  const refetchResources = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', chapterId] });
  }, [queryClient, chapterId]);

  const isLoading = resourcesLoading || studyResourcesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialog}
      {/* Disclaimer */}
      <StudyDisclaimer isSuperAdmin={isSuperAdmin} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search across all resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Horizontal Sub-tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
          {STUDY_RESOURCE_TYPES.map(({ type, label, icon }) => (
            <TabsTrigger
              key={type}
              value={type}
              className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"
            >
              {icon}
              <span className="text-xs sm:text-sm">{label}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {type === 'documents'
                  ? filteredDocuments.length
                  : filteredResourcesByType[type as StudyResourceType]?.length || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Documents & Summaries Content */}
        <TabsContent value="documents" className="mt-4">
          {showAddControls && (
            <div className="mb-4">
              <AdminContentActions chapterId={chapterId} moduleId={moduleId} contentType="resource" />
            </div>
          )}

          {/* AI Summaries */}
          {summaryDocs.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-medium text-muted-foreground">Summaries</h3>
              {summaryDocs.map(doc => (
                <RichDocumentViewer
                  key={doc.id}
                  title={doc.title}
                  content={doc.rich_content || ''}
                  documentType="summary"
                  resourceId={doc.id}
                  chapterId={chapterId}
                />
              ))}
            </div>
          )}

          {/* Uploaded Documents */}
          <ResourceList
            resources={regularDocs}
            moduleId={moduleId}
            chapterId={chapterId}
            canEdit={canManageContent}
            canDelete={canManageContent}
            showFeedback={true}
            compact={true}
            onEdit={handleEditDocument}
          />

          {filteredDocuments.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No documents or summaries yet.</p>
          )}
        </TabsContent>

        {/* Study Resource Type Contents (table, exam_tip, key_image) */}
        {STUDY_RESOURCE_TYPES.filter(({ type }) => type !== 'documents').map(({ type, label }) => (
          <TabsContent key={type} value={type} className="mt-4">
            {showAddControls && (
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => guard(() => handleAddResource(type as StudyResourceType))}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add {label.slice(0, -1)}
                </Button>
                {type !== 'key_image' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => guard(() => handleBulkUpload(type as StudyResourceType))}
                  >
                    Bulk Upload
                  </Button>
                )}
              </div>
            )}

            {type === 'table' ? (
              <TableResourceView
                resources={filteredResourcesByType[type as StudyResourceType] || []}
                canManage={canManageContent}
                onEdit={handleEdit}
              />
            ) : (
              <StudyResourceTypeSection
                resources={filteredResourcesByType[type as StudyResourceType] || []}
                resourceType={type as StudyResourceType}
                canManage={canManageContent}
                onEdit={handleEdit}
                chapterId={chapterId}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Centralized Delete Manager - lives at page level */}
      {canManageContent && (
        <ResourcesDeleteManager
          deleteResource={handleDeleteResource}
          refetchResources={refetchResources}
        />
      )}

      {/* Form Modal */}
      <StudyResourceFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        chapterId={chapterId}
        moduleId={moduleId}
        resourceType={selectedType}
        resource={editingResource}
      />

      {/* Bulk Upload Modal */}
      <StudyBulkUploadModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        chapterId={chapterId}
        moduleId={moduleId}
        resourceType={selectedType}
      />

      {/* Edit Document Modal */}
      <Dialog open={editDocModalOpen} onOpenChange={setEditDocModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={editDocTitle} onChange={(e) => setEditDocTitle(e.target.value)} />
            </div>
            <div>
              <Label>Section</Label>
              <Select value={editDocSection} onValueChange={setEditDocSection}>
                <SelectTrigger>
                  <SelectValue placeholder="No section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No section</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDocModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDocument} disabled={updateContent.isPending || !editDocTitle.trim()}>
              {updateContent.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
