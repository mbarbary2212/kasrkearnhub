import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUpsertStudySetting } from '@/hooks/useStudyResources';
import { useMergedModuleConfig } from '@/hooks/useMergedModuleConfig';
import { SystemAutoTagCard } from '@/components/admin/SystemAutoTagCard';

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

export function CurriculumSection() {
  const { isSuperAdmin } = useAuthContext();
  const upsertSetting = useUpsertStudySetting();
  const { data: mergedConfig } = useMergedModuleConfig();
  const mergedEnabled = !!mergedConfig?.enabled;

  const handleMergedSurgery = async (checked: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key: 'merged_surgery_config',
        value: checked ? MERGED_SURGERY_CONFIG_ON : MERGED_SURGERY_CONFIG_OFF,
      });
      toast.success(checked ? 'Merged Surgery mode enabled' : 'Merged Surgery mode disabled');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Curriculum Structure</CardTitle>
          <CardDescription>Super admin access required.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitMerge className="w-5 h-5" />
            Quick toggles
          </CardTitle>
          <CardDescription>Structural settings for how the curriculum appears.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="merged-surgery-toggle" className="text-base font-medium">
                Merge surgery modules in student view
              </Label>
              <p className="text-sm text-muted-foreground">
                SUR-423 is hidden from Year 4, SUR-523 appears as "Surgery" with 423/523 tags in Year 5, and SUR-423 chapters are included in Year 5 coaching and study plans.
              </p>
            </div>
            <Switch
              id="merged-surgery-toggle"
              checked={mergedEnabled}
              onCheckedChange={handleMergedSurgery}
              disabled={upsertSetting.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <SystemAutoTagCard />
    </div>
  );
}