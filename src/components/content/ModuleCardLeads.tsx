import { useModuleAdmins } from '@/hooks/useContentAdmins';
import { LeadAvatarStack } from '@/components/content/ContentAdminCard';

interface ModuleCardLeadsProps {
  moduleId: string;
}

export function ModuleCardLeads({ moduleId }: ModuleCardLeadsProps) {
  const { data: admins } = useModuleAdmins(moduleId);
  if (!admins || admins.length === 0) return null;

  return (
    <div className="mt-1">
      <LeadAvatarStack admins={admins} maxVisible={3} avatarSize="h-6 w-6" />
    </div>
  );
}
