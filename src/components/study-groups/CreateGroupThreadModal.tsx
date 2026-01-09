import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useCreateGroupThread } from "@/hooks/useStudyGroups";
import { quickCheck } from "@/lib/profanityFilter";

interface CreateGroupThreadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function CreateGroupThreadModal({ open, onOpenChange, groupId }: CreateGroupThreadModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [warning, setWarning] = useState("");

  const { mutate: createThread, isPending } = useCreateGroupThread();

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (quickCheck(value)) {
      setWarning("Your title may contain inappropriate language.");
    } else {
      setWarning("");
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (quickCheck(value)) {
      setWarning("Your message may contain inappropriate language.");
    } else if (!quickCheck(title)) {
      setWarning("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    createThread(
      {
        groupId,
        title: title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setWarning("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Discussion Thread</DialogTitle>
            <DialogDescription>
              Start a new conversation with your study group.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {warning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What would you like to discuss?"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/200
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Message *</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts..."
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                maxLength={5000}
                rows={5}
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/5000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !content.trim() || isPending}>
              {isPending ? "Creating..." : "Create Thread"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
