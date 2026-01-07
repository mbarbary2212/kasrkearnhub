import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Stethoscope, RotateCcw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeedsPracticeItem } from '@/hooks/useNeedsPractice';

interface DashboardNeedsPracticeProps {
  mcqNeedsPractice: NeedsPracticeItem[];
  osceNeedsPractice: NeedsPracticeItem[];
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

export function DashboardNeedsPractice({
  mcqNeedsPractice,
  osceNeedsPractice,
  onNavigate,
}: DashboardNeedsPracticeProps) {
  // Don't render if nothing needs practice
  if (mcqNeedsPractice.length === 0 && osceNeedsPractice.length === 0) {
    return null;
  }

  const getScoreBadgeStyle = (score: number) => {
    if (score <= 2) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  return (
    <div className="space-y-4">
      {/* MCQ Needs Practice */}
      {mcqNeedsPractice.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              MCQ Needs Practice
              <Badge variant="secondary" className="ml-auto text-xs">
                {mcqNeedsPractice.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mcqNeedsPractice.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      Attempted
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.attemptCount} attempt{item.attemptCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground truncate">
                    {item.chapterTitle}
                  </p>
                  <p className="text-sm truncate">{item.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => onNavigate(item.moduleId, item.chapterId, 'mcqs')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            ))}
            {mcqNeedsPractice.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{mcqNeedsPractice.length - 5} more needing practice
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* OSCE Needs Practice */}
      {osceNeedsPractice.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" />
              OSCE Needs Practice
              <Badge variant="secondary" className="ml-auto text-xs">
                {osceNeedsPractice.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {osceNeedsPractice.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", getScoreBadgeStyle(item.score ?? 0))}
                    >
                      {item.score}/5
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                    >
                      Needs practice
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground truncate">
                    {item.chapterTitle}
                  </p>
                  <p className="text-sm truncate">{item.title}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => onNavigate(item.moduleId, item.chapterId, 'osce')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </div>
              </div>
            ))}
            {osceNeedsPractice.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{osceNeedsPractice.length - 5} more needing practice
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
