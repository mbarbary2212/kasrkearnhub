import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSessionFlow } from '@/contexts/SessionFlowContext';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';

export function ContinueToNextTaskModal() {
  const navigate = useNavigate();
  const { isModalOpen, dismissModal, nextTask, advanceToNext, endSession, progress } = useSessionFlow();

  const handleContinue = () => {
    const task = advanceToNext();
    dismissModal();
    if (task) {
      const subtabParam = task.subtab ? `&subtab=${task.subtab}` : '';
      navigate(`/module/${task.moduleId}/chapter/${task.chapterId}?section=${task.tab || 'resources'}${subtabParam}`);
    }
  };

  const handleBackToPlan = () => {
    dismissModal();
    endSession();
    navigate('/');
  };

  const handleFinish = () => {
    dismissModal();
    endSession();
    navigate('/');
  };

  // Last task — show completion
  if (!nextTask) {
    return (
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleFinish()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              All tasks complete!
            </DialogTitle>
            <DialogDescription>
              You finished all {progress.total} tasks. Great session!
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleFinish} className="w-full gap-2">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && dismissModal()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Task complete!
          </DialogTitle>
          <DialogDescription>
            {progress.current} of {progress.total} tasks done. Ready for the next one?
          </DialogDescription>
        </DialogHeader>

        {/* Next task preview */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Up next</p>
          <p className="text-sm font-semibold text-foreground">{nextTask.title}</p>
          {nextTask.reason && (
            <p className="text-xs text-muted-foreground">{nextTask.reason}</p>
          )}
          {nextTask.estimatedMinutes && (
            <p className="text-xs text-muted-foreground">~{nextTask.estimatedMinutes} min</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={handleBackToPlan}>
            <Home className="h-3.5 w-3.5" />
            Back to Plan
          </Button>
          <Button className="flex-1 gap-1.5" onClick={handleContinue}>
            Continue
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
