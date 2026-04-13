import { DashboardData } from '@/hooks/useStudentDashboard';
import { DashboardStatusStrip } from './DashboardStatusStrip';
import { DashboardTodayPlan } from './DashboardTodayPlan';
import { DashboardInsights } from './DashboardInsights';
import { DashboardProgressMap } from './DashboardProgressMap';
import { DashboardNeedsPractice } from './DashboardNeedsPractice';
import { DashboardTestProgress } from './DashboardTestProgress';
import { DashboardWeakTopics } from './DashboardWeakTopics';
import { BadgesSection } from './BadgesSection';
import { TrendingQuestionsCard } from './TrendingQuestionsCard';
import { ChapterHealthHeatmap } from './ChapterHealthHeatmap';
import { StudyStreakCalendar } from './StudyStreakCalendar';
import { LearningPatternSummary } from './LearningPatternSummary';
import { WeeklyProgressReport } from './WeeklyProgressReport';
import { DashboardRiskAlerts } from './DashboardRiskAlerts';
import { ClinicalThinkingPanel } from './ClinicalThinkingPanel';
import { Card, CardContent } from '@/components/ui/card';
import { useNeedsPractice } from '@/hooks/useNeedsPractice';
import { useCheckBadges } from '@/hooks/useBadges';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCaseReasoningProfile } from '@/hooks/useCaseReasoningProfile';
import { useDailyStudyPlan } from '@/hooks/useDailyStudyPlan';
import { useEffect, useMemo } from 'react';

interface LearningHubOverviewProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
  moduleId?: string;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

export function LearningHubOverview({ dashboard, moduleSelected, moduleId, onNavigate }: LearningHubOverviewProps) {
  const { user } = useAuthContext();
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

  const { mutate: checkBadges } = useCheckBadges();
  const { data: reasoningProfile } = useCaseReasoningProfile(user?.id, moduleId);
  
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
      {/* Risk Alerts — urgent warnings above everything */}
      <DashboardRiskAlerts alerts={dashboard.riskAlerts} />

      {/* Core Status Strip with Sparkline */}
      <DashboardStatusStrip
        examReadiness={dashboard.examReadiness}
        coveragePercent={dashboard.coveragePercent}
        coverageCompleted={dashboard.coverageCompleted}
        coverageTotal={dashboard.coverageTotal}
        chaptersStarted={dashboard.chaptersStarted}
        chaptersTotal={dashboard.chaptersTotal}
        studyStreak={dashboard.studyStreak}
        readinessResult={dashboard.readinessResult}
        readinessTrend={dashboard.readinessTrend}
        examReadinessIndicator={dashboard.examReadinessIndicator}
      />

      {/* Study Coach Insights — top placement for visibility */}
      <DashboardInsights 
        insights={dashboard.insights} 
        hasRealAccuracyData={dashboard.hasRealAccuracyData}
      />

      {/* Today's Adaptive Study Plan */}
      <DashboardTodayPlan 
        suggestions={dashboard.suggestions}
        studyPlan={dashboard.studyPlan}
        confidenceInsight={dashboard.confidenceInsight}
        onNavigate={(moduleId, chapterId, tab, subtab) => {
          if (chapterId && moduleId) {
            onNavigate(moduleId, chapterId, tab);
          }
        }}
      />

      {/* Weak Topics Alert */}
      {dashboard.weakChapters && dashboard.weakChapters.length > 0 && (
        <DashboardWeakTopics
          weakChapters={dashboard.weakChapters}
          onNavigate={(moduleId, chapterId, tab) => {
            onNavigate(moduleId, chapterId, tab || 'practice');
          }}
        />
      )}

      {/* Chapter Health Heatmap */}
      <ChapterHealthHeatmap
        metrics={dashboard.chapterMetrics}
        chapterTitleMap={dashboard.chapterTitleMap}
        onChapterClick={(chapterId, moduleId) => onNavigate(moduleId, chapterId)}
      />

      {/* Learning Pattern Summary */}
      <LearningPatternSummary metrics={dashboard.chapterMetrics} />

      {/* Clinical Thinking Profile — only shown with ≥5 case attempts */}
      {reasoningProfile && <ClinicalThinkingPanel profile={reasoningProfile} />}

      {/* Test Performance Indicators */}
      <DashboardTestProgress moduleId={moduleId} />

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

      {/* Study Streak Calendar */}
      <StudyStreakCalendar
        activityDates={dashboard.activityDates}
        studyStreak={dashboard.studyStreak}
      />


      {/* Course Progress Map */}
      <DashboardProgressMap 
        chapters={dashboard.chapters}
        onChapterClick={(moduleId, chapterId) => {
          onNavigate(moduleId, chapterId);
        }}
      />

      {/* Weekly Progress Report */}
      <WeeklyProgressReport
        weeklyTimeMinutes={dashboard.weeklyTimeMinutes}
        weeklyChaptersAdvanced={dashboard.weeklyChaptersAdvanced}
        hasRealAccuracyData={dashboard.hasRealAccuracyData}
        metrics={dashboard.chapterMetrics}
        chapterTitleMap={dashboard.chapterTitleMap}
      />

      {/* Trending Questions */}
      <TrendingQuestionsCard
        moduleId={moduleId}
        onNavigate={(moduleId, chapterId) => onNavigate(moduleId, chapterId)}
      />

      {/* Achievements / Badges */}
      <BadgesSection compact />
    </>
  );
}
