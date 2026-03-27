import { Button } from '@/components/ui/button';
import { useCoachContext, type QuestionContext, type ResourceContext, type StudyContext } from '@/contexts/CoachContext';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import studyCoachIcon from '@/assets/study-coach-icon.png';

interface AskCoachButtonProps {
  // Context to inject when button is clicked
  context?: Partial<StudyContext>;
  question?: QuestionContext;
  resource?: ResourceContext;
  
  // Styling
  variant?: 'default' | 'chip' | 'header' | 'icon';
  className?: string;
  
  // Initial message to send
  initialMessage?: string;
}

export function AskCoachButton({
  context,
  question,
  resource,
  variant = 'header',
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
          "h-9 w-9 rounded-full p-0.5 overflow-hidden",
          shouldPulse && "animate-pulse ring-2 ring-primary/50",
          className
        )}
        title="Ask"
      >
        <img 
          src={studyCoachIcon} 
          alt="Ask" 
          className="h-full w-full object-contain rounded-full" 
        />
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
        <span>Ask</span>
      </Button>
    );
  }

  // Header variant - prominent button for page headers
  if (variant === 'header') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={cn(
          "gap-2 px-3 h-9",
          "bg-gradient-to-r from-primary/10 to-primary/5",
          "hover:from-primary/20 hover:to-primary/10",
          "border-primary/30 hover:border-primary/50",
          "text-primary font-medium",
          "shadow-sm hover:shadow-md",
          "transition-all duration-200",
          shouldPulse && "animate-pulse ring-2 ring-primary/40",
          className
        )}
      >
        <img 
          src={studyCoachIcon} 
          alt="" 
          className="h-5 w-5 object-contain rounded-full" 
        />
        <span>Ask</span>
      </Button>
    );
  }

  // Default variant - standard button
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
      <img 
        src={studyCoachIcon} 
        alt="" 
        className="h-5 w-5 object-contain rounded-full" 
      />
      <span>Ask</span>
    </Button>
  );
}
