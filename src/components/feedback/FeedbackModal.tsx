import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ShieldCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string;
}

type FeedbackCategory = 'suggestion' | 'bug' | 'content' | 'other';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'bug', label: 'Bug / Technical issue' },
  { value: 'content', label: 'Content issue' },
  { value: 'other', label: 'Other' },
];

const getCategoryLabel = (value: FeedbackCategory): string => {
  return CATEGORIES.find(c => c.value === value)?.label || value;
};

export default function FeedbackModal({ open, onOpenChange, moduleId, moduleName, moduleCode }: FeedbackModalProps) {
  const isMobile = useIsMobile();

  // Form state
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setCategory('');
    setMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      toast.error('Please select a feedback type');
      return;
    }

    if (message.length < 20) {
      toast.error('Message must be at least 20 characters');
      return;
    }

    const code = moduleCode || 'N/A';
    const modName = moduleName || 'Not specified';

    // Build mailto link - anonymous, no user info
    const recipient = 'learning.admin@kasralainy.edu.eg';
    const subject = encodeURIComponent(`KALM Hub Feedback – ${code}`);
    
    const body = encodeURIComponent(
`Module: ${code} – ${modName}
Feedback Type: ${getCategoryLabel(category)}

Feedback:
${message.trim()}`
    );

    const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`;
    
    // Open mailto link
    window.location.href = mailtoLink;
    
    toast.success('Thanks! Opening your email client to send feedback.');
    resetForm();
    onOpenChange(false);
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Module context notice */}
      {moduleName && (
        <div className="p-3 rounded-lg bg-muted border">
          <p className="text-sm text-muted-foreground">
            Submitting feedback for: <span className="font-medium text-foreground">{moduleName}</span>
          </p>
        </div>
      )}

      {/* Privacy notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary">Anonymous Feedback</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your feedback is anonymous. Your name and email are not shared with staff. 
            The platform reserves the right to identify the sender in cases of abusive or inappropriate language.
          </p>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Feedback Type *</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Select feedback type" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Message * <span className="text-xs text-muted-foreground">(min 20 characters)</span></Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your feedback in detail..."
          rows={5}
          required
          minLength={20}
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length}/20 min characters
        </p>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full">
        <Send className="w-4 h-4 mr-2" />
        Submit Anonymous Feedback
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <div className="flex items-center gap-2">
              <DrawerTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Give Feedback
              </DrawerTitle>
              <Badge variant="secondary" className="text-xs">Anonymous</Badge>
            </div>
            <DrawerDescription>
              Share suggestions, report issues, or provide general feedback.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Give Feedback
            </DialogTitle>
            <Badge variant="secondary" className="text-xs">Anonymous</Badge>
          </div>
          <DialogDescription>
            Share suggestions, report issues, or provide general feedback.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
