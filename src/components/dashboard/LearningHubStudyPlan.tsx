import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, BookOpen } from 'lucide-react';

interface LearningHubStudyPlanProps {
  moduleSelected: boolean;
}

export function LearningHubStudyPlan({ moduleSelected }: LearningHubStudyPlanProps) {
  if (!moduleSelected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Study planning will appear after selecting a module.</p>
          <p className="text-sm mt-2">Choose a module from the selector above to see your personalized study plan.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Study Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Book-Based Study Planning</p>
          <p className="text-sm mt-2">
            A structured study plan based on your textbook chapters will be available here.
          </p>
          <p className="text-sm mt-1 text-muted-foreground/70">
            This feature is being developed to help you organize your learning journey.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
