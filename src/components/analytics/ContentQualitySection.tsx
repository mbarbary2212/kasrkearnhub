import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  CheckCircle, 
  Eye,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useMaterialFeedbackDetails, 
  useUpsertReviewNote 
} from '@/hooks/useContentQualitySignals';

interface ContentQualitySectionProps {
  materialType: string;
  materialId: string;
  chapterId?: string | null;
}

const feedbackTypeLabels: Record<string, string> = {
  incorrect_content: 'Incorrect content',
  unclear_explanation: 'Unclear explanation',
  too_easy: 'Too easy',
  too_difficult: 'Too difficult',
  poor_wording: 'Poor wording',
  technical_issue: 'Technical issue',
  other: 'Other',
};

export function ContentQualitySection({ materialType, materialId, chapterId }: ContentQualitySectionProps) {
  const { data, isLoading } = useMaterialFeedbackDetails(materialType, materialId);
  const upsertReview = useUpsertReviewNote();
  const [adminNote, setAdminNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (isLoading) return null;

  const { reactions = [], feedback = [], reviewNote } = data || {};

  const helpfulCount = reactions.filter(r => r.reaction_type === 'up').length;
  const unhelpfulCount = reactions.filter(r => r.reaction_type === 'down').length;

  // Group feedback by type
  const feedbackByType: Record<string, number> = {};
  feedback.forEach(f => {
    feedbackByType[f.feedback_type] = (feedbackByType[f.feedback_type] || 0) + 1;
  });

  const handleMarkStatus = async (status: string) => {
    try {
      await upsertReview.mutateAsync({
        materialType,
        materialId,
        chapterId,
        reviewStatus: status,
        adminNote: adminNote || reviewNote?.admin_note || undefined,
      });
      toast.success(status === 'resolved' ? 'Marked as resolved' : 'Marked for review');
    } catch {
      toast.error('Failed to update review status');
    }
  };

  const handleSaveNote = async () => {
    try {
      await upsertReview.mutateAsync({
        materialType,
        materialId,
        chapterId,
        reviewStatus: reviewNote?.review_status || 'in_review',
        adminNote,
      });
      setShowNoteInput(false);
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Content Quality
          {reviewNote && (
            <Badge 
              variant="outline" 
              className={
                reviewNote.review_status === 'resolved' 
                  ? 'bg-green-50 text-green-600 border-green-200' 
                  : reviewNote.review_status === 'in_review'
                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                    : ''
              }
            >
              {reviewNote.review_status === 'resolved' ? 'Resolved' : 
               reviewNote.review_status === 'in_review' ? 'In Review' : 'New'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reaction counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20">
            <ThumbsUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{helpfulCount}</span>
            <span className="text-xs text-muted-foreground">helpful</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{unhelpfulCount}</span>
            <span className="text-xs text-muted-foreground">not helpful</span>
          </div>
        </div>

        {/* Feedback breakdown */}
        {Object.keys(feedbackByType).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Feedback breakdown</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(feedbackByType).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {feedbackTypeLabels[type] || type} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Admin note */}
        {reviewNote?.admin_note && !showNoteInput && (
          <div className="p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Admin note</p>
            <p className="text-sm">{reviewNote.admin_note}</p>
          </div>
        )}

        {/* Note input */}
        {showNoteInput && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add an internal admin note..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSaveNote}
                disabled={upsertReview.isPending}
              >
                {upsertReview.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNoteInput(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={reviewNote?.review_status === 'in_review' ? 'secondary' : 'outline'}
            onClick={() => handleMarkStatus('in_review')}
            disabled={upsertReview.isPending}
          >
            <Eye className="h-3 w-3 mr-1" />
            Mark for review
          </Button>
          <Button
            size="sm"
            variant={reviewNote?.review_status === 'resolved' ? 'secondary' : 'outline'}
            onClick={() => handleMarkStatus('resolved')}
            disabled={upsertReview.isPending}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Mark resolved
          </Button>
          {!showNoteInput && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdminNote(reviewNote?.admin_note || '');
                setShowNoteInput(true);
              }}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {reviewNote?.admin_note ? 'Edit note' : 'Add note'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
