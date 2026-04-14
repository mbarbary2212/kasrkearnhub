import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CoachGoalsTab } from '@/components/coach/CoachGoalsTab';
import { CoachPlanTab } from '@/components/coach/CoachPlanTab';
import { StudentDashboard } from '@/components/dashboard';

export default function ProgressPage() {
  const { user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'goals';

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Coach</h1>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="goals">
            <CoachGoalsTab />
          </TabsContent>

          <TabsContent value="plan">
            <CoachPlanTab onSwitchToGoals={() => handleTabChange('goals')} />
          </TabsContent>

          <TabsContent value="progress">
            <StudentDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
