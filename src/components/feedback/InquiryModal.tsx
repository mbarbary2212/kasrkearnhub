import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { Mail, HelpCircle } from 'lucide-react';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string;
}

type QuestionCategory = 'content' | 'technical';

const CATEGORY_OPTIONS: { value: QuestionCategory; label: string }[] = [
  { value: 'content', label: 'Content question' },
  { value: 'technical', label: 'Technical issue' },
];

export default function InquiryModal({ isOpen, onClose, moduleId, moduleName, moduleCode }: InquiryModalProps) {
  const { user, profile } = useAuthContext();
  const [category, setCategory] = useState<QuestionCategory | ''>('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter your question');
      return;
    }

    const userEmail = user?.email || 'Not available';
    const userName = profile?.full_name || 'Not available';
    const code = moduleCode || 'N/A';
    const modName = moduleName || 'Not specified';

    // Build mailto link
    const recipient = 'mohamed.elbarbary@gmail.com';
    const subject = encodeURIComponent(`KALM Hub Question – ${code}`);
    
    const body = encodeURIComponent(
`User Name: ${userName}
User Email: ${userEmail}
Module: ${code} – ${modName}
Category: ${category === 'content' ? 'Content question' : 'Technical issue'}

Question:
${message.trim()}`
    );

    const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`;
    
    // Open mailto link
    window.location.href = mailtoLink;
    
    toast.success('Question sent successfully. We\'ll get back to you soon.');
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setCategory('');
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Ask a Question
          </DialogTitle>
          <DialogDescription>
            Submit questions about module content or technical issues.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Email notice */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted border">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your account email will be included so we can reply.
            </p>
          </div>

          {/* Category */}
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as QuestionCategory)}>
              <SelectTrigger className="mt-1">
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

          {/* Message */}
          <div>
            <Label>Your Question *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your question in detail..."
              rows={5}
              className="mt-1"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            <Mail className="w-4 h-4 mr-2" />
            Send Question
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
