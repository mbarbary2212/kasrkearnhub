import { useState, useMemo } from 'react';
import { Plus, Network, Image, Search, Star, Upload, Wand2 } from 'lucide-react';
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
import { VisualResourcesAdminTable } from './VisualResourcesAdminTable';
import { MindMapAdminPanel } from '@/components/admin/MindMapAdminPanel';
import { AIMindMapCards } from './AIMindMapCards';
import { usePublishedMindMaps } from '@/hooks/useMindMaps';

interface VisualResourcesSectionProps {
  mindMaps: StudyResource[];
  infographics: StudyResource[];
  /** @deprecated Algorithms moved to Clinical Tools — kept for backward compat */
  algorithms?: StudyResource[];
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
  { type: 'mind_map' as const, label: 'Mind Maps', icon: Network, activeClass: 'data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20' },
  { type: 'infographic' as const, label: 'Infographics', icon: Image, activeClass: 'data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-950/40 dark:data-[state=active]:text-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20' },
];

export function VisualResourcesSection({
  mindMaps,
  infographics,
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

  const { starredIds, toggleStar, isStarred } = useFlashcardStars({ chapterId, topicId });
  const { data: sections = [] } = useChapterSections(chapterId);
  const { data: publishedAIMaps = [], isLoading: aiMapsLoading } = usePublishedMindMaps(chapterId, topicId);

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

  return (
    <div className="space-y-4">
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
        {canManage && (
          <AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        )}
      </div>

      <Tabs defaultValue="mind_map" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
          {SUBTABS.map(({ type, label, icon: Icon, activeClass }) => {
            const count = type === 'mind_map'
              ? mindMaps.length + publishedAIMaps.length
              : infographics.length;
            return (
              <TabsTrigger key={type} value={type} className={`flex items-center gap-2 px-3 py-2 whitespace-nowrap ${activeClass}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs sm:text-sm">{label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Mind Maps */}
        <TabsContent value="mind_map" className="mt-4">
          {canManage && (
            <div className="space-y-3 mb-4">
              <Tabs defaultValue="generate" className="w-full">
                <TabsList className="h-9 p-1">
                  <TabsTrigger value="generate" className="text-xs gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" /> Generate Mind Map
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="text-xs gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Upload Mind Map
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="generate" className="mt-3">
                  <MindMapAdminPanel chapterId={chapterId} topicId={topicId} sections={sections} />
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => onAdd?.('mind_map')}>
                    <Plus className="w-3 h-3 mr-1" /> Add Mind Map
                  </Button>
                </TabsContent>
              </Tabs>
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
            <div className="space-y-6">
              {/* AI-generated published maps (visible to all users) */}
              <AIMindMapCards maps={publishedAIMaps} isLoading={aiMapsLoading} filterBySection={filterBySection} />
              {/* Legacy study_resources mind maps — hide empty state if AI maps exist */}
              <MindMapViewer
                resources={filteredMindMaps}
                canManage={canManage}
                onEdit={onEdit}
                chapterId={chapterId}
                topicId={topicId}
                hideEmptyState={publishedAIMaps.length > 0}
              />
            </div>
          )}
        </TabsContent>

        {/* Infographics */}
        <TabsContent value="infographic" className="mt-4">
          {canManage && (
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => onAdd?.('infographic')}>
                <Plus className="w-3 h-3 mr-1" /> Add Infographic
              </Button>
              <Button size="sm" variant="outline" onClick={() => onBulkUpload?.('infographic')}>
                <Upload className="w-3 h-3 mr-1" /> Bulk Upload
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
      </Tabs>
    </div>
  );
}
