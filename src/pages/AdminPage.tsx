import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAdminData } from '@/hooks/useAdminData';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Loader2, Shield, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminTabsNavigation } from '@/components/admin/AdminTabsNavigation';
import { UsersTab } from '@/components/admin/UsersTab';
import { AccountsTab } from '@/components/admin/AccountsTab';
import { ActivityLogTab } from '@/components/admin/ActivityLogTab';
import { PlatformSettingsTab, ArchiveLegacyOsceCard } from '@/components/admin/PlatformSettingsTab';
import { IntegrityCheckTab } from '@/components/admin/IntegrityCheckTab';
import { CurriculumSourcesTab } from '@/components/admin/CurriculumSourcesTab';
import { ContentAnalyticsTab } from '@/components/admin/ContentAnalyticsTab';
import { ContentFactoryTab } from '@/components/admin/ContentFactoryTab';
import { HelpTemplatesTab } from '@/components/admin/HelpTemplatesTab';
import { AnnouncementsTab } from '@/components/admin/AnnouncementsTab';
import { AdminInboxTab } from '@/components/admin/AdminInboxTab';
import { RealtimeAnalyticsTab } from '@/components/admin/RealtimeAnalyticsTab';
import { VideosManagementTab } from '@/components/admin/VideosManagementTab';
import { AssessmentBlueprintTab } from '@/components/admin/blueprint/AssessmentBlueprintTab';
import { PerfLogsTab } from '@/components/admin/PerfLogsTab';

export default function AdminPage() {
  const { user, isSuperAdmin, isPlatformAdmin, isAdmin, isTopicAdmin, isModuleAdmin, moduleAdminModuleIds, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: adminData, isLoading: adminDataLoading } = useAdminData(!!isAdmin);
  const years = adminData?.years ?? [];
  const modules = adminData?.modules ?? [];

  // Two-level tab navigation: map tab to group
  const tabToGroup = (tab: string): 'system' | 'content' | 'messaging' => {
    if (['users', 'accounts', 'activity-log', 'settings', 'perf-logs'].includes(tab)) return 'system';
    if (['sources', 'curriculum', 'pdf-library', 'ai-settings', 'help', 'analytics', 'question-analytics', 'integrity', 'ai-cases', 'videos', 'blueprint'].includes(tab)) return 'content';
    if (['announcements', 'inbox'].includes(tab)) return 'messaging';
    return 'system';
  };

  const urlTab = searchParams.get('tab');
  const resolvedDefault = isTopicAdmin ? 'help' : (urlTab || 'users');
  const [activeGroup, setActiveGroup] = useState<'system' | 'content' | 'messaging'>(() => tabToGroup(resolvedDefault));
  const [activeTab, setActiveTab] = useState(resolvedDefault);

  const firstTabInGroup = (group: 'system' | 'content' | 'messaging'): string => {
    const groupTabs: Record<string, { value: string; visible: boolean }[]> = {
      system: [
        { value: 'users', visible: true },
        { value: 'accounts', visible: isSuperAdmin || isPlatformAdmin },
        { value: 'activity-log', visible: isSuperAdmin || isPlatformAdmin },
        { value: 'settings', visible: isPlatformAdmin },
      ],
      content: [
        { value: 'sources', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
        { value: 'help', visible: true },
        { value: 'analytics', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin || isTopicAdmin },
        { value: 'videos', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
        { value: 'ai-settings', visible: isSuperAdmin },
        { value: 'blueprint', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
      ],
      messaging: [
        { value: 'announcements', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
        { value: 'inbox', visible: isSuperAdmin || isPlatformAdmin || isModuleAdmin },
      ],
    };
    return groupTabs[group]?.find(t => t.visible)?.value || 'users';
  };

  const handleGroupChange = (group: 'system' | 'content' | 'messaging') => {
    setActiveGroup(group);
    setActiveTab(firstTabInGroup(group));
  };

  useEffect(() => {
    if (urlTab) {
      setActiveGroup(tabToGroup(urlTab));
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading || adminDataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const defaultTab = isTopicAdmin ? 'help' : (urlTab || 'users');

  // Topic admins: simplified view
  if (isTopicAdmin) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-heading font-bold">Help & Templates</h1>
              <p className="text-muted-foreground">Download guides and templates for content preparation.</p>
            </div>
          </div>
          <HelpTemplatesTab />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Super Admin Access - Full System Control' :
               isPlatformAdmin ? 'Platform Admin Access - All Modules' :
               'Admin Access'}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setSearchParams({ tab }, { replace: true }); }} className="space-y-4">
          <AdminTabsNavigation
            defaultTab={defaultTab}
            isSuperAdmin={isSuperAdmin}
            isPlatformAdmin={isPlatformAdmin}
            isModuleAdmin={isModuleAdmin}
            isTopicAdmin={isTopicAdmin}
            activeGroup={activeGroup}
            setActiveGroup={handleGroupChange}
          />

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          {(isSuperAdmin || isPlatformAdmin) && (
            <TabsContent value="accounts">
              <AccountsTab />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin) && (
            <TabsContent value="activity-log">
              <ActivityLogTab />
            </TabsContent>
          )}

          {isPlatformAdmin && (
            <TabsContent value="settings">
              <PlatformSettingsTab />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="sources">
              <CurriculumSourcesTab
                modules={modules}
                years={years}
                moduleAdminModuleIds={moduleAdminModuleIds}
              />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin || isTopicAdmin) && (
            <TabsContent value="analytics">
              <ContentAnalyticsTab
                modules={modules.map(m => ({ id: m.id, name: m.name, year_id: m.year_id }))}
                moduleAdminModuleIds={moduleAdminModuleIds}
                integrityContent={
                  <>
                    <IntegrityCheckTab />
                    {isSuperAdmin && <ArchiveLegacyOsceCard />}
                  </>
                }
              />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="videos">
              <VideosManagementTab
                allowedModuleIds={(isSuperAdmin || isPlatformAdmin) ? undefined : moduleAdminModuleIds}
              />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="announcements">
              <AnnouncementsTab
                modules={modules.map(m => ({ id: m.id, name: m.name }))}
                years={years.map(y => ({ id: y.id, name: y.name }))}
                moduleAdminModuleIds={moduleAdminModuleIds}
              />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="ai-settings">
              <ContentFactoryTab />
            </TabsContent>
          )}

          <TabsContent value="help">
            <HelpTemplatesTab />
          </TabsContent>

          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="blueprint">
              <AssessmentBlueprintTab
                years={years.map(y => ({ id: y.id, name: y.name }))}
                modules={modules.map(m => ({ id: m.id, name: m.name, year_id: m.year_id }))}
              />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="inbox">
              <AdminInboxTab />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin) && (
            <TabsContent value="live">
              <RealtimeAnalyticsTab />
            </TabsContent>
          )}

          {(isSuperAdmin || isPlatformAdmin) && (
            <TabsContent value="perf-logs">
              <PerfLogsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
