import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { GoalsAndScheduleTab } from '@/components/settings/GoalsAndScheduleTab';
import { ContentPreferencesTab } from '@/components/settings/ContentPreferencesTab';
import { AccountTab } from '@/components/settings/AccountTab';
import { useStudentGoals, computeGoalsProgress } from '@/hooks/useStudentGoals';

export default function StudentSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'goals';
  const { data: goals } = useStudentGoals();
  const progress = computeGoalsProgress(goals ?? null);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-heading font-bold">Settings</h1>
          </div>
          {progress > 0 && (
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Plan {progress}%</span>
              <Progress value={progress} className="h-2 flex-1" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="goals">Goals & Schedule</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="goals">
            <GoalsAndScheduleTab />
          </TabsContent>

          <TabsContent value="content">
            <ContentPreferencesTab />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
