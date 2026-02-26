import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AICaseRunner } from '@/components/clinical-cases/AICaseRunner';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  User,
  Clock,
  Play,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useVirtualPatientCase, useStartVirtualPatientAttempt } from '@/hooks/useVirtualPatient';
import { toast } from 'sonner';

export default function VirtualPatientRunner() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  const { data: vpCase, isLoading } = useVirtualPatientCase(caseId);
  const startAttempt = useStartVirtualPatientAttempt();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!vpCase) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Case Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This case doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  // AI case is running
  if (started && attemptId) {
    return (
      <MainLayout>
        <AICaseRunner
          caseId={vpCase.id}
          attemptId={attemptId}
          introText={vpCase.intro_text}
          title={vpCase.title}
          onComplete={() => {}}
        />
      </MainLayout>
    );
  }

  // Intro screen
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">
                    {vpCase.level.charAt(0).toUpperCase() + vpCase.level.slice(1)} Level
                  </Badge>
                  <Badge className="gap-1 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" variant="secondary">
                    <Sparkles className="w-3 h-3" />
                    AI Case
                  </Badge>
                </div>
                <CardTitle className="text-xl">{vpCase.title}</CardTitle>
              </div>
            </div>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {vpCase.max_turns || 10} turns
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                ~{vpCase.estimated_minutes} min
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Chief Complaint / Presentation</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{vpCase.intro_text}</p>
            </div>

            <Button 
              onClick={async () => {
                try {
                  const result = await startAttempt.mutateAsync({
                    caseId: vpCase.id,
                  });
                  setAttemptId(result.id);
                  setStarted(true);
                } catch {
                  toast.error('Failed to start case. Please try again.');
                }
              }} 
              className="w-full gap-2" 
              size="lg"
              disabled={startAttempt.isPending}
            >
              <Play className="w-5 h-5" />
              {startAttempt.isPending ? 'Starting...' : 'Start AI Case'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
