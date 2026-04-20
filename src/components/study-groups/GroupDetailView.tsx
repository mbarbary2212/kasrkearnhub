import { useState } from "react";
import { ArrowLeft, Users, Settings, Lock, Globe, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useStudyGroupDetail,
  useGroupMembers,
  useGroupThreads,
  usePendingJoinRequests,
  StudyGroupThread,
} from "@/hooks/useStudyGroups";
import { MemberManagement } from "./MemberManagement";
import { InviteMembersModal } from "./InviteMembersModal";
import { GroupThreadList } from "./GroupThreadList";
import { GroupThreadView } from "./GroupThreadView";
import { CreateGroupThreadModal } from "./CreateGroupThreadModal";
import { useAuth } from "@/contexts/AuthContext";

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
}

export function GroupDetailView({ groupId, onBack }: GroupDetailViewProps) {
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [selectedThread, setSelectedThread] = useState<StudyGroupThread | null>(null);

  const { data: group, isLoading: loadingGroup } = useStudyGroupDetail(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data: threads } = useGroupThreads(groupId);
  const { data: pendingRequests } = usePendingJoinRequests(groupId);

  const isAdmin = group?.my_role === 'owner' || group?.my_role === 'admin';

  if (loadingGroup) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="link" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  if (selectedThread) {
    return (
      <GroupThreadView
        thread={selectedThread}
        onBack={() => setSelectedThread(null)}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {group.name}
            {group.privacy_type === 'invite_only' ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
          </h2>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        {group.my_role && (
          <Badge variant={group.my_role === 'owner' ? 'default' : 'secondary'}>
            {group.my_role}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span
          className={`flex items-center gap-1 ${
            (group.member_count ?? 0) >= 10 ? 'text-amber-600 font-medium' : ''
          }`}
        >
          <Users className="h-4 w-4" />
          {group.member_count ?? 0} / 10 members
        </span>
        {pendingRequests && pendingRequests.length > 0 && isAdmin && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="discussions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="members">
            Members
            {pendingRequests && pendingRequests.length > 0 && isAdmin && (
              <span className="ml-1 bg-orange-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussions" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowCreateThread(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Thread
              </Button>
            </div>

            <GroupThreadList
              threads={threads || []}
              onSelectThread={setSelectedThread}
            />
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Members
                </Button>
              </div>
            )}

            <MemberManagement
              groupId={groupId}
              members={members || []}
              pendingRequests={pendingRequests || []}
              isAdmin={isAdmin}
              currentUserId={user?.id}
            />
          </div>
        </TabsContent>
      </Tabs>

      <InviteMembersModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        groupId={groupId}
      />

      <CreateGroupThreadModal
        open={showCreateThread}
        onOpenChange={setShowCreateThread}
        groupId={groupId}
      />
    </div>
  );
}
