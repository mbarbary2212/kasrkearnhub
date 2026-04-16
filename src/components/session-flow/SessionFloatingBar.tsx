import { useSessionFlow } from '@/contexts/SessionFlowContext';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2 } from 'lucide-react';

export function SessionFloatingBar() {
  const { session, currentTask, progress, showNextTaskModal, endSession, nextTask, markCurrentDone } = useSessionFlow();

  if (!session.isActive || !currentTask) return null;

  return (
    <div className="sticky bottom-0 z-50 bg-card border-t border-border px-3 py-2 pr-16 animate-in slide-in-from-bottom-4 duration-300 sm:px-4 sm:pr-20">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Task {progress.current} of {progress.total}
          </span>
          <p className="text-sm font-semibold text-foreground truncate">{currentTask.title}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {nextTask ? (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { markCurrentDone(); showNextTaskModal(); }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done → Next
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { markCurrentDone(); showNextTaskModal(); }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finish Session
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={endSession}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
