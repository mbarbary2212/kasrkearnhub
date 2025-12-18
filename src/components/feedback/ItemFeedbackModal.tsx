import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitItemFeedback, ItemType, FeedbackCategory } from '@/hooks/useItemFeedback';

interface ItemFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  chapterId?: string;
  itemType: ItemType;
  itemId?: string;
  itemTitle?: string;
}

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'content_quality', label: 'Content Quality' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'error', label: 'Error/Mistake' },
  { value: 'other', label: 'Other' },
];

export default function ItemFeedbackModal({
  isOpen,
  onClose,
  moduleId,
  chapterId,
  itemType,
  itemId,
  itemTitle,
}: ItemFeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>('content_quality');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const submitFeedback = useSubmitItemFeedback();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter your feedback message');
      return;
    }

    try {
      await submitFeedback.mutateAsync({
        moduleId,
        chapterId,
        itemType,
        itemId,
        rating: rating || undefined,
        category,
        message: message.trim(),
        isAnonymous,
      });
      toast.success('Feedback submitted successfully');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const resetForm = () => {
    setRating(0);
    setCategory('content_quality');
    setMessage('');
    setIsAnonymous(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Submit Feedback
            {itemTitle && <span className="block text-sm font-normal text-muted-foreground mt-1">{itemTitle}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Rating */}
          <div>
            <Label>Rating (optional)</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
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

          {/* Message */}
          <div>
            <Label>Your Feedback</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Submit Anonymously</Label>
              <p className="text-xs text-muted-foreground">Your identity will be hidden from admins</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitFeedback.isPending}>
            {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
