import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useReportMessage } from "@/hooks/useDiscussions";

interface ReportModalProps {
  messageId: string | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or advertising" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "off-topic", label: "Off-topic or irrelevant" },
  { value: "misinformation", label: "Medical misinformation" },
  { value: "other", label: "Other" },
];

export function ReportModal({ messageId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  
  const reportMessage = useReportMessage();

  const handleSubmit = async () => {
    if (!messageId || !reason) return;
    
    const fullReason = details.trim() 
      ? `${reason}: ${details.trim()}`
      : reason;
    
    try {
      await reportMessage.mutateAsync({
        messageId,
        reason: fullReason,
      });
      
      setReason("");
      setDetails("");
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={!!messageId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Why are you reporting this message?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map(r => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide more context if needed..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Reports are reviewed by administrators. False reports may result in action being taken on your account.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!reason || reportMessage.isPending}
            variant="destructive"
          >
            {reportMessage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
