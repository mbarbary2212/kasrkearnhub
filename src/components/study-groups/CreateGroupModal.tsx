import { useState } from "react";
import { Lock, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateStudyGroup } from "@/hooks/useStudyGroups";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId?: string;
}

export function CreateGroupModal({ open, onOpenChange, moduleId }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacyType, setPrivacyType] = useState<"invite_only" | "request_to_join">("invite_only");

  const { mutate: createGroup, isPending } = useCreateStudyGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        privacy_type: privacyType,
        module_id: moduleId,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setPrivacyType("invite_only");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Study Group</DialogTitle>
            <DialogDescription>
              Create a private study group to collaborate with your classmates.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Cardiology Study Squad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="grid gap-3">
              <Label>Privacy</Label>
              <RadioGroup
                value={privacyType}
                onValueChange={(v) => setPrivacyType(v as "invite_only" | "request_to_join")}
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="invite_only" id="invite_only" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="invite_only" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Lock className="h-4 w-4" />
                      Invite Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Members can only join if invited by existing members
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="request_to_join" id="request_to_join" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="request_to_join" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Globe className="h-4 w-4" />
                      Request to Join
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Anyone can request to join; admins approve requests
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
