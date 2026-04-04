import { Mail } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { ContentAdmin } from '@/hooks/useContentAdmins';
import { cn } from '@/lib/utils';

interface ContentAdminCardProps {
  admins: ContentAdmin[];
  label?: string;
  size?: 'sm' | 'md';
  onContact?: (admin: ContentAdmin) => void;
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

export function ContentAdminCard({ admins, label, size = 'sm' }: ContentAdminCardProps) {
  if (!admins || admins.length === 0) return null;

  const displayLabel =
    label ?? (admins.length === 1 ? 'Your Module Lead' : 'Your Module Team');

  const avatarSize = size === 'md' ? 'h-8 w-8' : 'h-6 w-6';
  const textSize = size === 'md' ? 'text-[11px]' : 'text-[10px]';
  const nameSize = size === 'md' ? 'text-sm max-w-[140px]' : 'text-xs max-w-[120px]';

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
                  <Avatar className={cn(avatarSize, textSize)}>
                    {admin.avatar_url && <AvatarImage src={admin.avatar_url} alt={admin.full_name || ''} />}
                    <AvatarFallback className={cn(textSize, 'bg-primary/10 text-primary')}>
                      {getInitials(admin.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn('font-medium text-foreground/80 group-hover:text-foreground truncate', nameSize)}>
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

/** Compact overlapping avatar stack for sidebar / dashboard cards */
interface LeadAvatarStackProps {
  admins: ContentAdmin[];
  maxVisible?: number;
  avatarSize?: string;
  label?: string;
}

export function LeadAvatarStack({ admins, maxVisible = 4, avatarSize = 'h-7 w-7', label }: LeadAvatarStackProps) {
  if (!admins || admins.length === 0) return null;

  const visible = admins.slice(0, maxVisible);
  const overflow = admins.length - maxVisible;

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide shrink-0">
          {label}
        </span>
      )}
      <div className="flex items-center">
        {visible.map((admin, i) => (
          <TooltipProvider key={admin.id} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(i > 0 && '-ml-2')}>
                  <Avatar className={cn(avatarSize, 'ring-2 ring-background text-[10px]')}>
                    {admin.avatar_url && <AvatarImage src={admin.avatar_url} alt={admin.full_name || ''} />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(admin.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {admin.full_name || 'Instructor'}
                {admin.email && <span className="block text-muted-foreground">{admin.email}</span>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {overflow > 0 && (
          <div className={cn('-ml-2 flex items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground', avatarSize)}>
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
