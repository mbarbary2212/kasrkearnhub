import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCreateThread } from "@/hooks/useDiscussions";
import { quickCheck } from "@/lib/profanityFilter";

interface CreateThreadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId?: string;
  chapterId?: string;
  onSuccess: (threadId: string) => void;
}

export function CreateThreadModal({ 
  open, 
  onOpenChange, 
  moduleId, 
  chapterId,
  onSuccess 
}: CreateThreadModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  
  const createThread = useCreateThread();

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (quickCheck(value)) {
      setWarning("Your title may contain inappropriate language");
    } else if (warning?.includes("title")) {
      setWarning(null);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (quickCheck(value)) {
      setWarning("Your message may contain inappropriate language");
    } else if (warning?.includes("message")) {
      setWarning(null);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    
    try {
      const thread = await createThread.mutateAsync({
        moduleId,
        chapterId,
        title: title.trim(),
        content: content.trim(),
      });
      
      setTitle("");
      setContent("");
      setWarning(null);
      onSuccess(thread.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a Discussion</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {warning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
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

          <div className="space-y-2">
            <Label htmlFor="content">Your message</Label>
            <Textarea
              id="content"
              placeholder="Share your thoughts, questions, or insights..."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/2000
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Please keep discussions respectful and on-topic. Content is moderated to ensure a safe learning environment.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || createThread.isPending}
          >
            {createThread.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Thread
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
