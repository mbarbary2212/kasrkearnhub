import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useModuleAdmins, useChapterAdmins } from '@/hooks/useContentAdmins';
import type { ContentAdmin } from '@/hooks/useContentAdmins';
import { cn } from '@/lib/utils';

interface ChapterAdminAvatarsProps {
  moduleId?: string;
  moduleName?: string;
  chapterId?: string;
  chapterTitle?: string;
  onContactAdmin?: (admin: ContentAdmin, roleType: 'module' | 'topic') => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ChapterAdminAvatars({
  moduleId,
  moduleName,
  chapterId,
  chapterTitle,
  onContactAdmin,
}: ChapterAdminAvatarsProps) {
  const { data: moduleAdmins } = useModuleAdmins(moduleId);
  const { data: chapterAdmins } = useChapterAdmins(chapterId);

  // Pick exactly one topic admin and one module admin (deterministic: first from each list)
  const topicAdmin = chapterAdmins?.[0] ?? null;
  const moduleAdmin = moduleAdmins?.find((a) => a.id !== topicAdmin?.id) ?? null;

  const adminsToShow: { admin: ContentAdmin; role: 'module' | 'topic'; label: string }[] = [];
  if (topicAdmin) adminsToShow.push({ admin: topicAdmin, role: 'topic', label: 'Topic Lead' });
  if (moduleAdmin) adminsToShow.push({ admin: moduleAdmin, role: 'module', label: 'Module Lead' });

  if (adminsToShow.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 ml-auto shrink-0">
      {adminsToShow.map(({ admin, role, label }) => (
        <TooltipProvider key={admin.id} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onContactAdmin?.(admin, role)}
                className={cn(
                  'rounded-full transition-transform duration-200',
                  'hover:scale-[1.15] focus-visible:scale-[1.15]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
                  'active:scale-[1.15]', // tap state for mobile
                )}
              >
                <Avatar className="h-8 w-8 ring-2 ring-background text-[10px] cursor-pointer">
                  {admin.avatar_url && (
                    <AvatarImage src={admin.avatar_url} alt={admin.full_name || ''} />
                  )}
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(admin.full_name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <span className="font-medium">{admin.full_name || 'Instructor'}</span>
              <span className="block text-muted-foreground">{label} · Tap to message</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
