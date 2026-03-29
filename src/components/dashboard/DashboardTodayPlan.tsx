import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileQuestion, Play, FileText, Clock, ChevronRight } from 'lucide-react';
import type { SuggestedItem } from '@/hooks/useStudentDashboard';

interface DashboardTodayPlanProps {
  suggestions: SuggestedItem[];
  onNavigate: (moduleId?: string, chapterId?: string) => void;
}

const iconMap = {
  read: BookOpen,
  mcq: FileQuestion,
  video: Play,
  essay: FileText,
};

const labelMap = {
  read: 'Read',
  mcq: 'Practice',
  video: 'Watch',
  essay: 'Review',
};

export function DashboardTodayPlan({ suggestions, onNavigate }: DashboardTodayPlanProps) {
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

  // Separate primary (book study) and secondary suggestions
  const primarySuggestions = suggestions.filter(s => s.type === 'read');
  const secondarySuggestions = suggestions.filter(s => s.type !== 'read');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading">Suggested for Today</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Book-First Approach</p>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Change Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Focus: Book Study */}
        {primarySuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Primary Focus
            </p>
            {primarySuggestions.map((item, idx) => (
              <SuggestionCard
                key={idx}
                item={item}
                isPrimary
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}

        {/* Secondary: App Support */}
        {secondarySuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              App Support (Optional)
            </p>
            <div className="grid gap-2">
              {secondarySuggestions.map((item, idx) => (
                <SuggestionCard
                  key={idx}
                  item={item}
                  isPrimary={false}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SuggestionCardProps {
  item: SuggestedItem;
  isPrimary: boolean;
  onNavigate: (moduleId?: string, chapterId?: string) => void;
}

function SuggestionCard({ item, isPrimary, onNavigate }: SuggestionCardProps) {
  const Icon = iconMap[item.type];
  const label = labelMap[item.type];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group ${
        isPrimary 
          ? 'bg-primary/5 hover:bg-primary/10 border border-primary/20' 
          : 'bg-muted/50 hover:bg-muted'
      }`}
      onClick={() => onNavigate(item.moduleId, item.chapterId)}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
        isPrimary ? 'bg-primary/10' : 'bg-secondary'
      }`}>
        <Icon className={`w-5 h-5 ${isPrimary ? 'text-primary' : 'text-secondary-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isPrimary ? 'text-primary' : 'text-muted-foreground'}`}>
            {label}
          </span>
        </div>
        <p className={`font-medium truncate ${isPrimary ? 'text-foreground' : 'text-sm text-foreground'}`}>
          {item.title}
        </p>
        {item.chapterTitle && (
          <p className="text-xs text-muted-foreground truncate">{item.chapterTitle}</p>
        )}
      </div>
      {item.estimatedMinutes && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>{item.estimatedMinutes} min</span>
        </div>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </div>
  );
}
