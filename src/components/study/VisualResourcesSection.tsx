import { useState, useMemo } from 'react';
import { Plus, Upload, Network, Image, GitBranch, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StudyResource, StudyResourceType } from '@/hooks/useStudyResources';
import { MindMapViewer } from './MindMapViewer';
import { InfographicViewer } from './InfographicViewer';
import { StudyResourceTypeSection } from './StudyResourceTypeSection';

interface VisualResourcesSectionProps {
  mindMaps: StudyResource[];
  infographics: StudyResource[];
  algorithms: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onAdd?: (type: StudyResourceType) => void;
  onBulkUpload?: (type: StudyResourceType) => void;
  chapterId?: string;
  topicId?: string;
  filterBySection?: <T>(items: T[]) => T[];
  isLoading?: boolean;
}

const SUBTABS = [
  { type: 'mind_map' as const, label: 'Mind Maps', icon: Network },
  { type: 'infographic' as const, label: 'Infographics', icon: Image },
  { type: 'algorithm' as const, label: 'Algorithms', icon: GitBranch },
];

export function VisualResourcesSection({
  mindMaps,
  infographics,
  algorithms,
  canManage = false,
  onEdit,
  onAdd,
  onBulkUpload,
  chapterId,
  topicId,
  filterBySection,
  isLoading,
}: VisualResourcesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filterItems = (items: StudyResource[]) => {
    const filtered = filterBySection ? filterBySection(items) : items;
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(r => r.title.toLowerCase().includes(q));
  };

  const filteredMindMaps = useMemo(() => filterItems(mindMaps), [mindMaps, searchQuery, filterBySection]);
  const filteredInfographics = useMemo(() => filterItems(infographics), [infographics, searchQuery, filterBySection]);
  const filteredAlgorithms = useMemo(() => filterItems(algorithms), [algorithms, searchQuery, filterBySection]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search visual resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="mind_map" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
          {SUBTABS.map(({ type, label, icon: Icon }) => {
            const count = type === 'mind_map' ? mindMaps.length
              : type === 'infographic' ? infographics.length
              : algorithms.length;
            return (
              <TabsTrigger
                key={type}
                value={type}
                className="flex items-center gap-2 px-3 py-2 whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs sm:text-sm">{label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Mind Maps */}
        <TabsContent value="mind_map" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('mind_map')}>
                <Plus className="w-3 h-3 mr-1" />
                Add Mind Map
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkUpload?.('mind_map')}>
                <Upload className="w-3 h-3 mr-1" />
                Bulk Upload
              </Button>
            </div>
          )}
          <MindMapViewer
            resources={filteredMindMaps}
            canManage={canManage}
            onEdit={onEdit}
            chapterId={chapterId}
            topicId={topicId}
          />
        </TabsContent>

        {/* Infographics */}
        <TabsContent value="infographic" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('infographic')}>
                <Plus className="w-3 h-3 mr-1" />
                Add Infographic
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkUpload?.('infographic')}>
                <Upload className="w-3 h-3 mr-1" />
                Bulk Upload
              </Button>
            </div>
          )}
          <InfographicViewer
            resources={filteredInfographics}
            canManage={canManage}
            onEdit={onEdit}
            chapterId={chapterId}
            topicId={topicId}
          />
        </TabsContent>

        {/* Algorithms */}
        <TabsContent value="algorithm" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('algorithm')}>
                <Plus className="w-3 h-3 mr-1" />
                Add Algorithm
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkUpload?.('algorithm')}>
                <Upload className="w-3 h-3 mr-1" />
                Bulk Upload
              </Button>
            </div>
          )}
          <StudyResourceTypeSection
            resources={filteredAlgorithms}
            resourceType="algorithm"
            canManage={canManage}
            onEdit={onEdit}
            chapterId={chapterId}
            topicId={topicId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
