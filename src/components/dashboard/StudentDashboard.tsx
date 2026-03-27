import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useActiveYear } from '@/contexts/ActiveYearContext';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useTestProgress } from '@/hooks/useTestProgress';
import { useYears } from '@/hooks/useYears';
import { useModules } from '@/hooks/useModules';
import { DashboardHeader } from './DashboardHeader';
import { LearningHubTabs } from './LearningHubTabs';
import { LearningHubEmptyState } from './LearningHubEmptyState';
import { ExportReportDropdown } from './ExportReportDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DashboardStatusStripSkeleton,
  DashboardTestProgressSkeleton,
  DashboardProgressMapSkeleton,
  WeeklySummarySkeleton,
} from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import { HomeAnnouncementAlert } from '@/components/announcements/HomeAnnouncementAlert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, BookOpen, ArrowLeft } from 'lucide-react';

export function StudentDashboard() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const moduleSelectRef = useRef<HTMLButtonElement>(null);
  const { activeYear } = useActiveYear();
  
  // Filter state
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  // Fetch years to resolve activeYear to an ID
  const { data: years, isLoading: yearsLoading } = useYears();
  
  // Derive selectedYearId from activeYear context
  const selectedYearId = years?.find(y => y.number === activeYear?.yearNumber)?.id || '';
  
  const { data: modules, isLoading: modulesLoading } = useModules(selectedYearId || undefined);
  
  const moduleSelected = !!selectedModuleId && selectedModuleId !== 'all';

  // Fetch test progress (shared data — also used by DashboardTestProgress)
  const { data: testProgress, isLoading: testProgressLoading } = useTestProgress(
    moduleSelected ? selectedModuleId : undefined
  );

  // Fetch dashboard with filters — passes testProgress to avoid duplicate fetch
  const { data: dashboard, isLoading: dashboardLoading } = useStudentDashboard({
    yearId: selectedYearId || undefined,
    moduleId: selectedModuleId || undefined,
  }, testProgress);

  const isLoading = yearsLoading;

  const handleSelectModuleClick = () => {
    // Focus the module select dropdown
    moduleSelectRef.current?.click();
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const selectedYear = years?.find(y => y.id === selectedYearId);
  const selectedModule = modules?.find(m => m.id === selectedModuleId);

  // Build exam target text
  let examTarget = selectedYear?.name || 'Academic Year';
  if (selectedModule) {
    examTarget = selectedModule.name;
  }


  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto overflow-x-hidden">
      {/* Announcements */}
      <HomeAnnouncementAlert />

      {/* Page Title */}
      <div className="flex items-center gap-3 mb-1">
        <GraduationCap className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-heading font-bold">Personal Study Coach</h1>
      </div>

      {/* Study Context Strip - Compact version */}
      <Card className="bg-muted/30 border-border/40">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col gap-3">
            {/* Header row: Study Context label + Back button (mobile) */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Study Context
              </span>
              
              {/* Mobile: Back button next to Study Context */}
              <div className="sm:hidden">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900"
                  onClick={() => selectedYear && navigate(`/year/${selectedYear.number}`)}
                  disabled={!selectedYear}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Year
                </Button>
              </div>
            </div>

            {/* Dropdowns row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Year and Module Dropdowns */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Year Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Year:</span>
                  <Select value={selectedYearId} onValueChange={handleYearChange}>
                    <SelectTrigger className="h-8 w-[160px] bg-background text-sm">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years?.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="hidden sm:inline text-muted-foreground/40">|</span>

                {/* Module Dropdown */}
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <Select 
                    value={selectedModuleId} 
                    onValueChange={setSelectedModuleId}
                    disabled={!selectedYearId}
                  >
                    <SelectTrigger ref={moduleSelectRef} className="h-8 w-[220px] bg-background text-sm">
                      <SelectValue placeholder={selectedYearId ? "Select module" : "Select year first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {modules?.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!moduleSelected && selectedYearId && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Required</span>
                  )}
                </div>
              </div>

              {/* Desktop/Tablet: Back button and Export */}
              <div className="hidden sm:flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900"
                  onClick={() => selectedYear && navigate(`/year/${selectedYear.number}`)}
                  disabled={!selectedYear}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Year
                </Button>
                {moduleSelected && dashboard && (
                  <ExportReportDropdown
                    dashboard={dashboard}
                    yearName={selectedYear?.name || ''}
                    moduleName={selectedModule?.name || ''}
                    studentName={firstName}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile: Export Report - Full width below context strip */}
      {moduleSelected && dashboard && (
        <div className="sm:hidden">
          <ExportReportDropdown
            dashboard={dashboard}
            yearName={selectedYear?.name || ''}
            moduleName={selectedModule?.name || ''}
            studentName={firstName}
            fullWidth
          />
        </div>
      )}

      {/* Header with context */}
      <DashboardHeader 
        firstName={firstName} 
        examTarget={examTarget}
      />

      {/* Content based on module selection */}
      {!moduleSelected ? (
        <LearningHubEmptyState onSelectModule={handleSelectModuleClick} />
      ) : (dashboardLoading || testProgressLoading) ? (
        <DashboardContentSkeleton />
      ) : dashboard ? (
        <LearningHubTabs 
          dashboard={dashboard}
          moduleSelected={moduleSelected}
          modules={modules || []}
          selectedYearName={selectedYear?.name || ''}
          selectedYearId={selectedYearId}
          selectedModuleId={selectedModuleId || undefined}
          onNavigate={(moduleId, chapterId, tab) => {
            const tabParam = tab ? `?tab=${tab}` : '';
            navigate(`/module/${moduleId}/chapter/${chapterId}${tabParam}`);
          }}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Unable to load dashboard data. Please try again.
          </CardContent>
        </Card>
      )}

      {/* Year Overview Coming Soon - Always visible at bottom */}
      <Card className="border-dashed mt-8">
        <CardContent className="py-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">Year Overview (Coming Soon)</p>
          <p className="text-xs text-muted-foreground mt-1">
            A summary of your progress across all modules in the selected year will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <DashboardStatusStripSkeleton />
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Status Strip */}
      <DashboardStatusStripSkeleton />
      
      {/* Today's Plan */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Test Progress */}
      <DashboardTestProgressSkeleton />
      
      {/* Progress Map */}
      <DashboardProgressMapSkeleton />
      
      {/* Weekly Summary */}
      <WeeklySummarySkeleton />
    </div>
  );
}
