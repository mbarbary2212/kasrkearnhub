import { useSessionFlow } from '@/contexts/SessionFlowContext';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2 } from 'lucide-react';

export function SessionFloatingBar() {
  const { session, currentTask, progress, showNextTaskModal, endSession, nextTask, markCurrentDone } = useSessionFlow();

  if (!session.isActive || !currentTask) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/50 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-lg shadow-black/30 max-w-[90vw] animate-in slide-in-from-bottom duration-300">
      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
        {progress.current}/{progress.total}
      </span>
      <span className="text-muted-foreground/50">·</span>
      <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">{currentTask.title}</p>
      {nextTask ? (
        <Button size="sm" className="rounded-full px-4 py-1.5 text-xs gap-1 h-auto" onClick={() => { markCurrentDone(); showNextTaskModal(); }}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Next
        </Button>
      ) : (
        <Button size="sm" className="rounded-full px-4 py-1.5 text-xs gap-1 h-auto" onClick={() => { markCurrentDone(); showNextTaskModal(); }}>
          Finish ✓
        </Button>
      )}
      <Button size="icon" variant="ghost" className="rounded-full h-7 w-7" onClick={endSession}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
