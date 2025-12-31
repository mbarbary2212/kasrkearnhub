import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardData } from '@/hooks/useStudentDashboard';
import { LearningHubOverview } from './LearningHubOverview';
import { LearningHubStudyPlan } from './LearningHubStudyPlan';
import { LearningHubUnlocks } from './LearningHubUnlocks';

interface LearningHubTabsProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
  onNavigate: (moduleId: string, chapterId: string) => void;
}

export function LearningHubTabs({ dashboard, moduleSelected, onNavigate }: LearningHubTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/60 p-1">
        <TabsTrigger 
          value="overview" 
          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger 
          value="study-plan"
          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
        >
          Study Plan
        </TabsTrigger>
        <TabsTrigger 
          value="unlocks"
          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
        >
          Unlocks
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <LearningHubOverview 
          dashboard={dashboard} 
          moduleSelected={moduleSelected}
          onNavigate={onNavigate}
        />
      </TabsContent>

      <TabsContent value="study-plan" className="space-y-6">
        <LearningHubStudyPlan moduleSelected={moduleSelected} />
      </TabsContent>

      <TabsContent value="unlocks" className="space-y-6">
        <LearningHubUnlocks 
          dashboard={dashboard} 
          moduleSelected={moduleSelected}
        />
      </TabsContent>
    </Tabs>
  );
}
