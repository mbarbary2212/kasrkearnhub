import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';

interface LearningHubEmptyStateProps {
  onSelectModule: () => void;
}

export function LearningHubEmptyState({ onSelectModule }: LearningHubEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Select a module to begin</h3>
        
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Choose the module you are currently studying. Your progress, study plan, and assessments will appear here.
        </p>
        
        <Button onClick={onSelectModule} className="gap-2">
          Select Module
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
