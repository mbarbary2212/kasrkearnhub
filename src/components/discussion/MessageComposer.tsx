import { useState } from "react";
import { Send, X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePostMessage } from "@/hooks/useDiscussions";
import { quickCheck } from "@/lib/profanityFilter";

interface MessageComposerProps {
  threadId: string;
  parentId?: string;
  placeholder?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MessageComposer({ 
  threadId, 
  parentId, 
  placeholder = "Write your message...",
  onSuccess,
  onCancel
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  
  const postMessage = usePostMessage();

  const handleContentChange = (value: string) => {
    setContent(value);
    if (quickCheck(value)) {
      setWarning("Your message may contain inappropriate language. Please revise before posting.");
    } else {
      setWarning(null);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    try {
      await postMessage.mutateAsync({
        threadId,
        content: content.trim(),
        parentId,
      });
      
      setContent("");
      setWarning(null);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      {warning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{warning}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={2000}
          className="flex-1 resize-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {content.length}/2000 • Press ⌘+Enter to send
        </p>
        
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={!content.trim() || postMessage.isPending}
          >
            {postMessage.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
