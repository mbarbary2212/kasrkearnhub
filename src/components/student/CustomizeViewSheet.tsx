import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useModulePinSettings,
  useStudentModulePreferences,
  useUpsertStudentPreference,
  MODULE_GROUPS,
  MODULE_KEY_LABELS,
} from '@/hooks/useCustomizeView';
import { toast } from 'sonner';

interface CustomizeViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomizeViewSheet({ open, onOpenChange }: CustomizeViewSheetProps) {
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Customize Your View</DrawerTitle>
          <DrawerDescription>
            Choose which resources to show. Pinned items are required by your instructor.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="px-4 pb-6 max-h-[60vh]">
          <div className="space-y-5">
            {MODULE_GROUPS.map(group => (
              <div key={group.label} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h4>
                <div className="space-y-1">
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
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
