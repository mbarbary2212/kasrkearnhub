import { useState, useEffect } from "react";
import { Search, User, Loader2, Send, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchUsersToInvite, useSendInvite } from "@/hooks/useStudyGroups";

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function InviteMembersModal({ open, onOpenChange, groupId }: InviteMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [invitingUser, setInvitingUser] = useState<string | null>(null);

  // Debounce search input by 300ms to avoid burning rate-limit budget
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: users, isLoading, error } = useSearchUsersToInvite(debouncedTerm, groupId);
  const { mutate: sendInvite, isPending: sending } = useSendInvite();

  const handleInvite = (userId: string) => {
    setInvitingUser(userId);
    sendInvite(
      { groupId, userId },
      {
        onSuccess: () => {
          setInvitingUser(null);
          setSearchTerm("");
          setDebouncedTerm("");
        },
        onError: () => {
          setInvitingUser(null);
        },
      }
    );
  };

  // Friendly error message extraction from RPC errors
  const errorMsg = (() => {
    if (!error) return null;
    const raw = (error as any)?.message || '';
    if (raw.includes('Too many searches')) {
      return "You've searched too many times in the last minute. Please wait a moment.";
    }
    if (raw.includes('full')) {
      return 'This group is full (10 / 10 members).';
    }
    if (raw.includes('not a member')) {
      return 'You must be a member of this group to invite others.';
    }
    return 'Search failed. Please try again.';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Search for classmates to invite to your study group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/60 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Don't know the exact name? Ask your colleague for their name as it appears in the app.
              For privacy, we only show names (not emails).
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {errorMsg && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : debouncedTerm.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {user.full_name || 'Unnamed User'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(user.id)}
                      disabled={sending && invitingUser === user.id}
                    >
                      {sending && invitingUser === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-1" />
                          Invite
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : !errorMsg ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
