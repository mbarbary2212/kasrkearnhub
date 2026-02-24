import { useState } from 'react';
import { Plus, Upload, GitBranch, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyResource, StudyResourceType } from '@/hooks/useStudyResources';
import { WorkedCaseCard } from './WorkedCaseCard';
import { AlgorithmList, AlgorithmBuilderModal, AlgorithmBulkUploadModal } from '@/components/algorithms';
import { InteractiveAlgorithm, AlgorithmJson } from '@/types/algorithm';
import {
  useChapterAlgorithms,
  useTopicAlgorithms,
  useCreateInteractiveAlgorithm,
  useUpdateInteractiveAlgorithm,
  useDeleteInteractiveAlgorithm,
} from '@/hooks/useInteractiveAlgorithms';
import { toast } from 'sonner';

interface ClinicalToolsSectionProps {
  /** @deprecated Old algorithm resources — kept for backward compat but no longer rendered */
  algorithms?: StudyResource[];
  workedCases: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onAdd?: (type: StudyResourceType) => void;
  onBulkUpload?: (type: StudyResourceType) => void;
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
}

const CLINICAL_TOOLS_TYPES = [
  { type: 'algorithm' as const, label: 'Algorithms', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'clinical_case_worked' as const, label: 'Worked Cases', icon: <ClipboardList className="w-4 h-4" /> },
];

export function ClinicalToolsSection({
  workedCases,
  canManage = false,
  onEdit,
  onAdd,
  onBulkUpload,
  chapterId,
  topicId,
  moduleId,
}: ClinicalToolsSectionProps) {
  // Fetch interactive algorithms
  const chapterQuery = useChapterAlgorithms(chapterId);
  const topicQuery = useTopicAlgorithms(topicId);
  const interactiveAlgorithms = (chapterId ? chapterQuery.data : topicQuery.data) ?? [];

  const createAlg = useCreateInteractiveAlgorithm();
  const updateAlg = useUpdateInteractiveAlgorithm();
  const deleteAlg = useDeleteInteractiveAlgorithm();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingAlg, setEditingAlg] = useState<InteractiveAlgorithm | null>(null);

  const handleSaveAlgorithm = async (title: string, description: string, json: AlgorithmJson) => {
    try {
      if (editingAlg) {
        await updateAlg.mutateAsync({ id: editingAlg.id, title, description, algorithm_json: json as any });
        toast.success('Algorithm updated');
      } else {
        if (!moduleId) { toast.error('Module ID missing'); return; }
        await createAlg.mutateAsync({
          title,
          description,
          algorithm_json: json,
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
        });
        toast.success('Algorithm created');
      }
      setBuilderOpen(false);
      setEditingAlg(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save algorithm');
    }
  };

  const handleDeleteAlgorithm = async (alg: InteractiveAlgorithm) => {
    try {
      await deleteAlg.mutateAsync({ id: alg.id, chapterId, topicId });
      toast.success('Algorithm deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleBulkImport = async (algorithms: { title: string; json: AlgorithmJson }[]) => {
    if (!moduleId) { toast.error('Module ID missing'); return; }
    try {
      for (const alg of algorithms) {
        await createAlg.mutateAsync({
          title: alg.title,
          algorithm_json: alg.json,
          module_id: moduleId,
          chapter_id: chapterId || null,
          topic_id: topicId || null,
        });
      }
      toast.success(`${algorithms.length} algorithm(s) imported`);
      setBulkUploadOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="algorithm" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
          {CLINICAL_TOOLS_TYPES.map(({ type, label, icon }) => {
            const count = type === 'algorithm' ? interactiveAlgorithms.length : workedCases.length;
            return (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2 px-3 py-2 whitespace-nowrap">
                {icon}
                <span className="text-xs sm:text-sm">{label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Interactive Algorithms */}
        <TabsContent value="algorithm" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => { setEditingAlg(null); setBuilderOpen(true); }}>
                <Plus className="w-3 h-3 mr-1" /> Build Algorithm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkUploadOpen(true)}>
                <Upload className="w-3 h-3 mr-1" /> Bulk Upload
              </Button>
            </div>
          )}
          <AlgorithmList
            algorithms={interactiveAlgorithms}
            canManage={canManage}
            onEdit={(alg) => { setEditingAlg(alg); setBuilderOpen(true); }}
            onDelete={handleDeleteAlgorithm}
          />
        </TabsContent>

        {/* Worked Cases */}
        <TabsContent value="clinical_case_worked" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('clinical_case_worked')}>
                <Plus className="w-3 h-3 mr-1" /> Add Worked Case
              </Button>
            </div>
          )}
          {workedCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No worked cases available yet.</p>
          ) : (
            <div className="space-y-4">
              {workedCases.map((resource) => (
                <WorkedCaseCard key={resource.id} resource={resource} canManage={canManage} onEdit={onEdit} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Algorithm Builder Modal */}
      {builderOpen && (
        <AlgorithmBuilderModal
          open={builderOpen}
          onClose={() => { setBuilderOpen(false); setEditingAlg(null); }}
          onSave={handleSaveAlgorithm}
          initial={editingAlg}
          saving={createAlg.isPending || updateAlg.isPending}
        />
      )}

      {/* Bulk Upload Modal */}
      <AlgorithmBulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onImport={handleBulkImport}
        importing={createAlg.isPending}
      />
    </div>
  );
}
