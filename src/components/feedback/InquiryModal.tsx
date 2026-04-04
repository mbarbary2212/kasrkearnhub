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
import { 
  validateFeedbackMessage, 
  validateSubject, 
  sanitizeTextInput,
  FEEDBACK_MIN_LENGTH,
  FEEDBACK_MAX_LENGTH,
  SUBJECT_MIN_LENGTH,
  SUBJECT_MAX_LENGTH 
} from '@/lib/feedbackValidation';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string;
  chapterId?: string;
  topicId?: string;
  targetAdminId?: string;
  targetAdminName?: string;
  targetRole?: string;
}

const CATEGORY_OPTIONS: { value: InquiryCategory; label: string; helper: string }[] = [
  { value: 'study_material', label: 'Study material / lecture content', helper: 'Questions about lectures, slides, or study materials' },
  { value: 'mcq_explanation', label: 'MCQ or question explanation', helper: 'Clarification about MCQs, answers, or explanations' },
  { value: 'exam_assessment', label: 'Exam and assessment related', helper: 'Questions about exams, tests, grades, or assessment format' },
  { value: 'syllabus_objectives', label: 'Syllabus and learning objectives', helper: 'Questions about syllabus scope or learning objectives' },
  { value: 'technical', label: 'Technical issue', helper: 'App bugs, login issues, playback, or loading problems' },
  { value: 'suggestion', label: 'Suggestion / feedback', helper: 'Ideas to improve the platform' },
  { value: 'other', label: 'Other', helper: 'Anything not listed above' },
];

export default function InquiryModal({ isOpen, onClose, moduleId, moduleName, chapterId, topicId }: InquiryModalProps) {
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

    // Validate subject with sanitization
    const subjectValidation = validateSubject(subject);
    if (!subjectValidation.success) {
      toast.error(subjectValidation.error);
      return;
    }

    // Validate message with sanitization
    const messageValidation = validateFeedbackMessage(message);
    if (!messageValidation.success) {
      toast.error(messageValidation.error);
      return;
    }

    try {
      await submitInquiry.mutateAsync({
        category,
        subject: subjectValidation.data!,
        message: messageValidation.data!,
        moduleId,
        chapterId,
        topicId,
        isAnonymous: false, // Inquiries are not anonymous
      });

      toast.success('Thank you for your feedback.');
      resetForm();
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit question. Please try again.';
      toast.error(errorMessage);
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
              <SelectItem key={opt.value} value={opt.value} className="py-2">
                <div className="flex flex-col items-start">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.helper}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label>Subject * <span className="text-xs text-muted-foreground">({SUBJECT_MIN_LENGTH}-{SUBJECT_MAX_LENGTH} chars)</span></Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your question"
          maxLength={SUBJECT_MAX_LENGTH}
          required
        />
        <p className="text-xs text-muted-foreground text-right">
          {sanitizeTextInput(subject).length}/{SUBJECT_MAX_LENGTH}
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Your Question * <span className="text-xs text-muted-foreground">({FEEDBACK_MIN_LENGTH}-{FEEDBACK_MAX_LENGTH} chars)</span></Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your question in detail..."
          rows={5}
          maxLength={FEEDBACK_MAX_LENGTH}
          required
        />
        <p className="text-xs text-muted-foreground text-right">
          {sanitizeTextInput(message).length}/{FEEDBACK_MAX_LENGTH}
        </p>
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
