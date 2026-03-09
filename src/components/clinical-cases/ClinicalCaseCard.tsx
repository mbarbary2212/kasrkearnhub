import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Stethoscope, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Play,
  Trophy,
  User,
  Sparkles,
} from 'lucide-react';
import { ClinicalCase } from '@/types/clinicalCase';
import { useClinicalCaseAttempts } from '@/hooks/useClinicalCases';
import { cn } from '@/lib/utils';

interface ClinicalCaseCardProps {
  clinicalCase: ClinicalCase;
  onStart: (caseId: string) => void;
  isLoading?: boolean;
}

const LEVEL_COLORS = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function ClinicalCaseCard({ clinicalCase, onStart, isLoading }: ClinicalCaseCardProps) {
  const { data: attempts } = useClinicalCaseAttempts(clinicalCase.id);
  
  const completedAttempts = attempts?.filter(a => a.is_completed) || [];
  const bestScore = completedAttempts.length > 0 
    ? Math.max(...completedAttempts.map(a => a.score))
    : null;
  const hasCompleted = completedAttempts.length > 0;

  const patientInitials = clinicalCase.patient_name 
    ? clinicalCase.patient_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <Card className={cn(
      "hover:shadow-md transition-all cursor-pointer group",
      hasCompleted && "border-green-200 dark:border-green-800/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden",
            hasCompleted 
              ? "bg-green-100 dark:bg-green-900/30" 
              : "bg-primary/10"
          )}>
            {clinicalCase.patient_image_url ? (
              <Avatar className="w-12 h-12 rounded-xl">
                <AvatarImage src={clinicalCase.patient_image_url} alt={clinicalCase.patient_name || 'Patient'} />
                <AvatarFallback className="rounded-xl bg-primary/10">
                  {patientInitials || <User className="w-6 h-6 text-primary" />}
                </AvatarFallback>
              </Avatar>
            ) : hasCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <Stethoscope className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className="gap-1 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" variant="secondary">
                <Sparkles className="w-3 h-3" />
                AI Case
              </Badge>
              <Badge className={LEVEL_COLORS[clinicalCase.level]} variant="secondary">
                {clinicalCase.level.charAt(0).toUpperCase() + clinicalCase.level.slice(1)}
              </Badge>
              {hasCompleted && bestScore !== null && (
                <Badge variant="outline" className="gap-1">
                  <Trophy className="w-3 h-3" />
                  {Math.round(bestScore)}%
                </Badge>
              )}
            </div>
            <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
              {clinicalCase.title}
            </CardTitle>
            {(clinicalCase.patient_name || clinicalCase.patient_age) && (
              <CardDescription className="text-xs mt-1">
                {clinicalCase.patient_name}
                {clinicalCase.patient_age && `, ${clinicalCase.patient_age} y/o`}
                {clinicalCase.patient_gender && ` ${clinicalCase.patient_gender}`}
              </CardDescription>
            )}
            {clinicalCase.chapter && !clinicalCase.patient_name && (
              <CardDescription className="text-xs mt-1">
                Ch. {clinicalCase.chapter.chapter_number}: {clinicalCase.chapter.title}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative h-10 overflow-hidden group/desc">
          <p className="text-sm text-muted-foreground absolute animate-[marquee-vertical_8s_linear_infinite] group-hover/desc:[animation-play-state:paused]">
            {clinicalCase.intro_text}
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {clinicalCase.max_turns || 10} turns
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            ~{clinicalCase.estimated_minutes} min
          </span>
          {completedAttempts.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedAttempts.length} attempt{completedAttempts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <Button 
          onClick={() => onStart(clinicalCase.id)} 
          className="w-full gap-2"
          disabled={isLoading}
          variant={hasCompleted ? "outline" : "default"}
        >
          <Play className="w-4 h-4" />
          {hasCompleted ? 'Retry Case' : 'Start Case'}
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClinicalCaseCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
