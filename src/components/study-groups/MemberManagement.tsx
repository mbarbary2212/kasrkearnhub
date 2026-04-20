import { User, Crown, Shield, MoreVertical, Check, X, Loader2, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StudyGroupMember,
  useApproveJoinRequest,
  useDeclineJoinRequest,
  useRemoveMember,
  usePromoteToAdmin,
  useDemoteFromAdmin,
  useLeaveGroup,
} from "@/hooks/useStudyGroups";

interface MemberManagementProps {
  groupId: string;
  members: StudyGroupMember[];
  pendingRequests: StudyGroupMember[];
  isAdmin: boolean;
  currentUserId?: string;
}

export function MemberManagement({
  groupId,
  members,
  pendingRequests,
  isAdmin,
  currentUserId,
}: MemberManagementProps) {
  const { mutate: approveRequest, isPending: approving } = useApproveJoinRequest();
  const { mutate: declineRequest, isPending: declining } = useDeclineJoinRequest();
  const { mutate: removeMember, isPending: removing } = useRemoveMember();
  const { mutate: promoteToAdmin, isPending: promoting } = usePromoteToAdmin();
  const { mutate: demoteFromAdmin, isPending: demoting } = useDemoteFromAdmin();
  const { mutate: leaveGroup, isPending: leaving } = useLeaveGroup();

  const activeMembers = members.filter(m => m.status === 'active');
  const myMembership = members.find(m => m.user_id === currentUserId);
  const isOwner = myMembership?.role === 'owner';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Pending Requests Section */}
      {isAdmin && pendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending Requests</CardTitle>
            <CardDescription>
              {pendingRequests.length} user{pendingRequests.length > 1 ? 's' : ''} waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-2 bg-background rounded-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={request.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {request.profile?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineRequest({ memberId: request.id })}
                    disabled={declining}
                  >
                    {declining ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveRequest({ memberId: request.id })}
                    disabled={approving}
                  >
                    {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Members Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeMembers.map((member) => {
            const isMe = member.user_id === currentUserId;
            const canManage = isAdmin && !isMe && member.role !== 'owner';
            const canPromote = isOwner && member.role === 'member';
            const canDemote = isOwner && member.role === 'admin';

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {member.profile?.full_name || 'Unknown'}
                      {getRoleIcon(member.role)}
                      {isMe && (
                        <Badge variant="outline" className="text-xs py-0">You</Badge>
                      )}
                    </p>
                  </div>
                </div>

                {isMe && member.role !== 'owner' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => leaveGroup(groupId)}
                    disabled={leaving}
                  >
                    {leaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}
                    Leave
                  </Button>
                )}

                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canPromote && (
                        <DropdownMenuItem
                          onClick={() => promoteToAdmin({ memberId: member.id })}
                          disabled={promoting}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Promote to Admin
                        </DropdownMenuItem>
                      )}
                      {canDemote && (
                        <DropdownMenuItem
                          onClick={() => demoteFromAdmin({ memberId: member.id })}
                          disabled={demoting}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Remove Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => removeMember({ memberId: member.id })}
                        disabled={removing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove from Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
