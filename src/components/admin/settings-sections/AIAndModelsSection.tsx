import { useAuthContext } from '@/contexts/AuthContext';
import { ManageModelsPanel } from '@/components/admin/ManageModelsPanel';
import { AISettingsPanel } from '@/components/admin/AISettingsPanel';
import { ExaminerAvatarsCard } from '@/components/admin/ExaminerAvatarsCard';

export function AIAndModelsSection() {
  const { isSuperAdmin } = useAuthContext();
  return (
    <div className="space-y-4">
      {isSuperAdmin && <ManageModelsPanel />}
      {isSuperAdmin && <AISettingsPanel showRules={false} />}
      <ExaminerAvatarsCard />
    </div>
  );
}