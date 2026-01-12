import { Button } from '@/components/ui/button';
import { useCoachContext, type QuestionContext, type ResourceContext, type StudyContext } from '@/contexts/CoachContext';
import { GraduationCap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AskCoachButtonProps {
  // Context to inject when button is clicked
  context?: Partial<StudyContext>;
  question?: QuestionContext;
  resource?: ResourceContext;
  
  // Styling
  variant?: 'default' | 'chip' | 'icon';
  className?: string;
  
  // Initial message to send
  initialMessage?: string;
}

export function AskCoachButton({
  context,
  question,
  resource,
  variant = 'chip',
  className,
  initialMessage,
}: AskCoachButtonProps) {
  const { openAskCoach, setStudyContext, studyContext, shouldPulse } = useCoachContext();

  const handleClick = () => {
    // Merge context with existing studyContext
    if (context || question || resource) {
      setStudyContext({
        ...studyContext,
        ...context,
        question: question || studyContext?.question,
        resource: resource || studyContext?.resource,
        pageType: context?.pageType || studyContext?.pageType || 'practice',
      } as StudyContext);
    }
    
    openAskCoach(initialMessage || (question ? "Help me with this question" : undefined));
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          "h-8 w-8 rounded-full",
          shouldPulse && "animate-pulse",
          className
        )}
        title="Ask Study Coach"
      >
        <GraduationCap className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === 'chip') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={cn(
          "h-7 gap-1.5 px-2.5 rounded-full text-xs font-medium",
          "bg-primary/5 hover:bg-primary/10 border-primary/20",
          shouldPulse && "animate-pulse ring-2 ring-primary/30",
          className
        )}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Ask Coach</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={cn(
        "gap-2",
        shouldPulse && "animate-pulse ring-2 ring-primary/30",
        className
      )}
    >
      <GraduationCap className="h-4 w-4" />
      <span>Ask Study Coach</span>
    </Button>
  );
}
