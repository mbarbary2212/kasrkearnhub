import { DashboardData } from '@/hooks/useStudentDashboard';
import { DashboardStatusStrip } from './DashboardStatusStrip';
import { DashboardTodayPlan } from './DashboardTodayPlan';
import { DashboardInsights } from './DashboardInsights';
import { DashboardProgressMap } from './DashboardProgressMap';
import { DashboardWeeklySummary } from './DashboardWeeklySummary';
import { DashboardNeedsPractice } from './DashboardNeedsPractice';
import { BadgesSection } from './BadgesSection';
import { Card, CardContent } from '@/components/ui/card';
import { useNeedsPractice } from '@/hooks/useNeedsPractice';
import { useCheckBadges } from '@/hooks/useBadges';
import { useEffect } from 'react';
interface LearningHubOverviewProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
  moduleId?: string;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

export function LearningHubOverview({ dashboard, moduleSelected, moduleId, onNavigate }: LearningHubOverviewProps) {
  // Fetch needs practice data for the selected module
  const { 
    mcqNeedsPractice, 
    osceNeedsPractice,
    videosToComplete,
    starredFlashcards,
    matchingToComplete,
    essaysToReview,
    casesToReview,
    counts,
  } = useNeedsPractice(moduleId);

  // Check for badge eligibility on dashboard load
  const { mutate: checkBadges } = useCheckBadges();
  
  useEffect(() => {
    if (moduleSelected && dashboard.coveragePercent > 0) {
      checkBadges({ moduleProgress: dashboard.coveragePercent });
    }
  }, [moduleSelected, dashboard.coveragePercent, checkBadges]);

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
        coveragePercent={dashboard.coveragePercent}
        coverageCompleted={dashboard.coverageCompleted}
        coverageTotal={dashboard.coverageTotal}
        chaptersStarted={dashboard.chaptersStarted}
        chaptersTotal={dashboard.chaptersTotal}
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

      {/* Personal Study Coach: Needs Practice */}
      <DashboardNeedsPractice
        mcqNeedsPractice={mcqNeedsPractice}
        osceNeedsPractice={osceNeedsPractice}
        videosToComplete={videosToComplete}
        starredFlashcards={starredFlashcards}
        matchingToComplete={matchingToComplete}
        essaysToReview={essaysToReview}
        casesToReview={casesToReview}
        counts={counts}
        onNavigate={onNavigate}
      />

      {/* Learning Insights */}
      <DashboardInsights 
        insights={dashboard.insights} 
        hasRealAccuracyData={dashboard.hasRealAccuracyData}
      />

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
        weeklyChaptersAdvanced={dashboard.weeklyChaptersAdvanced}
        hasRealAccuracyData={dashboard.hasRealAccuracyData}
      />

      {/* Achievements / Badges */}
      <BadgesSection compact />
    </>
  );
}
