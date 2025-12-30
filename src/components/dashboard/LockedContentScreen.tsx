import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LockedContentScreenProps {
  level: number;
  unlockCriteria: string;
  onGoToSuggested?: () => void;
}

export function LockedContentScreen({ level, unlockCriteria, onGoToSuggested }: LockedContentScreenProps) {
  const navigate = useNavigate();

  const handleGoToSuggested = () => {
    if (onGoToSuggested) {
      onGoToSuggested();
    } else {
      // Default: navigate to progress page
      navigate('/progress');
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="py-10 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">This section will unlock as you progress</h3>
          
          <p className="text-muted-foreground mb-6">
            This content requires <span className="font-medium">Level {level}</span> access.
          </p>

          <div className="p-4 bg-muted/50 rounded-lg mb-6 text-left">
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              What you need to do:
            </p>
            <p className="text-sm text-muted-foreground">{unlockCriteria}</p>
          </div>
          
          <Button onClick={handleGoToSuggested} className="gap-2">
            Go to suggested next steps
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
