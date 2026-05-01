import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ShieldAlert, BrainCircuit, Video, Radio, Tag, Activity } from 'lucide-react';
import { QuestionAnalyticsTabs } from '@/components/analytics/QuestionAnalyticsTabs';
import { AICasesAdminTab } from './AICasesAdminTab';
import { VideoAnalyticsTab } from './VideoAnalyticsTab';
import { RealtimeAnalyticsTab } from './RealtimeAnalyticsTab';
import { TaggingIssuesTab } from './TaggingIssuesTab';
import { MaterialEngagementTab } from './MaterialEngagementTab';
import { useAuthContext } from '@/contexts/AuthContext';

interface ContentAnalyticsTabProps {
  modules: { id: string; name: string; year_id?: string }[];
  moduleAdminModuleIds: string[];
  integrityContent: React.ReactNode;
}

export function ContentAnalyticsTab({ modules, moduleAdminModuleIds, integrityContent }: ContentAnalyticsTabProps) {
  const { isSuperAdmin, isPlatformAdmin, isModuleAdmin, isTopicAdmin } = useAuthContext();

  const tabs = [
    { value: 'questions', label: 'Content Analytics', icon: BarChart3, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
    { value: 'engagement', label: 'Material Engagement', icon: Activity, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
    { value: 'integrity', label: 'Content Integrity', icon: ShieldAlert, visible: isSuperAdmin || isPlatformAdmin || isTopicAdmin },
    { value: 'ai-cases', label: 'AI Cases', icon: BrainCircuit, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin || isTopicAdmin },
    { value: 'video-analytics', label: 'Video Analytics', icon: Video, visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
    { value: 'realtime', label: 'Live', icon: Radio, visible: isSuperAdmin || isPlatformAdmin },
    { value: 'tagging-issues', label: 'Tagging Issues', icon: Tag, visible: isSuperAdmin || isPlatformAdmin },
  ].filter(t => t.visible);

  const defaultTab = tabs[0]?.value || 'questions';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground">Question performance, content integrity, and AI case reports</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="h-auto gap-1 p-1.5 w-full justify-start flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          <QuestionAnalyticsTabs modules={modules} moduleAdminModuleIds={moduleAdminModuleIds} />
        </TabsContent>

        <TabsContent value="engagement" className="mt-4">
          <MaterialEngagementTab modules={modules.map(m => ({ id: m.id, name: m.name }))} />
        </TabsContent>

        <TabsContent value="integrity" className="mt-4">
          {integrityContent}
        </TabsContent>

        <TabsContent value="ai-cases" className="mt-4">
          <AICasesAdminTab modules={modules} />
        </TabsContent>

        <TabsContent value="video-analytics" className="mt-4">
          <VideoAnalyticsTab />
        </TabsContent>

        <TabsContent value="realtime" className="mt-4">
          <RealtimeAnalyticsTab />
        </TabsContent>

        <TabsContent value="tagging-issues" className="mt-4">
          <TaggingIssuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
