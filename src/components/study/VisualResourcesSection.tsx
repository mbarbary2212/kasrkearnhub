import { useState, useMemo } from 'react';
import { Plus, Network, Image, GitBranch, Search, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StudyResource, StudyResourceType } from '@/hooks/useStudyResources';
import { useFlashcardStars } from '@/hooks/useFlashcardStars';
import { useChapterSections } from '@/hooks/useSections';
import { AdminViewToggle, type ViewMode } from '@/components/admin/AdminViewToggle';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';
import { MindMapViewer } from './MindMapViewer';
import { InfographicViewer } from './InfographicViewer';
import { StudyResourceTypeSection } from './StudyResourceTypeSection';
import { VisualResourcesAdminTable } from './VisualResourcesAdminTable';

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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Star support for students (reuses flashcard stars infrastructure)
  const { starredIds, toggleStar, isStarred } = useFlashcardStars({ chapterId, topicId });

  // Sections for admin table
  const { data: sections = [] } = useChapterSections(chapterId);

  const filterItems = (items: StudyResource[]) => {
    let filtered = filterBySection ? filterBySection(items) : items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(q));
    }
    if (showStarredOnly && !canManage) {
      filtered = filtered.filter(r => starredIds.has(r.id));
    }
    return filtered;
  };

  const filteredMindMaps = useMemo(() => filterItems(mindMaps), [mindMaps, searchQuery, filterBySection, showStarredOnly, starredIds]);
  const filteredInfographics = useMemo(() => filterItems(infographics), [infographics, searchQuery, filterBySection, showStarredOnly, starredIds]);
  const filteredAlgorithms = useMemo(() => filterItems(algorithms), [algorithms, searchQuery, filterBySection, showStarredOnly, starredIds]);



  return (
    <div className="space-y-4">
      {/* Search + controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search visual resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Star filter for students */}
        {!canManage && (
          <Button
            size="sm"
            variant={showStarredOnly ? 'default' : 'outline'}
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className="gap-1.5 shrink-0"
          >
            <Star className={`w-3.5 h-3.5 ${showStarredOnly ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Starred</span>
          </Button>
        )}
        {/* Admin table toggle */}
        {canManage && (
          <AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        )}
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
            </div>
          )}
          {canManage && viewMode === 'table' ? (
            <VisualResourcesAdminTable
              resources={filteredMindMaps}
              sections={sections}
              chapterId={chapterId}
              topicId={topicId}
              moduleId={mindMaps[0]?.module_id}
              onEdit={onEdit}
              onDelete={onEdit ? (r) => requestResourceDelete(r.resource_type as any, r.id, r.title) : undefined}
            />
          ) : (
            <MindMapViewer
              resources={filteredMindMaps}
              canManage={canManage}
              onEdit={onEdit}
              chapterId={chapterId}
              topicId={topicId}
            />
          )}
        </TabsContent>

        {/* Infographics */}
        <TabsContent value="infographic" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('infographic')}>
                <Plus className="w-3 h-3 mr-1" />
                Add Infographic
              </Button>
            </div>
          )}
          {canManage && viewMode === 'table' ? (
            <VisualResourcesAdminTable
              resources={filteredInfographics}
              sections={sections}
              chapterId={chapterId}
              topicId={topicId}
              moduleId={infographics[0]?.module_id}
              onEdit={onEdit}
              onDelete={onEdit ? (r) => requestResourceDelete(r.resource_type as any, r.id, r.title) : undefined}
            />
          ) : (
            <InfographicViewer
              resources={filteredInfographics}
              canManage={canManage}
              onEdit={onEdit}
              chapterId={chapterId}
              topicId={topicId}
              starredIds={starredIds}
              onToggleStar={!canManage ? toggleStar : undefined}
            />
          )}
        </TabsContent>

        {/* Algorithms */}
        <TabsContent value="algorithm" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('algorithm')}>
                <Plus className="w-3 h-3 mr-1" />
                Add Algorithm
              </Button>
            </div>
          )}
          {canManage && viewMode === 'table' ? (
            <VisualResourcesAdminTable
              resources={filteredAlgorithms}
              sections={sections}
              chapterId={chapterId}
              topicId={topicId}
              moduleId={algorithms[0]?.module_id}
              onEdit={onEdit}
              onDelete={onEdit ? (r) => requestResourceDelete(r.resource_type as any, r.id, r.title) : undefined}
            />
          ) : (
            <StudyResourceTypeSection
              resources={filteredAlgorithms}
              resourceType="algorithm"
              canManage={canManage}
              onEdit={onEdit}
              chapterId={chapterId}
              topicId={topicId}
              starredIds={starredIds}
              onToggleStar={!canManage ? toggleStar : undefined}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
