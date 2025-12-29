import { useState, useMemo, useCallback } from 'react';
import { FlaskConical, Star, Filter, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ContentItemActions from '@/components/admin/ContentItemActions';
import { cn } from '@/lib/utils';
import { useContentDelete } from '@/hooks/useContentDelete';

interface Practical {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  is_deleted?: boolean;
}

interface PracticalListProps {
  practicals: Practical[];
  deletedPracticals?: Practical[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
}

export default function PracticalList({
  practicals,
  deletedPracticals = [],
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: PracticalListProps) {
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  const { doRestore } = useContentDelete('practicals', moduleId || '', chapterId);

  const toggleMark = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const filteredPracticals = useMemo(() => {
    if (showMarkedOnly) {
      return practicals.filter(practical => markedIds.has(practical.id));
    }
    return practicals;
  }, [practicals, showMarkedOnly, markedIds]);

  if (practicals.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No practicals available yet.</p>
      </div>
    );
  }

  // Combine active and deleted practicals when showing deleted
  const displayPracticals = showDeleted ? [...practicals, ...deletedPracticals] : practicals;

  return (
    <>
      {/* Filter Bar */}
      <div className="flex justify-between items-center mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-3 w-3" />
              Filters
              {(showMarkedOnly || showDeleted) && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {(showMarkedOnly ? 1 : 0) + (showDeleted ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={showMarkedOnly}
              onCheckedChange={setShowMarkedOnly}
            >
              <Star className="h-3 w-3 mr-2 text-amber-500" />
              Marked for review ({markedIds.size})
            </DropdownMenuCheckboxItem>
            {showDeletedToggle && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showDeleted}
                  onCheckedChange={(checked) => onShowDeletedChange?.(!!checked)}
                >
                  <Trash2 className="h-3 w-3 mr-2 text-destructive" />
                  Show deleted ({deletedPracticals.length})
                </DropdownMenuCheckboxItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {displayPracticals.length === 0 && filteredPracticals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {showMarkedOnly 
              ? 'No marked practicals. Click the star icon on any practical to mark it for review.' 
              : 'No practicals available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(showMarkedOnly ? filteredPracticals : displayPracticals).map((practical) => {
            const isDeleted = practical.is_deleted;
            return (
              <Card 
                key={practical.id} 
                className={cn(
                  "hover:shadow-md transition-shadow",
                  isDeleted && "opacity-60 border-destructive/30 bg-destructive/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Mark for Review star */}
                    {!isDeleted && (
                      <button
                        onClick={(e) => toggleMark(practical.id, e)}
                        className={cn(
                          'p-1 rounded-full transition-colors hover:bg-muted shrink-0 mt-1',
                          markedIds.has(practical.id) ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                        )}
                        title={markedIds.has(practical.id) ? 'Remove from review' : 'Mark for review'}
                      >
                        <Star className={cn('h-4 w-4', markedIds.has(practical.id) && 'fill-current')} />
                      </button>
                    )}
                    <div className={cn(
                      "w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0",
                      isDeleted && "opacity-50"
                    )}>
                      <FlaskConical className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {isDeleted && (
                            <Badge variant="destructive" className="text-xs">Deleted</Badge>
                          )}
                          <h3 className={cn("font-medium", isDeleted && "line-through")}>{practical.title}</h3>
                        </div>
                        {isDeleted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => doRestore(practical.id, practical.title)}
                            className="h-8 gap-2 text-emerald-600 hover:text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </Button>
                        ) : (
                          moduleId && (
                            <ContentItemActions
                              id={practical.id}
                              title={practical.title}
                              description={practical.description}
                              videoUrl={practical.video_url}
                              contentType="practical"
                              moduleId={moduleId}
                              chapterId={chapterId}
                              canEdit={canEdit}
                              canDelete={canDelete}
                              showFeedback={showFeedback}
                            />
                          )
                        )}
                      </div>
                      {practical.description && !isDeleted && (
                        <p className="text-sm text-muted-foreground mt-1">{practical.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
