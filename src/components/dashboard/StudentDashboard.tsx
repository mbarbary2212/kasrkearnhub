import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStatusStrip } from './DashboardStatusStrip';
import { DashboardTodayPlan } from './DashboardTodayPlan';
import { DashboardInsights } from './DashboardInsights';
import { DashboardProgressMap } from './DashboardProgressMap';
import { DashboardWeeklySummary } from './DashboardWeeklySummary';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeAnnouncementAlert } from '@/components/announcements/HomeAnnouncementAlert';

export function StudentDashboard() {
  const { profile } = useAuthContext();
  const { data: dashboard, isLoading } = useStudentDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!dashboard) {
    return null;
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Announcements */}
      <HomeAnnouncementAlert />

      {/* 1. Header */}
      <DashboardHeader 
        firstName={firstName} 
        examTarget="Final Examination" 
      />

      {/* 2. Core Status Strip */}
      <DashboardStatusStrip
        examReadiness={dashboard.examReadiness}
        coverageCompleted={dashboard.coverageCompleted}
        coverageTotal={dashboard.coverageTotal}
        studyStreak={dashboard.studyStreak}
      />

      {/* 3. Today's Suggested Plan */}
      <DashboardTodayPlan 
        suggestions={dashboard.suggestions}
        onNavigate={(moduleId, chapterId) => {
          if (chapterId && moduleId) {
            navigate(`/module/${moduleId}/chapter/${chapterId}`);
          }
        }}
      />

      {/* 4. Learning Insights */}
      <DashboardInsights insights={dashboard.insights} />

      {/* 5. Course Progress Map */}
      <DashboardProgressMap 
        chapters={dashboard.chapters}
        onChapterClick={(moduleId, chapterId) => {
          navigate(`/module/${moduleId}/chapter/${chapterId}`);
        }}
      />

      {/* 6. Weekly Summary Preview */}
      <DashboardWeeklySummary
        weeklyTimeMinutes={dashboard.weeklyTimeMinutes}
        weeklyAccuracyTrend={dashboard.weeklyAccuracyTrend}
        weeklyChaptersAdvanced={dashboard.weeklyChaptersAdvanced}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
