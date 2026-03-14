import { useState, useMemo } from 'react';
import { useVideoAnalytics, VideoAnalyticsRow } from '@/hooks/useVideoAnalytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Bookmark, AlertTriangle, ThumbsUp, ThumbsDown, ArrowUpDown } from 'lucide-react';

type SortField = 'title' | 'totalViewers' | 'avgCompletionRate' | 'fullyWatchedCount' | 'bookmarkedCount' | 'thumbsUp' | 'thumbsDown' | 'approval';
type SortOrder = 'asc' | 'desc';

function getApproval(up: number, down: number): number | null {
  const total = up + down;
  if (total === 0) return null;
  return Math.round((up / total) * 100);
}

function ApprovalPill({ up, down }: { up: number; down: number }) {
  const approval = getApproval(up, down);
  if (approval === null) {
    return <Badge variant="secondary" className="text-xs">No ratings</Badge>;
  }
  const colorClass = approval >= 75
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : approval >= 50
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return <Badge variant="secondary" className={`text-xs ${colorClass}`}>{approval}%</Badge>;
}

function CompletionBar({ value }: { value: number }) {
  const colorClass = value >= 75
    ? '[&>div]:bg-green-500'
    : value >= 50
      ? '[&>div]:bg-amber-500'
      : '[&>div]:bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Progress value={value} className={`h-2 w-16 ${colorClass}`} />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{value}%</span>
    </div>
  );
}

export function VideoAnalyticsTab() {
  const { data, isLoading } = useVideoAnalytics();
  const [sortField, setSortField] = useState<SortField>('totalViewers');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'approval': cmp = (getApproval(a.thumbsUp, a.thumbsDown) ?? -1) - (getApproval(b.thumbsUp, b.thumbsDown) ?? -1); break;
        default: cmp = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [data, sortField, sortOrder]);

  // Summary stats
  const mostWatched = useMemo(() => data?.length ? data.reduce((best, r) => r.totalViewers > best.totalViewers ? r : best) : null, [data]);
  const mostBookmarked = useMemo(() => data?.length ? data.reduce((best, r) => r.bookmarkedCount > best.bookmarkedCount ? r : best) : null, [data]);
  const needsAttention = useMemo(() => {
    if (!data) return null;
    const eligible = data.filter(r => r.totalViewers >= 5);
    if (!eligible.length) return null;
    return eligible.reduce((worst, r) => r.avgCompletionRate < worst.avgCompletionRate ? r : worst);
  }, [data]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 bg-background select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mostWatched && mostWatched.totalViewers > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <Eye className="h-3.5 w-3.5" /> Most Watched
              </div>
              <div className="font-semibold text-sm truncate">{mostWatched.title}</div>
              <div className="text-xs text-muted-foreground">{mostWatched.totalViewers} viewers</div>
            </div>
          )}
          {mostBookmarked && mostBookmarked.bookmarkedCount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <Bookmark className="h-3.5 w-3.5" /> Most Bookmarked
              </div>
              <div className="font-semibold text-sm truncate">{mostBookmarked.title}</div>
              <div className="text-xs text-muted-foreground">{mostBookmarked.bookmarkedCount} bookmarks</div>
            </div>
          )}
          {needsAttention && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Needs Attention
              </div>
              <div className="font-semibold text-sm truncate">{needsAttention.title}</div>
              <div className="text-xs text-muted-foreground">{needsAttention.avgCompletionRate}% avg completion</div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[calc(100vh-22rem)]">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-20 bg-background">
            <TableRow className="hover:bg-background border-b">
              <SortHeader field="title">Title</SortHeader>
              <SortHeader field="totalViewers">Viewers</SortHeader>
              <SortHeader field="avgCompletionRate">Avg Completion</SortHeader>
              <SortHeader field="fullyWatchedCount">Fully Watched</SortHeader>
              <SortHeader field="bookmarkedCount">Bookmarked</SortHeader>
              <SortHeader field="thumbsUp">
                <ThumbsUp className="h-3.5 w-3.5" /> / <ThumbsDown className="h-3.5 w-3.5" />
              </SortHeader>
              <SortHeader field="approval">Approval</SortHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No video engagement data yet. Students need to watch videos for analytics to appear.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <TableRow key={row.lectureId}>
                  <TableCell className="max-w-[250px]">
                    <div className="font-medium text-sm truncate">{row.title}</div>
                  </TableCell>
                  <TableCell className="text-sm">{row.totalViewers}</TableCell>
                  <TableCell><CompletionBar value={row.avgCompletionRate} /></TableCell>
                  <TableCell className="text-sm">{row.fullyWatchedCount}</TableCell>
                  <TableCell className="text-sm">{row.bookmarkedCount}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <span className="text-green-600">{row.thumbsUp}</span>
                    {' / '}
                    <span className="text-red-600">{row.thumbsDown}</span>
                  </TableCell>
                  <TableCell><ApprovalPill up={row.thumbsUp} down={row.thumbsDown} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
