import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pin } from 'lucide-react';
import {
  useModulePinSettings,
  useStudentModulePreferences,
  useUpsertStudentPreference,
  MODULE_GROUPS,
  MODULE_KEY_LABELS,
} from '@/hooks/useCustomizeView';
import { toast } from 'sonner';

export function ContentPreferencesTab() {
  const { data: pinSettings } = useModulePinSettings();
  const { data: studentPrefs } = useStudentModulePreferences();
  const upsertPref = useUpsertStudentPreference();

  const isPinned = (key: string) =>
    pinSettings?.find(p => p.module_key === key)?.is_pinned ?? false;

  const isHidden = (key: string) =>
    studentPrefs?.find(p => p.module_key === key)?.is_hidden ?? false;

  const isVisible = (key: string) => isPinned(key) || !isHidden(key);

  const handleToggle = async (moduleKey: string, checked: boolean) => {
    try {
      await upsertPref.mutateAsync({ module_key: moduleKey, is_hidden: !checked });
    } catch {
      toast.error('Failed to save preference');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which resources to show across all chapters. Pinned items are required by your instructor.
      </p>
      {MODULE_GROUPS.map(group => (
        <Card key={group.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.keys.map(key => {
              const pinned = isPinned(key);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {pinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    <Label className="text-sm font-medium cursor-pointer truncate">
                      {MODULE_KEY_LABELS[key]}
                    </Label>
                    {pinned && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        (Required)
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={isVisible(key)}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                    disabled={pinned || upsertPref.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
