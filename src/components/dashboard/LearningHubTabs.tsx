import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { DashboardData } from '@/hooks/useStudentDashboard';
import { LearningHubOverview } from './LearningHubOverview';
import { LearningHubStudyPlan } from './LearningHubStudyPlan';


interface Module {
  id: string;
  name: string;
  workload_level?: 'light' | 'medium' | 'heavy' | 'heavy_plus' | null;
  page_count?: number | null;
}

interface LearningHubTabsProps {
  dashboard: DashboardData;
  moduleSelected: boolean;
  modules: Module[];
  selectedYearName: string;
  selectedYearId?: string;
  selectedModuleId?: string | null;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

export function LearningHubTabs({ dashboard, moduleSelected, modules, selectedYearName, selectedYearId, selectedModuleId, onNavigate }: LearningHubTabsProps) {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const defaultTab = (tabFromUrl && ['overview', 'study-plan'].includes(tabFromUrl)) ? tabFromUrl : 'overview';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6 bg-transparent p-1 gap-2">
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
          Daily Coach
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <LearningHubOverview 
          dashboard={dashboard} 
          moduleSelected={moduleSelected}
          moduleId={selectedModuleId || undefined}
          onNavigate={onNavigate}
        />
      </TabsContent>

      <TabsContent value="study-plan" className="space-y-6">
        <LearningHubStudyPlan 
          moduleSelected={moduleSelected} 
          modules={modules}
          selectedYearName={selectedYearName}
          selectedYearId={selectedYearId}
          selectedModuleId={selectedModuleId}
        />
      </TabsContent>

    </Tabs>
  );
}
