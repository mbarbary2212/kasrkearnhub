import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Stethoscope, 
  RotateCcw, 
  Video, 
  Star, 
  Shuffle, 
  FileText, 
  Briefcase,
  CheckCircle2,
  Play,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeedsPracticeItem, ContentCounts } from '@/hooks/useNeedsPractice';

interface DashboardNeedsPracticeProps {
  mcqNeedsPractice: NeedsPracticeItem[];
  osceNeedsPractice: NeedsPracticeItem[];
  videosToComplete: NeedsPracticeItem[];
  starredFlashcards: NeedsPracticeItem[];
  matchingToComplete: NeedsPracticeItem[];
  essaysToReview: NeedsPracticeItem[];
  casesToReview: NeedsPracticeItem[];
  counts: ContentCounts;
  onNavigate: (moduleId: string, chapterId: string, tab?: string) => void;
}

export function DashboardNeedsPractice({
  mcqNeedsPractice,
  osceNeedsPractice,
  videosToComplete,
  starredFlashcards,
  matchingToComplete,
  essaysToReview,
  casesToReview,
  counts,
  onNavigate,
}: DashboardNeedsPracticeProps) {
  const getScoreBadgeStyle = (score: number) => {
    if (score <= 2) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const getVideoBadgeStyle = (percent: number) => {
    if (percent === 0) return 'bg-muted text-muted-foreground';
    if (percent < 50) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  // Check if there's anything to show at all
  const hasAnyContent = 
    counts.mcqTotal > 0 || 
    counts.osceTotal > 0 || 
    counts.videoTotal > 0 || 
    counts.flashcardTotal > 0 || 
    counts.matchingTotal > 0 || 
    counts.essayTotal > 0 || 
    counts.caseScenarioTotal > 0;

  if (!hasAnyContent) {
    return null;
  }

  // Check if all content is complete (for "all clear" state)
  // IMPORTANT: require attemptedCount > 0 to avoid showing "mastered" on fresh accounts
  const allMcqsComplete = counts.mcqTotal > 0 && mcqNeedsPractice.length === 0 && counts.mcqAttempted > 0;
  const allOsceComplete = counts.osceTotal > 0 && osceNeedsPractice.length === 0 && counts.osceAttempted > 0;
  const allVideosComplete = counts.videoTotal > 0 && videosToComplete.length === 0;
  const allMatchingComplete = counts.matchingTotal > 0 && matchingToComplete.length === 0 && counts.matchingAttempted > 0;
  const allEssaysComplete = counts.essayTotal > 0 && essaysToReview.length === 0 && counts.essayAttempted > 0;
  const allCasesComplete = counts.caseScenarioTotal > 0 && casesToReview.length === 0 && counts.caseAttempted > 0;

  // "Not started" states — content exists but zero attempts
  const mcqNotStarted = counts.mcqTotal > 0 && mcqNeedsPractice.length === 0 && counts.mcqAttempted === 0;
  const osceNotStarted = counts.osceTotal > 0 && osceNeedsPractice.length === 0 && counts.osceAttempted === 0;
  const matchingNotStarted = counts.matchingTotal > 0 && matchingToComplete.length === 0 && counts.matchingAttempted === 0;
  const essayNotStarted = counts.essayTotal > 0 && essaysToReview.length === 0 && counts.essayAttempted === 0;
  const caseNotStarted = counts.caseScenarioTotal > 0 && casesToReview.length === 0 && counts.caseAttempted === 0;

  // Only show sections with content
  const showMcq = counts.mcqTotal > 0;
  const showOsce = counts.osceTotal > 0;
  const showVideos = counts.videoTotal > 0;
  const showFlashcards = counts.flashcardTotal > 0 && starredFlashcards.length > 0;
  const showMatching = counts.matchingTotal > 0;
  const showEssays = counts.essayTotal > 0;
  const showCases = counts.caseScenarioTotal > 0;

  // Render an "All Clear" card for completed sections
  const AllClearBadge = ({ message }: { message: string }) => (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <span className="text-sm text-green-700 dark:text-green-400">{message}</span>
    </div>
  );

  const NotStartedBadge = ({ message }: { message: string }) => (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50 border-border">
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* MCQ Needs Practice */}
      {showMcq && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              MCQ Practice
              {mcqNeedsPractice.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {mcqNeedsPractice.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allMcqsComplete ? (
              <AllClearBadge message="All MCQs mastered!" />
            ) : mcqNotStarted ? (
              <NotStartedBadge message="Not started yet — try some MCQs!" />
            ) : (
              <>
                {mcqNeedsPractice.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          Attempted
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.attemptCount} attempt{item.attemptCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {item.chapterTitle}
                      </p>
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => onNavigate(item.moduleId, item.chapterId, 'mcqs')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  </div>
                ))}
                {mcqNeedsPractice.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{mcqNeedsPractice.length - 5} more needing practice
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* OSCE Needs Practice */}
      {showOsce && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" />
              OSCE Practice
              {osceNeedsPractice.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {osceNeedsPractice.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allOsceComplete ? (
              <AllClearBadge message="OSCE stations complete!" />
            ) : osceNotStarted ? (
              <NotStartedBadge message="Not started yet — try some OSCE stations!" />
            ) : (
              <>
                {osceNeedsPractice.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getScoreBadgeStyle(item.score ?? 0))}
                        >
                          {item.score}/5
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Needs practice
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {item.chapterTitle}
                      </p>
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => onNavigate(item.moduleId, item.chapterId, 'osce')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  </div>
                ))}
                {osceNeedsPractice.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{osceNeedsPractice.length - 5} more needing practice
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Videos to Complete */}
      {showVideos && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-primary" />
              Videos to Complete
              {videosToComplete.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {videosToComplete.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allVideosComplete ? (
              <AllClearBadge message="All videos watched!" />
            ) : (
              <>
                {videosToComplete.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getVideoBadgeStyle(item.percentWatched ?? 0))}
                        >
                          {item.percentWatched ?? 0}%
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {item.chapterTitle}
                      </p>
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => onNavigate(item.moduleId, item.chapterId, 'videos')}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Watch
                    </Button>
                  </div>
                ))}
                {videosToComplete.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{videosToComplete.length - 5} more to watch
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Starred Flashcards */}
      {showFlashcards && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-primary" />
              Starred Flashcards
              <Badge variant="secondary" className="ml-auto text-xs">
                {starredFlashcards.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {starredFlashcards.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground truncate">
                    {item.chapterTitle}
                  </p>
                  <p className="text-sm truncate">{item.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => onNavigate(item.moduleId, item.chapterId, 'study')}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Review
                </Button>
              </div>
            ))}
            {starredFlashcards.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{starredFlashcards.length - 5} more starred
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matching Questions to Complete */}
      {showMatching && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shuffle className="h-4 w-4 text-primary" />
              Matching Questions
              {matchingToComplete.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {matchingToComplete.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allMatchingComplete ? (
              <AllClearBadge message="All matching complete!" />
            ) : matchingNotStarted ? (
              <NotStartedBadge message="Not started yet — try some matching questions!" />
            ) : (
              <>
                {matchingToComplete.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {item.chapterTitle}
                      </p>
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => onNavigate(item.moduleId, item.chapterId, 'matching')}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start
                    </Button>
                  </div>
                ))}
                {matchingToComplete.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{matchingToComplete.length - 5} more to complete
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Essays to Review */}
      {showEssays && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Essays to Review
              {essaysToReview.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {essaysToReview.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allEssaysComplete ? (
              <AllClearBadge message="All essays reviewed!" />
            ) : essayNotStarted ? (
              <NotStartedBadge message="Not started yet — try some essays!" />
            ) : (
              <>
                {essaysToReview.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {item.chapterTitle}
                      </p>
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => onNavigate(item.moduleId, item.chapterId, 'essays')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Review
                    </Button>
                  </div>
                ))}
                {essaysToReview.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{essaysToReview.length - 5} more to review
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Case Scenarios to Explore */}
      {showCases && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary" />
              Cases to Explore
              {casesToReview.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {casesToReview.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allCasesComplete ? (
              <AllClearBadge message="All cases explored!" />
            ) : caseNotStarted ? (
              <NotStartedBadge message="Not started yet — explore some cases!" />
            ) : (
              <>
                {casesToReview.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {item.chapterTitle}
                      </p>
                      <p className="text-sm truncate">{item.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => onNavigate(item.moduleId, item.chapterId, 'cases')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Explore
                    </Button>
                  </div>
                ))}
                {casesToReview.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{casesToReview.length - 5} more to explore
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
