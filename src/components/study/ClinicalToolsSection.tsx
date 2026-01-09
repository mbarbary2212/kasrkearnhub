import { useState } from 'react';
import { Plus, Upload, GitBranch, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyResource, StudyResourceType } from '@/hooks/useStudyResources';
import { StudyResourceTypeSection } from './StudyResourceTypeSection';
import { WorkedCaseCard } from './WorkedCaseCard';

interface ClinicalToolsSectionProps {
  algorithms: StudyResource[];
  workedCases: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onAdd?: (type: StudyResourceType) => void;
  onBulkUpload?: (type: StudyResourceType) => void;
  chapterId: string;
}

// Types that belong to Clinical Tools - Algorithms and Worked Cases
const CLINICAL_TOOLS_TYPES: { type: StudyResourceType | 'clinical_case_worked'; label: string; icon: React.ReactNode }[] = [
  { type: 'algorithm', label: 'Algorithms', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'clinical_case_worked', label: 'Worked Cases', icon: <ClipboardList className="w-4 h-4" /> },
];

export function ClinicalToolsSection({
  algorithms,
  workedCases,
  canManage = false,
  onEdit,
  onAdd,
  onBulkUpload,
  chapterId,
}: ClinicalToolsSectionProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="algorithm" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
          {CLINICAL_TOOLS_TYPES.map(({ type, label, icon }) => {
            const count = type === 'algorithm' ? algorithms.length : workedCases.length;
            return (
              <TabsTrigger
                key={type}
                value={type}
                className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"
              >
                {icon}
                <span className="text-xs sm:text-sm">{label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Algorithms Content */}
        <TabsContent value="algorithm" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdd?.('algorithm')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Algorithm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkUpload?.('algorithm')}
              >
                <Upload className="w-3 h-3 mr-1" />
                Bulk Upload
              </Button>
            </div>
          )}
          <StudyResourceTypeSection
            resources={algorithms}
            resourceType="algorithm"
            canManage={canManage}
            onEdit={onEdit}
            chapterId={chapterId}
          />
        </TabsContent>

        {/* Worked Cases Content */}
        <TabsContent value="clinical_case_worked" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdd?.('clinical_case_worked')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Worked Case
              </Button>
            </div>
          )}
          {workedCases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No worked cases available yet.
            </p>
          ) : (
            <div className="space-y-4">
              {workedCases.map((resource) => (
                <WorkedCaseCard
                  key={resource.id}
                  resource={resource}
                  canManage={canManage}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
