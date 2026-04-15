import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';

import { useDueCards } from '@/hooks/useFSRS';
import { useDueMCQCount } from '@/hooks/useMCQFSRS';
import { LastPosition, buildResumeUrl, buildResumeLabel } from '@/hooks/useLastPosition';
import { DashboardData, SuggestedItem } from '@/hooks/useStudentDashboard';
import { ArrowRight, BookOpen, FlaskConical, PenLine, Play as PlayIcon, Video, GalleryHorizontal, BookOpenCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReadinessLabel, getResumeIconName } from '@/lib/readinessLabels';

interface ModuleDashboardProps {
  lastPosition: LastPosition | null;
  dashboard: DashboardData | null;
  moduleId: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

const taskIcon: Record<string, React.ElementType> = {
  read: BookOpen,
  mcq: FlaskConical,
  video: PlayIcon,
  essay: PenLine,
  flashcard: GalleryHorizontal,
};

const resumeIconMap: Record<string, React.ElementType> = {
  video: Video,
  practice: FlaskConical,
  flashcard: GalleryHorizontal,
  reading: BookOpenCheck,
};

export function ModuleDashboard({ lastPosition, dashboard, moduleId }: ModuleDashboardProps) {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  
  const { data: dueCards } = useDueCards();
  const dueCount = dueCards?.length ?? 0;
  const { data: dueMCQCount = 0 } = useDueMCQCount();

  const firstName = getFirstName(profile?.full_name);
  const greeting = getGreeting();

  const readiness = dashboard?.readinessResult?.examReadiness ?? 0;
  const streak = dashboard?.studyStreak ?? 0;
  const readinessLabel = getReadinessLabel(readiness);

  // Resume icon
  const resumeType = lastPosition ? getResumeIconName(lastPosition.tab, lastPosition.activity_position?.sub_tab as string | null) : 'reading';
  const ResumeIcon = resumeIconMap[resumeType] || PlayIcon;

  // Build suggestions (max 3)
  const suggestions: SuggestedItem[] = (dashboard?.suggestions ?? []).slice(0, 3);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Greeting */}
      <h2 className="text-xl md:text-2xl font-heading font-semibold">
        {greeting}, {firstName} 👋
      </h2>

      {/* 2. Continue button */}
      {lastPosition && lastPosition.chapter_id && (
        <button
          onClick={() => navigate(buildResumeUrl(lastPosition))}
          className={cn(
            'w-full rounded-xl p-4 text-left transition-all duration-200',
            'bg-accent text-accent-foreground hover:opacity-90 shadow-sm'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-foreground/10 flex items-center justify-center shrink-0">
              <ResumeIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Continue</p>
              <p className="text-xs opacity-80 truncate">
                {buildResumeLabel(lastPosition)}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0 opacity-70" />
          </div>
        </button>
      )}

      {/* 3. Stat cards row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <Card className="p-3 text-center">
          <p className="text-lg font-bold">🔥 {streak}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </Card>
        {/* Readiness */}
        <Card className="p-3 text-center">
          <p className={cn("text-lg font-bold text-accent-foreground")}>📊 {Math.round(readiness)}%</p>
          <p className="text-xs text-muted-foreground">{readinessLabel}</p>
        </Card>
      </div>

      {/* 4. Flashcard widget */}
      {dueCount > 0 ? (
        <Card
          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/review/flashcards')}
        >
          <div className="flex items-center gap-2 text-sm">
            <span>🃏</span>
            <span className="font-medium">{dueCount} card{dueCount === 1 ? '' : 's'} due today →</span>
          </div>
        </Card>
      ) : (
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <span>✓</span>
            <span className="font-medium">No cards due today</span>
          </div>
        </Card>
      )}

      {/* 4b. MCQ widget */}
      {dueMCQCount > 0 ? (
        <Card
          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/progress?tab=plan')}
        >
          <div className="flex items-center gap-2 text-sm">
            <span>🧠</span>
            <span className="font-medium">{dueMCQCount} MCQ{dueMCQCount === 1 ? '' : 's'} due today →</span>
          </div>
        </Card>
      ) : null}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Study Plan</h3>
          <div className="space-y-2">
            {suggestions.map((item, i) => {
              const Icon = taskIcon[item.type] || BookOpen;
              return (
                <Card
                  key={i}
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (item.chapterId && item.moduleId) {
                      const tab = item.type === 'mcq' || item.type === 'essay' ? 'practice' : item.type === 'video' ? 'resources' : 'resources';
                      const subtab = item.subtab ? `&subtab=${item.subtab}` : '';
                      navigate(`/module/${item.moduleId}/chapter/${item.chapterId}?section=${tab}${subtab}`);
                    } else if (item.type === 'flashcard') {
                      navigate('/review/flashcards');
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground truncate">{item.reason}{item.estimatedMinutes ? ` · ~${item.estimatedMinutes}m` : ''}</p>
                    )}
                  </div>
                  {item.estimatedMinutes && (
                    <span className="text-xs text-muted-foreground shrink-0">~{item.estimatedMinutes}m</span>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
