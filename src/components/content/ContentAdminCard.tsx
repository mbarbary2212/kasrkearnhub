import { Mail } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { ContentAdmin } from '@/hooks/useContentAdmins';

interface ContentAdminCardProps {
  admins: ContentAdmin[];
  label?: string;
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

export function ContentAdminCard({ admins, label }: ContentAdminCardProps) {
  if (!admins || admins.length === 0) return null;

  const displayLabel =
    label ?? (admins.length === 1 ? 'Your Module Lead' : 'Your Module Team');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">
        {displayLabel}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {admins.map((admin) => (
          <TooltipProvider key={admin.id} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={admin.email ? `mailto:${admin.email}` : undefined}
                  className="flex items-center gap-1.5 rounded-full bg-muted/50 hover:bg-muted pl-0.5 pr-2.5 py-0.5 transition-colors cursor-pointer group"
                  onClick={(e) => !admin.email && e.preventDefault()}
                >
                  <Avatar className="h-6 w-6 text-[10px]">
                    {admin.avatar_url && <AvatarImage src={admin.avatar_url} alt={admin.full_name || ''} />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(admin.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground truncate max-w-[120px]">
                    {admin.full_name || 'Instructor'}
                  </span>
                  {admin.email && (
                    <Mail className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary flex-shrink-0" />
                  )}
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {admin.email ? 'Contact by email' : admin.full_name || 'Instructor'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
