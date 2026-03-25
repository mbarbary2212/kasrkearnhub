import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LearningEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-8">
          <BookOpen className="w-10 h-10 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold mb-3">Select a Module to Start Learning</h1>

        <p className="text-muted-foreground text-base mb-8">
          Choose a module from the Dashboard to access chapters, resources, and practice materials.
        </p>

        <Button size="lg" onClick={() => navigate('/')} className="gap-2">
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
