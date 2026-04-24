import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHideEmptySelfAssessmentTabs, useUpsertStudySetting } from '@/hooks/useStudyResources';
import { ModulePinSettings } from '@/components/admin/ModulePinSettings';
import { HomeMindMapSettings } from '@/components/admin/HomeMindMapSettings';

function ToggleRow({
  id,
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  icon?: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
      <div className="space-y-1 min-w-0">
        <Label htmlFor={id} className="text-base font-medium flex items-center gap-2">
          {icon}
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function StudentExperienceSection() {
  const { data: hideEmptyTabs, isLoading } = useHideEmptySelfAssessmentTabs();
  const upsertSetting = useUpsertStudySetting();

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

  const handleHideEmpty = async (checked: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key: 'hide_empty_self_assessment_tabs',
        value: checked ? 'true' : 'false',
      });
      toast.success('Setting updated');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const handleDisclaimer = async (checked: boolean) => {
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
    } catch {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Quick toggles
          </CardTitle>
          <CardDescription>Boolean settings that affect what students see across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            id="hide-empty-tabs"
            label="Hide empty practice tabs"
            description="Students only see practice sub-tabs (MCQ, Essays, Matching…) that have content. Admins always see all tabs."
            checked={hideEmptyTabs ?? false}
            onChange={handleHideEmpty}
            disabled={isLoading || upsertSetting.isPending}
          />
          <ToggleRow
            id="disclaimer-toggle"
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Show platform disclaimer on login"
            description="Students must accept the disclaimer before using the platform. Shown once per browser."
            checked={disclaimerEnabled}
            onChange={handleDisclaimer}
            disabled={disclaimerLoading || upsertSetting.isPending}
          />
        </CardContent>
      </Card>

      <ModulePinSettings />
      <HomeMindMapSettings />
    </div>
  );
}