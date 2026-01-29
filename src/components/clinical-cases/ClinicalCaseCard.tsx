import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Stethoscope, 
  Clock, 
  Layers, 
  CheckCircle2, 
  ChevronRight,
  Play,
  Trophy,
  BookOpen,
  User,
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

const MODE_BADGES = {
  read_case: { label: 'Read', icon: BookOpen, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  practice_case: { label: 'Practice', icon: Play, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  branched_case: { label: 'Branched', icon: Layers, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

export function ClinicalCaseCard({ clinicalCase, onStart, isLoading }: ClinicalCaseCardProps) {
  const { data: attempts } = useClinicalCaseAttempts(clinicalCase.id);
  
  const completedAttempts = attempts?.filter(a => a.is_completed) || [];
  const bestScore = completedAttempts.length > 0 
    ? Math.max(...completedAttempts.map(a => a.score))
    : null;
  const hasCompleted = completedAttempts.length > 0;
  
  const isReadCase = clinicalCase.case_mode === 'read_case';
  const modeBadge = MODE_BADGES[clinicalCase.case_mode || 'practice_case'];
  const ModeIcon = modeBadge.icon;

  // Patient avatar/thumbnail
  const patientInitials = clinicalCase.patient_name 
    ? clinicalCase.patient_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <Card className={cn(
      "hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-content-case card-interactive",
      hasCompleted && "border-green-200 dark:border-green-800/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Patient Avatar or Default Icon */}
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
              {/* Case Mode Badge */}
              <Badge className={cn("gap-1", modeBadge.className)} variant="secondary">
                <ModeIcon className="w-3 h-3" />
                {modeBadge.label}
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
            {/* Patient demographics */}
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
        <p className="text-sm text-muted-foreground line-clamp-2">
          {clinicalCase.intro_text}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {!isReadCase && (
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {clinicalCase.stage_count || 0} stages
            </span>
          )}
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
          {isReadCase ? (
            <>
              <BookOpen className="w-4 h-4" />
              {hasCompleted ? 'Review Case' : 'Read Case'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {hasCompleted ? 'Retry Case' : 'Start Case'}
            </>
          )}
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
