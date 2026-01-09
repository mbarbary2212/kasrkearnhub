import { Mail, Check, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StudyGroupInvite, useAcceptInvite, useDeclineInvite } from "@/hooks/useStudyGroups";

interface InvitesBannerProps {
  invites: StudyGroupInvite[];
}

export function InvitesBanner({ invites }: InvitesBannerProps) {
  const { mutate: acceptInvite, isPending: accepting } = useAcceptInvite();
  const { mutate: declineInvite, isPending: declining } = useDeclineInvite();

  if (invites.length === 0) return null;

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Mail className="h-4 w-4" />
      <AlertTitle>You have {invites.length} pending invite{invites.length > 1 ? 's' : ''}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {invites.slice(0, 3).map((invite) => (
          <div key={invite.id} className="flex items-center justify-between bg-background/50 p-2 rounded-md">
            <div className="flex-1">
              <span className="font-medium">{invite.group?.name || 'Study Group'}</span>
              {invite.inviter_profile?.full_name && (
                <span className="text-muted-foreground text-sm ml-2">
                  from {invite.inviter_profile.full_name}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineInvite(invite.id)}
                disabled={declining}
              >
                {declining ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                onClick={() => acceptInvite(invite.id)}
                disabled={accepting}
              >
                {accepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Join
              </Button>
            </div>
          </div>
        ))}
        {invites.length > 3 && (
          <p className="text-sm text-muted-foreground">
            And {invites.length - 3} more...
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
