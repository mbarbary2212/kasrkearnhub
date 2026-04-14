import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Target } from 'lucide-react';
import { useStudentGoals, useUpsertStudentGoals } from '@/hooks/useStudentGoals';

export function GoalsNudgeBanner() {
  const { data: goals, isLoading } = useStudentGoals();
  const upsert = useUpsertStudentGoals();
  const navigate = useNavigate();

  // Don't show if loading, or if goals exist and onboarding was shown
  if (isLoading) return null;
  if (goals?.goals_onboarding_shown) return null;

  const dismiss = () => {
    upsert.mutate({ goals_onboarding_shown: true });
  };

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 mb-4 animate-fade-in">
      <Target className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Set up your study profile to get personalized guidance
        </p>
      </div>
      <button
        onClick={() => navigate('/student-settings?tab=goals')}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 whitespace-nowrap"
      >
        Go to Settings <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={dismiss}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
