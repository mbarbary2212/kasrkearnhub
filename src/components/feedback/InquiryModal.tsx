import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSubmitInquiry, InquiryCategory } from '@/hooks/useInquiries';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId?: string;
  chapterId?: string;
}

const CATEGORY_OPTIONS: { value: InquiryCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'content', label: 'Content Related' },
  { value: 'account', label: 'Account Issues' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
];

export default function InquiryModal({ isOpen, onClose, moduleId, chapterId }: InquiryModalProps) {
  const [category, setCategory] = useState<InquiryCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const submitInquiry = useSubmitInquiry();

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter your message');
      return;
    }

    try {
      await submitInquiry.mutateAsync({
        category,
        subject: subject.trim(),
        message: message.trim(),
        moduleId,
        chapterId,
        isAnonymous,
      });
      toast.success('Inquiry submitted successfully');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to submit inquiry');
    }
  };

  const resetForm = () => {
    setCategory('general');
    setSubject('');
    setMessage('');
    setIsAnonymous(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as InquiryCategory)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
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
          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your inquiry"
              className="mt-1"
            />
          </div>

          {/* Message */}
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your inquiry in detail..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Submit Anonymously</Label>
              <p className="text-xs text-muted-foreground">Your identity will be hidden</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitInquiry.isPending}>
            {submitInquiry.isPending ? 'Submitting...' : 'Submit Inquiry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
