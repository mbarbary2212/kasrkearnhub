import { useState } from "react";
import { Users, Lock, Globe, Plus, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyStudyGroups, useDiscoverableGroups, useMyInvites, StudyGroup } from "@/hooks/useStudyGroups";
import { CreateGroupModal } from "./CreateGroupModal";
import { InvitesBanner } from "./InvitesBanner";

interface StudyGroupListProps {
  moduleId?: string;
  onSelectGroup: (groupId: string) => void;
}

export function StudyGroupList({ moduleId, onSelectGroup }: StudyGroupListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: myGroups, isLoading: loadingMyGroups } = useMyStudyGroups();
  const { data: discoverableGroups, isLoading: loadingDiscoverable } = useDiscoverableGroups(moduleId);
  const { data: invites } = useMyInvites();

  const pendingInvites = invites?.filter(i => i.status === 'pending') || [];

  return (
    <div className="space-y-4">
      {/* Pending Invites Banner */}
      {pendingInvites.length > 0 && (
        <InvitesBanner invites={pendingInvites} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Study Groups</h3>
          <p className="text-sm text-muted-foreground">
            Create or join private study groups with your classmates
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      <Tabs defaultValue="my-groups" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-groups">
            My Groups
            {myGroups && myGroups.length > 0 && (
              <Badge variant="secondary" className="ml-2">{myGroups.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover">
            <Search className="h-3 w-3 mr-1" />
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-groups" className="mt-4">
          {loadingMyGroups ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : myGroups && myGroups.length > 0 ? (
            <div className="grid gap-3">
              {myGroups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onClick={() => onSelectGroup(group.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-1">No study groups yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a group to start collaborating with classmates
                </p>
                <Button onClick={() => setShowCreateModal(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-4">
          {loadingDiscoverable ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : discoverableGroups && discoverableGroups.length > 0 ? (
            <div className="grid gap-3">
              {discoverableGroups.map(group => (
                <DiscoverableGroupCard
                  key={group.id}
                  group={group}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium mb-1">No groups to discover</h4>
                <p className="text-sm text-muted-foreground">
                  There are no public groups available to join at the moment
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateGroupModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        moduleId={moduleId}
      />
    </div>
  );
}

function GroupCard({ group, onClick }: { group: StudyGroup; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {group.name}
              {group.privacy_type === 'invite_only' ? (
                <Lock className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Globe className="h-3 w-3 text-muted-foreground" />
              )}
            </CardTitle>
            {group.description && (
              <CardDescription className="line-clamp-1 mt-1">
                {group.description}
              </CardDescription>
            )}
          </div>
          {group.my_role && (
            <Badge variant={group.my_role === 'owner' ? 'default' : 'secondary'} className="text-xs">
              {group.my_role}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoverableGroupCard({ group }: { group: StudyGroup }) {
  const { mutate: requestToJoin, isPending } = useRequestToJoin();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {group.name}
              <Globe className="h-3 w-3 text-muted-foreground" />
            </CardTitle>
            {group.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {group.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => requestToJoin(group.id)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Request to Join'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Import the hook at usage point to avoid circular deps
import { useRequestToJoin } from "@/hooks/useStudyGroups";
