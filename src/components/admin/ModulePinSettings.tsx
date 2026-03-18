import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pin, Info } from 'lucide-react';
import { useModulePinSettings, useUpsertPinSetting, MODULE_GROUPS, MODULE_KEY_LABELS } from '@/hooks/useCustomizeView';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function ModulePinSettings() {
  const { data: pinSettings, isLoading } = useModulePinSettings();
  const upsertPin = useUpsertPinSetting();
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);

  const isPinned = (moduleKey: string) =>
    pinSettings?.find(p => p.module_key === moduleKey)?.is_pinned ?? false;

  const handleToggle = async (moduleKey: string, checked: boolean) => {
    if (!user?.id) return;
    try {
      await upsertPin.mutateAsync({ module_key: moduleKey, is_pinned: checked, pinned_by: user.id });
      toast.success(`${MODULE_KEY_LABELS[moduleKey]} ${checked ? 'pinned' : 'unpinned'}`);
    } catch {
      toast.error('Failed to update pin setting');
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Pin className="w-5 h-5 text-amber-500" />
              Pinned Modules
            </CardTitle>
            <CardDescription>
              Control which modules are always visible to students.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Pinned modules are always visible to all students and cannot be hidden from their personal view.
              </AlertDescription>
            </Alert>

            {MODULE_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h4>
                <div className="space-y-1">
                  {group.keys.map(key => (
                    <div key={key} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        {isPinned(key) && <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        <Label className="text-sm font-medium cursor-pointer">
                          {MODULE_KEY_LABELS[key]}
                        </Label>
                      </div>
                      <Switch
                        checked={isPinned(key)}
                        onCheckedChange={(checked) => handleToggle(key, checked)}
                        disabled={isLoading || upsertPin.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
