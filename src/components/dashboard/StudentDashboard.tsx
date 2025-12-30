import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useYears } from '@/hooks/useYears';
import { useModules } from '@/hooks/useModules';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStatusStrip } from './DashboardStatusStrip';
import { DashboardTodayPlan } from './DashboardTodayPlan';
import { DashboardInsights } from './DashboardInsights';
import { DashboardProgressMap } from './DashboardProgressMap';
import { DashboardWeeklySummary } from './DashboardWeeklySummary';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeAnnouncementAlert } from '@/components/announcements/HomeAnnouncementAlert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter } from 'lucide-react';

export function StudentDashboard() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  
  // Filter state
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  // Fetch years and modules for dropdowns
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: modules, isLoading: modulesLoading } = useModules(selectedYearId || undefined);
  
  // Fetch dashboard with filters
  const { data: dashboard, isLoading: dashboardLoading } = useStudentDashboard({
    yearId: selectedYearId || undefined,
    moduleId: selectedModuleId || undefined,
  });

  const isLoading = yearsLoading || dashboardLoading;

  // Reset module when year changes
  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedModuleId(''); // Reset module selection
  };

  if (isLoading && !dashboard) {
    return <DashboardSkeleton />;
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  // Build exam target text
  let examTarget = 'All Courses';
  if (dashboard?.selectedYearName) {
    examTarget = dashboard.selectedYearName;
    if (dashboard.selectedModuleName) {
      examTarget = dashboard.selectedModuleName;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Announcements */}
      <HomeAnnouncementAlert />

      {/* Filter Section */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter Progress:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedYearId} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years?.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedModuleId} 
                onValueChange={setSelectedModuleId}
                disabled={!selectedYearId || selectedYearId === 'all'}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={selectedYearId && selectedYearId !== 'all' ? "Select Module" : "Select year first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules?.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Header */}
      <DashboardHeader 
        firstName={firstName} 
        examTarget={examTarget}
      />

      {dashboard && (
        <>
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
        </>
      )}

      {!dashboard && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select a year to view your progress.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
