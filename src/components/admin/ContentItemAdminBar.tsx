import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Pencil, BarChart3, ClipboardCheck } from 'lucide-react';
import { useUpsertReviewNote } from '@/hooks/useContentQualitySignals';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContentMaterialType } from '@/lib/contentNavigation';

interface ContentItemAdminBarProps {
  materialType: ContentMaterialType;
  materialId: string;
  chapterId?: string;
  onEdit?: () => void;
  className?: string;
}

export function ContentItemAdminBar({
  materialType,
  materialId,
  chapterId,
  onEdit,
  className,
}: ContentItemAdminBarProps) {
  const navigate = useNavigate();
  const upsertReview = useUpsertReviewNote();

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
    <div className={cn(
      "flex items-center gap-1 py-1",
      className
    )}>
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
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={(e) => { e.stopPropagation(); handleMarkForReview(); }}
        disabled={upsertReview.isPending}
      >
        <ClipboardCheck className="h-3 w-3 mr-1" />
        Review
      </Button>
    </div>
  );
}
