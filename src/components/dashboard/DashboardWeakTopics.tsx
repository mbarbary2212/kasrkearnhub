import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { WeakChapter } from '@/hooks/useStudentDashboard';

interface DashboardWeakTopicsProps {
  weakChapters: WeakChapter[];
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

export function DashboardWeakTopics({ weakChapters, onNavigate }: DashboardWeakTopicsProps) {
  if (weakChapters.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="py-3 px-4">
        <div className="space-y-2">
          {weakChapters.map((ch) => (
            <div key={ch.chapterId} className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Weak in: <span className="text-amber-700 dark:text-amber-300">{ch.chapterTitle}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {ch.accuracy}% accuracy · {ch.attempts} attempts
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => onNavigate(ch.moduleId, ch.chapterId, 'practice')}
              >
                Practice now
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
