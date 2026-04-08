import { useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Settings, ChevronRight, Trash2, Mail, ShieldCheck, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useHideEmptySelfAssessmentTabs, useUpsertStudySetting } from '@/hooks/useStudyResources';
import { useEmailPreferences, useUpdateEmailPreferences } from '@/hooks/useEmailPreferences';
import { useArchiveLegacyOsce } from '@/hooks/useOsceQuestions';
import { useMergedModuleConfig } from '@/hooks/useMergedModuleConfig';
import { AISettingsPanel } from '@/components/admin/AISettingsPanel';
import { ModulePinSettings } from '@/components/admin/ModulePinSettings';
import { HomeMindMapSettings } from '@/components/admin/HomeMindMapSettings';
import { ExaminerAvatarsCard } from '@/components/admin/ExaminerAvatarsCard';
import { SentryDiagnosticsSection } from '@/components/admin/SentryDiagnosticsSection';
import { SystemAutoTagCard } from '@/components/admin/SystemAutoTagCard';
import { supabase } from '@/integrations/supabase/client';

function CollapsibleSettingsCard({ icon, title, description, children, defaultOpen = false }: {
  icon: ReactNode; title: string; description: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ArchiveLegacyOsceCard() {
  const archiveLegacyOsce = useArchiveLegacyOsce();
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleArchiveLegacy = async () => {
    try {
      await archiveLegacyOsce.mutateAsync();
      setArchiveConfirmOpen(false);
    } catch (error) {
      console.error('Error archiving legacy OSCE:', error);
    }
  };

  return (
    <div className="mt-6 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <Label className="text-base font-medium text-destructive">
            Archive Legacy OSCE Questions
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          This will archive all old-format OSCE/Practical questions that don't fit the new Image + History + 5 T/F format.
          This is a one-time migration action.
        </p>
        <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" className="mt-2">
              Archive Legacy OSCE Questions
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Legacy OSCE Questions?</DialogTitle>
              <DialogDescription>
                This will soft-delete ALL existing Practical/OSCE questions in the old format.
                They will be hidden from students and admin views. This action is logged in the audit trail.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleArchiveLegacy}
                disabled={archiveLegacyOsce.isPending}
              >
                {archiveLegacyOsce.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Archive All Legacy OSCE
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function EmailNotificationPreferences() {
  const { data: prefs, isLoading } = useEmailPreferences();
  const updatePrefs = useUpdateEmailPreferences();

  const handleToggle = (key: string, checked: boolean) => {
    updatePrefs.mutate(
      { [key]: checked },
      {
        onSuccess: () => toast.success('Email preference updated'),
        onError: () => toast.error('Failed to update preference'),
      }
    );
  };

  const toggleItems = [
    { key: 'notify_access_requests', label: 'Access Requests', description: 'When a new user requests access to the platform' },
    { key: 'notify_new_feedback', label: 'Feedback Received', description: 'When a student submits feedback on content' },
    { key: 'notify_new_inquiries', label: 'Student Inquiries', description: 'When a student submits a new inquiry' },
    { key: 'notify_ticket_assigned', label: 'Ticket Assigned to You', description: 'When a support ticket is assigned to you' },
    { key: 'notify_new_content', label: 'New Content Uploads', description: 'When other admins create or modify content (can be noisy)' },
  ];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Mail className="w-5 h-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Choose which events send you an email alert.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              toggleItems.map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor={item.key} className="text-base font-medium">
                      {item.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    id={item.key}
                    checked={prefs ? (prefs as unknown as Record<string, unknown>)[item.key] as boolean : false}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    disabled={updatePrefs.isPending}
                  />
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

const MERGED_SURGERY_CONFIG_ON = JSON.stringify({
  enabled: true,
  hiddenModules: ['153318ba-32b9-4f8e-9cbc-bdd8df9b9b10'],
  display: {
    '7f5167dd-b746-4ac6-94f3-109d637df861': {
      displayName: 'Surgery',
      tags: ['423', '523'],
    },
  },
  chapterMerge: {
    '7f5167dd-b746-4ac6-94f3-109d637df861': ['153318ba-32b9-4f8e-9cbc-bdd8df9b9b10'],
  },
});

const MERGED_SURGERY_CONFIG_OFF = JSON.stringify({
  enabled: false,
  hiddenModules: ['153318ba-32b9-4f8e-9cbc-bdd8df9b9b10'],
  display: {
    '7f5167dd-b746-4ac6-94f3-109d637df861': {
      displayName: 'Surgery',
      tags: ['423', '523'],
    },
  },
  chapterMerge: {
    '7f5167dd-b746-4ac6-94f3-109d637df861': ['153318ba-32b9-4f8e-9cbc-bdd8df9b9b10'],
  },
});

export function PlatformSettingsTab() {
  const { data: hideEmptyTabs, isLoading } = useHideEmptySelfAssessmentTabs();
  const { data: disclaimerSetting, isLoading: disclaimerLoading } = useQuery({
    queryKey: ['study-settings', 'platform_disclaimer_enabled_admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('study_settings')
        .select('value')
        .eq('key', 'platform_disclaimer_enabled')
        .maybeSingle();
      return data?.value === 'true';
    },
  });
  const disclaimerEnabled = disclaimerSetting ?? false;
  const upsertSetting = useUpsertStudySetting();
  const { isSuperAdmin } = useAuthContext();
  const { data: mergedConfig } = useMergedModuleConfig();
  const mergedEnabled = !!mergedConfig?.enabled;

  const handleToggle = async (checked: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key: 'hide_empty_self_assessment_tabs',
        value: checked ? 'true' : 'false',
      });
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleDisclaimerToggle = async (checked: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key: 'platform_disclaimer_enabled',
        value: checked ? 'true' : 'false',
      });
      if (checked) {
        await upsertSetting.mutateAsync({
          key: 'platform_disclaimer_version',
          value: Date.now().toString(),
        });
      }
      toast.success(checked ? 'Disclaimer enabled for all students' : 'Disclaimer disabled');
    } catch (error) {
      console.error('Error updating disclaimer setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleMergedSurgeryToggle = async (checked: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key: 'merged_surgery_config',
        value: checked ? MERGED_SURGERY_CONFIG_ON : MERGED_SURGERY_CONFIG_OFF,
      });
      toast.success(checked ? 'Merged Surgery mode enabled' : 'Merged Surgery mode disabled');
    } catch (error) {
      console.error('Error updating merged surgery setting:', error);
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-4">
      <CollapsibleSettingsCard
        icon={<Settings className="w-5 h-5" />}
        title="Hide Empty Practice Tabs"
        description="Configure which practice sub-tabs are visible to students."
      >
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="hide-empty-tabs" className="text-base font-medium">
              Hide Empty Practice Tabs
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, students will only see practice sub-tabs (MCQ, Essays, Matching, etc.) that have content. 
              Admins always see all tabs.
            </p>
          </div>
          <Switch
            id="hide-empty-tabs"
            checked={hideEmptyTabs ?? false}
            onCheckedChange={handleToggle}
            disabled={isLoading || upsertSetting.isPending}
          />
        </div>
      </CollapsibleSettingsCard>

      <CollapsibleSettingsCard
        icon={<ShieldCheck className="w-5 h-5" />}
        title="Platform Disclaimer"
        description="Show a one-time disclaimer agreement dialog when students open the app."
      >
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="disclaimer-toggle" className="text-base font-medium">
              Publish Disclaimer to Students
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, students must accept the disclaimer before using the platform. They only see it once per browser.
            </p>
          </div>
          <Switch
            id="disclaimer-toggle"
            checked={disclaimerEnabled ?? false}
            onCheckedChange={handleDisclaimerToggle}
            disabled={disclaimerLoading || upsertSetting.isPending}
          />
        </div>
      </CollapsibleSettingsCard>

      {isSuperAdmin && (
        <CollapsibleSettingsCard
          icon={<GitMerge className="w-5 h-5" />}
          title="Merged Surgery Modules"
          description="Temporarily merges SUR-423 into SUR-523 for student display and study logic."
        >
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="merged-surgery-toggle" className="text-base font-medium">
                Enable Merged Surgery Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled: SUR-423 is hidden from Year 4 students, SUR-523 appears as "Surgery" with 423/523 tags in Year 5, and SUR-423 chapters are included in Year 5 coaching and study plans.
              </p>
            </div>
            <Switch
              id="merged-surgery-toggle"
              checked={mergedEnabled}
              onCheckedChange={handleMergedSurgeryToggle}
              disabled={upsertSetting.isPending}
            />
          </div>
        </CollapsibleSettingsCard>
      )}

      <ModulePinSettings />
      <HomeMindMapSettings />
      <ExaminerAvatarsCard />

      {isSuperAdmin && <SentryDiagnosticsSection />}

      {isSuperAdmin && (
        <AISettingsPanel showRules={false} />
      )}

      <EmailNotificationPreferences />
    </div>
  );
}

export { ArchiveLegacyOsceCard };
