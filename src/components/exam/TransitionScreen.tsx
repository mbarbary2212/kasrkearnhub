import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface TransitionScreenProps {
  durationSeconds: number;
  currentQuestion: number;
  totalQuestions: number;
  onComplete: () => void;
}

export function TransitionScreen({
  durationSeconds,
  currentQuestion,
  totalQuestions,
  onComplete,
}: TransitionScreenProps) {
  const [countdown, setCountdown] = useState(durationSeconds);

  useEffect(() => {
    if (countdown <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="py-12 text-center space-y-4">
        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
        <div>
          <p className="text-lg font-medium">Get Ready</p>
          <p className="text-muted-foreground">
            Question {currentQuestion + 1} of {totalQuestions}
          </p>
        </div>
        <div className="text-4xl font-bold text-primary">
          {countdown}
        </div>
        <p className="text-sm text-muted-foreground">
          Next question starting...
        </p>
      </CardContent>
    </Card>
  );
}
