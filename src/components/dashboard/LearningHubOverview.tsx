import { DashboardData } from '@/hooks/useStudentDashboard';
import { DashboardStatusStrip } from './DashboardStatusStrip';
import { DashboardTodayPlan } from './DashboardTodayPlan';
import { DashboardInsights } from './DashboardInsights';
import { DashboardProgressMap } from './DashboardProgressMap';
import { DashboardWeeklySummary } from './DashboardWeeklySummary';
import { Card, CardContent } from '@/components/ui/card';

interface LearningHubOverviewProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
  onNavigate: (moduleId: string, chapterId: string) => void;
}

export function LearningHubOverview({ dashboard, moduleSelected, onNavigate }: LearningHubOverviewProps) {
  if (!moduleSelected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Select a module above to view your progress overview.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Core Status Strip */}
      <DashboardStatusStrip
        examReadiness={dashboard.examReadiness}
        coverageCompleted={dashboard.coverageCompleted}
        coverageTotal={dashboard.coverageTotal}
        studyStreak={dashboard.studyStreak}
      />

      {/* Today's Suggested Plan */}
      <DashboardTodayPlan 
        suggestions={dashboard.suggestions}
        onNavigate={(moduleId, chapterId) => {
          if (chapterId && moduleId) {
            onNavigate(moduleId, chapterId);
          }
        }}
      />

      {/* Learning Insights */}
      <DashboardInsights insights={dashboard.insights} />

      {/* Course Progress Map */}
      <DashboardProgressMap 
        chapters={dashboard.chapters}
        onChapterClick={(moduleId, chapterId) => {
          onNavigate(moduleId, chapterId);
        }}
      />

      {/* Weekly Summary Preview */}
      <DashboardWeeklySummary
        weeklyTimeMinutes={dashboard.weeklyTimeMinutes}
        weeklyAccuracyTrend={dashboard.weeklyAccuracyTrend}
        weeklyChaptersAdvanced={dashboard.weeklyChaptersAdvanced}
      />
    </>
  );
}
