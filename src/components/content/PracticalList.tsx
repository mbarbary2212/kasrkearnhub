import { useState, useMemo, useCallback } from 'react';
import { FlaskConical, Star, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ContentItemActions from '@/components/admin/ContentItemActions';
import { cn } from '@/lib/utils';

interface Practical {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
}

interface PracticalListProps {
  practicals: Practical[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
}

export default function PracticalList({
  practicals,
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
}: PracticalListProps) {
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

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

  return (
    <>
      {/* Filter Bar */}
      <div className="flex justify-between items-center mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-3 w-3" />
              Filters
              {showMarkedOnly && (
                <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredPracticals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {showMarkedOnly 
              ? 'No marked practicals. Click the star icon on any practical to mark it for review.' 
              : 'No practicals available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPracticals.map((practical) => (
            <Card key={practical.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Mark for Review star */}
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
                  <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium">{practical.title}</h3>
                      {moduleId && (
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
                      )}
                    </div>
                    {practical.description && (
                      <p className="text-sm text-muted-foreground mt-1">{practical.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
