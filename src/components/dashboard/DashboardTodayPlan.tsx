import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileQuestion, Play, FileText, Clock, ChevronRight, ArrowRight, GalleryHorizontal, Lightbulb } from 'lucide-react';
import type { SuggestedItem } from '@/hooks/useStudentDashboard';

interface DashboardTodayPlanProps {
  suggestions: SuggestedItem[];
  onNavigate: (moduleId?: string, chapterId?: string, tab?: string, subtab?: string) => void;
  confidenceInsight?: string | null;
}

const iconMap: Record<string, React.ElementType> = {
  read: BookOpen,
  mcq: FileQuestion,
  video: Play,
  essay: FileText,
  flashcard: GalleryHorizontal,
  review: ArrowRight,
};

const trendIndicator: Record<string, { icon: string; className: string }> = {
  declining: { icon: '↓', className: 'text-destructive' },
  improving: { icon: '↑', className: 'text-emerald-600 dark:text-emerald-400' },
  stable: { icon: '', className: '' },
};

export function DashboardTodayPlan({ suggestions, onNavigate, confidenceInsight }: DashboardTodayPlanProps) {
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Suggested for Today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No suggestions available yet. Start exploring your course content to receive personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const primarySuggestion = suggestions.find(s => s.isPrimary);
  const otherSuggestions = suggestions.filter(s => !s.isPrimary);
  const totalMinutes = suggestions.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Suggested for Today</CardTitle>
            {totalMinutes > 0 && (
              <p className="text-xs text-muted-foreground mt-1">~{totalMinutes} min total</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Start Here — Primary Action */}
        {primarySuggestion && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group bg-primary/5 hover:bg-primary/10 border border-primary/20"
            onClick={() => {
              const tab = primarySuggestion.type === 'mcq' || primarySuggestion.type === 'essay' ? 'practice' : 'resources';
              onNavigate(primarySuggestion.moduleId, primarySuggestion.chapterId, tab, primarySuggestion.subtab);
            }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
              {(() => { const Icon = iconMap[primarySuggestion.type] || BookOpen; return <Icon className="w-5 h-5 text-primary" />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">▶ Start Here</p>
              <p className="font-medium truncate text-foreground">{primarySuggestion.title}</p>
              {primarySuggestion.reason && (
                <p className="text-xs text-muted-foreground">
                  {primarySuggestion.trend && primarySuggestion.trend !== 'stable' && (
                    <span className={`font-medium ${trendIndicator[primarySuggestion.trend]?.className || ''} mr-1`}>
                      {trendIndicator[primarySuggestion.trend]?.icon}
                    </span>
                  )}
                  {primarySuggestion.reason}{primarySuggestion.estimatedMinutes ? ` · ~${primarySuggestion.estimatedMinutes} min` : ''}</p>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </div>
        )}

        {/* Other suggestions */}
        {otherSuggestions.length > 0 && (
          <div className="space-y-1.5">
            {otherSuggestions.map((item, idx) => {
              const Icon = iconMap[item.type] || BookOpen;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors bg-muted/50 hover:bg-muted group"
                  onClick={() => {
                    const tab = item.type === 'mcq' || item.type === 'essay' ? 'practice' : 'resources';
                    onNavigate(item.moduleId, item.chapterId, tab, item.subtab);
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-secondary">
                    <Icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.trend && item.trend !== 'stable' && (
                          <span className={`font-medium ${trendIndicator[item.trend]?.className || ''} mr-1`}>
                            {trendIndicator[item.trend]?.icon}
                          </span>
                        )}
                        {item.reason}{item.estimatedMinutes ? ` · ~${item.estimatedMinutes} min` : ''}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* Confidence Insight — one optional smart insight */}
        {confidenceInsight && (
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{confidenceInsight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
