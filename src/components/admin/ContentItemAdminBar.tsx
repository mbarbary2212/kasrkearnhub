import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Pencil, BarChart3, ClipboardCheck, MessageSquare, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useUpsertReviewNote } from '@/hooks/useContentQualitySignals';
import { useMaterialFeedbackDetails } from '@/hooks/useContentQualitySignals';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContentMaterialType } from '@/lib/contentNavigation';
import { ContentQualitySection } from '@/components/analytics/ContentQualitySection';
import { ContentQualityFlagBadge } from '@/components/analytics/ContentQualityFlagBadge';
import type { QualitySignals } from '@/hooks/useContentQualitySignals';

interface ContentItemAdminBarProps {
  materialType: ContentMaterialType;
  materialId: string;
  chapterId?: string;
  onEdit?: () => void;
  className?: string;
  /** Whether the feedback panel is expanded */
  feedbackOpen?: boolean;
  /** Callback to toggle feedback panel — enables single-open-at-a-time pattern from parent */
  onToggleFeedback?: () => void;
}

export function ContentItemAdminBar({
  materialType,
  materialId,
  chapterId,
  onEdit,
  className,
  feedbackOpen = false,
  onToggleFeedback,
}: ContentItemAdminBarProps) {
  const navigate = useNavigate();
  const upsertReview = useUpsertReviewNote();

  // Local toggle fallback when parent doesn't manage state
  const [localFeedbackOpen, setLocalFeedbackOpen] = useState(false);
  const isFeedbackOpen = onToggleFeedback ? feedbackOpen : localFeedbackOpen;
  const toggleFeedback = onToggleFeedback ?? (() => setLocalFeedbackOpen(prev => !prev));

  // Lazy-load reaction counts — pass undefined materialId until requested
  const [loadCounts, setLoadCounts] = useState(false);
  const effectiveId = (loadCounts || isFeedbackOpen) ? materialId : undefined;
  const { data: feedbackData } = useMaterialFeedbackDetails(materialType, effectiveId);

  const helpfulCount = feedbackData?.reactions?.filter(r => r.reaction_type === 'up').length ?? 0;
  const unhelpfulCount = feedbackData?.reactions?.filter(r => r.reaction_type === 'down').length ?? 0;
  const feedbackCount = feedbackData?.feedback?.length ?? 0;

  const handleViewAnalytics = () => {
    navigate(`/admin?tab=analytics`);
  };

  const handleMarkForReview = async () => {
    try {
      await upsertReview.mutateAsync({
        materialType,
        materialId,
        chapterId: chapterId || null,
        reviewStatus: 'in_review',
        adminNote: 'Marked for review from content view',
      });
      toast.success('Marked for review');
    } catch {
      toast.error('Failed to mark for review');
    }
  };

  return (
    <div className={cn("space-y-0", className)}>
      <div className="flex items-center gap-1 py-1">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-primary/5 text-primary border-primary/20">
          Admin
        </Badge>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); handleViewAnalytics(); }}
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          Analytics
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-xs text-muted-foreground hover:text-foreground",
            isFeedbackOpen && "bg-muted text-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!loadCounts) setLoadCounts(true);
            toggleFeedback();
          }}
          onMouseEnter={() => { if (!loadCounts) setLoadCounts(true); }}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Feedback
          {feedbackCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1 min-w-[16px]">{feedbackCount}</Badge>
          )}
        </Button>
        {/* Compact reaction counts */}
        {loadCounts && (helpfulCount > 0 || unhelpfulCount > 0) && (
          <div className="flex items-center gap-1.5 ml-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="h-3 w-3 text-emerald-500" />
              {helpfulCount}
            </span>
            <span className="flex items-center gap-0.5">
              <ThumbsDown className="h-3 w-3 text-destructive" />
              {unhelpfulCount}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); handleMarkForReview(); }}
          disabled={upsertReview.isPending}
        >
          <ClipboardCheck className="h-3 w-3 mr-1" />
          Review
        </Button>
      </div>

      {/* Inline feedback panel */}
      {isFeedbackOpen && (
        <div className="mt-1 mb-2">
          <ContentQualitySection
            materialType={materialType}
            materialId={materialId}
            chapterId={chapterId}
          />
        </div>
      )}
    </div>
  );
}
