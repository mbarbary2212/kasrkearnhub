import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================
// Dashboard Metrics Skeletons
// ============================================

/** Skeleton for DashboardStatusStrip - 3-column metrics display */
export function DashboardStatusStripSkeleton() {
  return (
    <Card className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exam Readiness */}
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        
        {/* Coverage Progress */}
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        
        {/* Study Streak */}
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Skeleton for DashboardTestProgress - 3-column performance cards */
export function DashboardTestProgressSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border space-y-2"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Chapter List Skeletons
// ============================================

/** Skeleton for individual chapter row in lists */
export function ChapterRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
    </div>
  );
}

/** Skeleton for DashboardProgressMap - chapter list with module headers */
export function DashboardProgressMapSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[1, 2].map(moduleIdx => (
          <div key={moduleIdx}>
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="grid gap-2">
              {[1, 2, 3, 4].map(chapterIdx => (
                <ChapterRowSkeleton key={chapterIdx} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Skeleton for lecture/chapter list in ModuleLearningTab */
export function LectureListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="border rounded-lg divide-y">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-4">
          <Skeleton className="h-6 w-10 rounded" />
          <Skeleton className="h-4 flex-1 max-w-xs" />
          <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// Question Card Skeletons
// ============================================

/** Skeleton for MCQ Card */
export function McqCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-10 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border-2 border-border">
              <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="flex justify-center pt-2">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton for OSCE Question Card */
export function OsceCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-10 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clinical image placeholder */}
        <Skeleton className="w-full h-48 rounded-lg" />
        
        {/* History */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Statements */}
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-4 flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center pt-2">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton for Matching Question Card */
export function MatchingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-10 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Two column matching interface */}
        <div className="grid grid-cols-2 gap-4">
          {/* Column A */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 mb-2" />
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          {/* Column B */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 mb-2" />
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Progress Chart Skeletons
// ============================================

/** Skeleton for ChapterProgressBar */
export function ChapterProgressBarSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

/** Skeleton for weekly summary stats */
export function WeeklySummarySkeleton() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Generic List Skeletons
// ============================================

/** Generic skeleton for question lists (MCQ, OSCE, etc.) */
export function QuestionListSkeleton({ count = 3, type = 'mcq' }: { count?: number; type?: 'mcq' | 'osce' | 'matching' }) {
  const SkeletonComponent = type === 'osce' 
    ? OsceCardSkeleton 
    : type === 'matching' 
      ? MatchingCardSkeleton 
      : McqCardSkeleton;
  
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
}
