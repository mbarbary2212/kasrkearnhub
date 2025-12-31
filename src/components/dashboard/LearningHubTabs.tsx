import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardData } from '@/hooks/useStudentDashboard';
import { LearningHubOverview } from './LearningHubOverview';
import { LearningHubStudyPlan } from './LearningHubStudyPlan';
import { LearningHubUnlocks } from './LearningHubUnlocks';

interface Module {
  id: string;
  name: string;
}

interface LearningHubTabsProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
  modules: Module[];
  selectedYearName: string;
  onNavigate: (moduleId: string, chapterId: string) => void;
}

export function LearningHubTabs({ dashboard, moduleSelected, modules, selectedYearName, onNavigate }: LearningHubTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-transparent p-1 gap-2">
        <TabsTrigger 
          value="overview" 
          className="bg-primary/10 text-muted-foreground border border-primary/20 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger 
          value="study-plan"
          className="bg-primary/10 text-muted-foreground border border-primary/20 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm"
        >
          Study Plan
        </TabsTrigger>
        <TabsTrigger 
          value="unlocks"
          className="bg-primary/10 text-muted-foreground border border-primary/20 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm"
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
        <LearningHubStudyPlan 
          moduleSelected={moduleSelected} 
          modules={modules}
          selectedYearName={selectedYearName}
        />
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
