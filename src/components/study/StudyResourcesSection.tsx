import { useState, useMemo } from 'react';
import { Search, Plus, BookOpen, Table2, GitBranch, Lightbulb, Image } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StudyDisclaimer } from './StudyDisclaimer';
import { StudyResourceTypeSection } from './StudyResourceTypeSection';
import { StudyResourceFormModal } from './StudyResourceFormModal';
import { StudyBulkUploadModal } from './StudyBulkUploadModal';
import {
  useChapterStudyResources,
  StudyResourceType,
  StudyResource,
} from '@/hooks/useStudyResources';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAddPermissionGuard } from '@/hooks/useAddPermissionGuard';

interface StudyResourcesSectionProps {
  chapterId: string;
  moduleId: string;
  canManage?: boolean;
  isSuperAdmin?: boolean;
}

const RESOURCE_TYPES: { type: StudyResourceType; label: string; icon: React.ReactNode }[] = [
  { type: 'flashcard', label: 'Flashcards', icon: <BookOpen className="w-4 h-4" /> },
  { type: 'table', label: 'Key Tables', icon: <Table2 className="w-4 h-4" /> },
  { type: 'algorithm', label: 'Pathways', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'exam_tip', label: 'Exam Tips', icon: <Lightbulb className="w-4 h-4" /> },
  { type: 'key_image', label: 'Key Images', icon: <Image className="w-4 h-4" /> },
];

export function StudyResourcesSection({
  chapterId,
  moduleId,
  canManage = false,
  isSuperAdmin = false,
}: StudyResourcesSectionProps) {
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

  const { data: resources, isLoading } = useChapterStudyResources(chapterId);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<StudyResourceType>('flashcard');
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);

  // Group resources by type
  const resourcesByType = useMemo(() => {
    const grouped: Partial<Record<StudyResourceType, StudyResource[]>> = {};

    if (!resources) return grouped;

    resources.forEach((resource) => {
      if (!grouped[resource.resource_type]) {
        grouped[resource.resource_type] = [];
      }
      grouped[resource.resource_type]!.push(resource);
    });

    return grouped;
  }, [resources]);

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-12" />
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

      {/* Resource Type Accordions */}
      <Accordion
        type="multiple"
        defaultValue={RESOURCE_TYPES.map((t) => t.type)}
        className="space-y-3"
      >
        {RESOURCE_TYPES.map(({ type, label, icon }) => (
          <AccordionItem
            key={type}
            value={type}
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                {icon}
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filteredResourcesByType[type].length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              {/* Admin actions */}
              {showAddControls && (
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => guard(() => handleAddResource(type))}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add {label.slice(0, -1)}
                  </Button>
                  {type !== 'key_image' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => guard(() => handleBulkUpload(type))}
                    >
                      Bulk Upload
                    </Button>
                  )}
                </div>
              )}

              <StudyResourceTypeSection
                resources={filteredResourcesByType[type]}
                resourceType={type}
                canManage={canManage}
                onEdit={handleEdit}
                chapterId={chapterId}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

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
    </div>
  );
}
