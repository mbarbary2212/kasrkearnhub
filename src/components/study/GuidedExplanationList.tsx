import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircleQuestion, 
  ChevronRight, 
  Pencil, 
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StudyResource, GuidedExplanationContent } from '@/hooks/useStudyResources';
import { GuidedExplanationViewer } from './GuidedExplanationViewer';
import { GuidedExplanationAdminTable } from './GuidedExplanationAdminTable';
import { AdminViewToggle, type ViewMode } from '@/components/admin/AdminViewToggle';
import { useChapterSections } from '@/hooks/useSections';
import { cn } from '@/lib/utils';
import { useTrackContentView } from '@/hooks/useTrackContentView';

interface GuidedExplanationListProps {
  resources: StudyResource[];
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (id: string) => void;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
}

export function GuidedExplanationList({
  resources,
  canManage = false,
  onEdit,
  onDelete,
  chapterId,
  topicId,
}: GuidedExplanationListProps) {
  const [selectedResource, setSelectedResource] = useState<StudyResource | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const trackView = useTrackContentView();
  
  // Fetch sections for admin table - use prop or fall back to first resource
  const resolvedChapterId = chapterId || resources[0]?.chapter_id;
  const { data: sections = [] } = useChapterSections(resolvedChapterId);

  const handleSelectResource = (resource: StudyResource) => {
    setSelectedResource(resource);
    trackView.mutate({
      contentType: 'guided_explanation',
      contentId: resource.id,
      chapterId: chapterId || resource.chapter_id || undefined,
      topicId: topicId || resource.topic_id || undefined,
    });
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircleQuestion className="w-6 h-6 text-primary" />
        </div>
        <p className="text-muted-foreground">
          No guided explanations yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Guided explanations use the Socratic method to help you discover answers through reasoning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin View Toggle */}
      {canManage && (
        <div className="flex justify-end">
          <AdminViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && canManage ? (
        <GuidedExplanationAdminTable
          resources={resources}
          sections={sections}
          chapterId={resolvedChapterId}
          moduleId={resources[0]?.module_id}
          onEdit={(r) => onEdit?.(r)}
          onDelete={(id) => onDelete?.(id)}
        />
      ) : (
        /* Cards Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const content = resource.content as GuidedExplanationContent;
            const questionCount = content.guided_questions?.length || 0;

            return (
              <Card
                key={resource.id}
                className={cn(
                  "group cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  "flex flex-col"
                )}
                onClick={() => handleSelectResource(resource)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <MessageCircleQuestion className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-base line-clamp-2">
                        {resource.title}
                      </CardTitle>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(resource);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(resource.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {content.topic && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {content.topic}
                    </p>
                  )}

                  <div className="flex-1" />

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      Start
                      <ChevronRight className="w-3 h-3" />
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fullscreen Viewer Dialog */}
      <Dialog 
        open={!!selectedResource} 
        onOpenChange={(open) => !open && setSelectedResource(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          {selectedResource && (
            <GuidedExplanationViewer
              title={selectedResource.title}
              content={selectedResource.content as GuidedExplanationContent}
              resourceId={selectedResource.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
