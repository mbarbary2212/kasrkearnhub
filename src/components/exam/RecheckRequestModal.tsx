import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSubmitRecheckRequest } from '@/hooks/useExamResults';

interface RecheckRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attemptId: string;
  answerId: string;
  questionTitle: string;
  currentScore: number | null;
  maxScore: number | null;
}

export function RecheckRequestModal({
  open,
  onOpenChange,
  attemptId,
  answerId,
  questionTitle,
  currentScore,
  maxScore,
}: RecheckRequestModalProps) {
  const [reason, setReason] = useState('');
  const submitRequest = useSubmitRecheckRequest();

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await submitRequest.mutateAsync({ attemptId, answerId, reason: reason.trim() });
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Rechecking</DialogTitle>
          <DialogDescription>
            Submit a request to have your answer reviewed by an admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{questionTitle}</p>
            {currentScore !== null && maxScore !== null && (
              <Badge variant="secondary" className="mt-2">
                Score: {currentScore}/{maxScore}
              </Badge>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Reason for rechecking
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you believe your answer deserves a different score..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitRequest.isPending}
          >
            {submitRequest.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
