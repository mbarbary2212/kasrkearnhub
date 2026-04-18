import { Heart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamCredits, type TeamCredit } from '@/hooks/useTeamCredits';

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function TeamList({ team }: { team: TeamCredit[] }) {
  return (
    <>
      <p className="text-sm font-semibold text-foreground mb-3">The KALM Hub Team</p>
      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
        {team.map((member) => (
          <div key={member.id} className="flex items-start gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              {member.photo_url ? <AvatarImage src={member.photo_url} alt={member.name} /> : null}
              <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {member.email ? (
                <a
                  href={`mailto:${member.email}`}
                  className="text-sm font-medium text-primary hover:underline leading-tight break-words"
                >
                  {member.name}
                </a>
              ) : (
                <p className="text-sm font-medium text-foreground leading-tight break-words">
                  {member.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-tight">{member.role}</p>
            </div>
          </div>
        ))}
        {team.length === 0 && (
          <p className="text-xs text-muted-foreground">No team members yet.</p>
        )}
      </div>
    </>
  );
}

export function AppCredits({ collapsed = false }: { collapsed?: boolean }) {
  const { data: team = [] } = useTeamCredits();

  if (collapsed) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full text-center py-3 hover:opacity-80 transition-opacity">
            <Heart className="h-3 w-3 text-red-500 fill-red-500 mx-auto" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="center" side="right">
          <TeamList team={team} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground border-t border-border/30 pt-3 pb-2 px-2">
      <Heart className="h-3 w-3 text-red-500 fill-red-500 shrink-0" />
      <Popover>
        <PopoverTrigger asChild>
          <button className="underline underline-offset-2 hover:text-foreground transition-colors">
            KALM Hub Team
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="center" side="right">
          <TeamList team={team} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
