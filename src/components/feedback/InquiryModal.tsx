import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { HelpCircle, Send, Loader2, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubmitInquiry, InquiryCategory } from '@/hooks/useInquiries';
import { useAuthContext } from '@/contexts/AuthContext';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string;
  chapterId?: string;
}

const CATEGORY_OPTIONS: { value: InquiryCategory; label: string }[] = [
  { value: 'content', label: 'Content question' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'general', label: 'General question' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
];

export default function InquiryModal({ isOpen, onClose, moduleId, moduleName, chapterId }: InquiryModalProps) {
  const isMobile = useIsMobile();
  const { profile } = useAuthContext();
  const submitInquiry = useSubmitInquiry();

  const [category, setCategory] = useState<InquiryCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setCategory('');
    setSubject('');
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      toast.error('Please select a category');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter your question');
      return;
    }

    try {
      await submitInquiry.mutateAsync({
        category,
        subject: subject.trim(),
        message: message.trim(),
        moduleId,
        chapterId,
        isAnonymous: false, // Inquiries are not anonymous
      });

      toast.success('Question submitted! You can view replies in Messages.');
      resetForm();
      onClose();
    } catch (error) {
      toast.error('Failed to submit question. Please try again.');
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Module context */}
      {moduleName && (
        <div className="p-3 rounded-lg bg-muted border">
          <p className="text-sm text-muted-foreground">
            Submitting question for: <span className="font-medium text-foreground">{moduleName}</span>
          </p>
        </div>
      )}

      {/* Identity notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted border">
        <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">
            Your account ({profile?.full_name || profile?.email}) will be visible to admins so they can respond to you.
          </p>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as InquiryCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your question"
          required
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Your Question *</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your question in detail..."
          rows={5}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitInquiry.isPending}>
        {submitInquiry.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Send Question
      </Button>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Ask a Question
            </DrawerTitle>
            <DrawerDescription>
              Submit questions about module content or technical issues.
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Ask a Question
          </DialogTitle>
          <DialogDescription>
            Submit questions about module content or technical issues.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
