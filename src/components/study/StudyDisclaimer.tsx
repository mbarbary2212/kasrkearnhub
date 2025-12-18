import { useState } from 'react';
import { AlertTriangle, Edit2, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStudyDisclaimer, useUpdateStudySetting } from '@/hooks/useStudyResources';
import { toast } from 'sonner';

interface StudyDisclaimerProps {
  isSuperAdmin?: boolean;
}

export function StudyDisclaimer({ isSuperAdmin = false }: StudyDisclaimerProps) {
  const { data: disclaimer, isLoading } = useStudyDisclaimer();
  const updateSetting = useUpdateStudySetting();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleEdit = () => {
    setEditValue(disclaimer || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'disclaimer', value: editValue });
      toast.success('Disclaimer updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update disclaimer');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  if (isLoading) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-start justify-between gap-4">
        {isEditing ? (
          <div className="flex-1 space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={updateSetting.isPending}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <span className="text-amber-800 dark:text-amber-200 flex-1">{disclaimer}</span>
            {isSuperAdmin && (
              <Button size="sm" variant="ghost" onClick={handleEdit} className="shrink-0">
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
