import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react';
import type { ChapterStatus } from '@/hooks/useStudentDashboard';

interface DashboardProgressMapProps {
  chapters: ChapterStatus[];
  onChapterClick: (moduleId: string, chapterId: string) => void;
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    badgeClass: 'bg-accent/10 text-accent border-accent/20',
    iconClass: 'text-accent',
  },
  in_progress: {
    icon: Clock,
    label: 'In Progress',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    iconClass: 'text-primary',
  },
  not_started: {
    icon: Circle,
    label: 'Not Started',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    iconClass: 'text-muted-foreground',
  },
};

export function DashboardProgressMap({ chapters, onChapterClick }: DashboardProgressMapProps) {
  // Group chapters by module
  const groupedByModule = chapters.reduce((acc, chapter) => {
    if (!acc[chapter.moduleId]) {
      acc[chapter.moduleId] = {
        moduleName: chapter.moduleName,
        chapters: [],
      };
    }
    acc[chapter.moduleId].chapters.push(chapter);
    return acc;
  }, {} as Record<string, { moduleName: string; chapters: ChapterStatus[] }>);

  const modules = Object.entries(groupedByModule);

  if (chapters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Course Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No course content available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">Course Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {modules.map(([moduleId, { moduleName, chapters: moduleChapters }]) => (
          <div key={moduleId}>
            <h3 className="text-sm font-semibold text-foreground mb-3">{moduleName}</h3>
            <div className="grid gap-2">
              {moduleChapters.slice(0, 8).map((chapter) => (
                <ChapterRow
                  key={chapter.id}
                  chapter={chapter}
                  onClick={() => onChapterClick(chapter.moduleId, chapter.id)}
                />
              ))}
              {moduleChapters.length > 8 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{moduleChapters.length - 8} more chapters
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface ChapterRowProps {
  chapter: ChapterStatus;
  onClick: () => void;
}

function ChapterRow({ chapter, onClick }: ChapterRowProps) {
  const config = statusConfig[chapter.status];
  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex-shrink-0">
        <Icon className={`w-5 h-5 ${config.iconClass}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {chapter.bookLabel && (
            <span className="text-xs text-muted-foreground">{chapter.bookLabel}</span>
          )}
          <span className="text-xs text-muted-foreground">Ch. {chapter.chapterNumber}</span>
        </div>
        <p className="font-medium text-sm text-foreground truncate">{chapter.title}</p>
      </div>

      {chapter.status === 'in_progress' && chapter.totalItems > 0 && (
        <div className="flex-shrink-0 w-24">
          <Progress value={chapter.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {chapter.progress}%
          </p>
        </div>
      )}

      {chapter.status === 'completed' && (
        <Badge variant="outline" className={config.badgeClass}>
          Done
        </Badge>
      )}

      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </div>
  );
}
