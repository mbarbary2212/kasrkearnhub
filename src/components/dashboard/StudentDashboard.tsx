import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useYears } from '@/hooks/useYears';
import { useModules } from '@/hooks/useModules';
import { DashboardHeader } from './DashboardHeader';
import { LearningHubTabs } from './LearningHubTabs';
import { LearningHubEmptyState } from './LearningHubEmptyState';
import { ExportReportDropdown } from './ExportReportDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { HomeAnnouncementAlert } from '@/components/announcements/HomeAnnouncementAlert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, BookOpen, ArrowLeft } from 'lucide-react';

const LAST_SELECTED_YEAR_KEY = 'kasrlearn_last_selected_year';

export function StudentDashboard() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const moduleSelectRef = useRef<HTMLButtonElement>(null);
  
  // Filter state
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  // Fetch years and modules for dropdowns
  const { data: years, isLoading: yearsLoading } = useYears();
  const { data: modules, isLoading: modulesLoading } = useModules(selectedYearId || undefined);
  
  // Auto-select year on load
  useEffect(() => {
    if (years && years.length > 0 && !selectedYearId) {
      // Try to get last selected year from localStorage
      const lastSelectedYear = localStorage.getItem(LAST_SELECTED_YEAR_KEY);
      
      if (lastSelectedYear && years.find(y => y.id === lastSelectedYear)) {
        setSelectedYearId(lastSelectedYear);
      } else {
        // Default to first year
        setSelectedYearId(years[0].id);
      }
    }
  }, [years, selectedYearId]);

  // Save selected year to localStorage when it changes
  useEffect(() => {
    if (selectedYearId && selectedYearId !== 'all') {
      localStorage.setItem(LAST_SELECTED_YEAR_KEY, selectedYearId);
    }
  }, [selectedYearId]);
  
  // Fetch dashboard with filters - only when module is selected
  const { data: dashboard, isLoading: dashboardLoading } = useStudentDashboard({
    yearId: selectedYearId || undefined,
    moduleId: selectedModuleId || undefined,
  });

  const isLoading = yearsLoading;

  // Reset module when year changes
  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedModuleId(''); // Reset module selection
  };

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

  const moduleSelected = !!selectedModuleId && selectedModuleId !== 'all';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Announcements */}
      <HomeAnnouncementAlert />

      {/* Page Title */}
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-heading font-bold">My Learning Hub</h1>
      </div>

      {/* Study Context Strip - Enhanced visibility */}
      <Card className="bg-muted/50 border-border/60">
        <CardContent className="py-5 px-6">
          <div className="flex flex-col gap-4">
            {/* Context Label */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Study Context
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/year/${selectedYearId}`)}
                  disabled={!selectedYearId}
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

            {/* Divider */}
            <div className="h-px bg-border/60" />

            {/* Year and Module Selection */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Year Display */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Year:</span>
                <Select value={selectedYearId} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[200px] bg-background">
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

              <span className="text-muted-foreground/50">|</span>

              {/* Module Selection - Required */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  Module:
                </span>
                <Select 
                  value={selectedModuleId} 
                  onValueChange={setSelectedModuleId}
                  disabled={!selectedYearId}
                >
                  <SelectTrigger ref={moduleSelectRef} className="w-[280px] bg-background">
                    <SelectValue placeholder={selectedYearId ? "Select a module to continue" : "Select year first"} />
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
          </div>
        </CardContent>
      </Card>

      {/* Header with context */}
      <DashboardHeader 
        firstName={firstName} 
        examTarget={examTarget}
      />

      {/* Content based on module selection */}
      {!moduleSelected ? (
        <LearningHubEmptyState onSelectModule={handleSelectModuleClick} />
      ) : dashboardLoading ? (
        <DashboardContentSkeleton />
      ) : dashboard ? (
        <LearningHubTabs 
          dashboard={dashboard}
          moduleSelected={moduleSelected}
          onNavigate={(moduleId, chapterId) => {
            navigate(`/module/${moduleId}/chapter/${chapterId}`);
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
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
