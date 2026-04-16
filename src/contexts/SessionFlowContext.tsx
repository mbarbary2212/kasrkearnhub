import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export interface SessionTask {
  title: string;
  moduleId: string;
  chapterId: string;
  tab: string;
  subtab?: string;
  estimatedMinutes?: number;
  reason?: string;
  dailyPlanTaskId?: string;
}

interface SessionFlowState {
  isActive: boolean;
  tasks: SessionTask[];
  currentIndex: number;
}

interface SessionFlowContextValue {
  session: SessionFlowState;
  startSession: (tasks: SessionTask[], startIndex?: number, onTaskCompleted?: (taskId: string) => void) => void;
  endSession: () => void;
  showNextTaskModal: () => void;
  dismissModal: () => void;
  advanceToNext: () => SessionTask | null;
  markCurrentDone: () => void;
  isModalOpen: boolean;
  currentTask: SessionTask | null;
  nextTask: SessionTask | null;
  progress: { current: number; total: number };
}

const SessionFlowContext = createContext<SessionFlowContextValue | null>(null);

export function useSessionFlow() {
  const ctx = useContext(SessionFlowContext);
  if (!ctx) throw new Error('useSessionFlow must be used within SessionFlowProvider');
  return ctx;
}

const INITIAL_STATE: SessionFlowState = {
  isActive: false,
  tasks: [],
  currentIndex: 0,
};

export function SessionFlowProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionFlowState>(INITIAL_STATE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const onTaskCompletedRef = useRef<((taskId: string) => void) | undefined>();

  const startSession = useCallback((tasks: SessionTask[], startIndex = 0, onTaskCompleted?: (taskId: string) => void) => {
    if (tasks.length === 0) return;
    onTaskCompletedRef.current = onTaskCompleted;
    setSession({ isActive: true, tasks, currentIndex: startIndex });
    setIsModalOpen(false);
  }, []);

  const endSession = useCallback(() => {
    onTaskCompletedRef.current = undefined;
    setSession(INITIAL_STATE);
    setIsModalOpen(false);
  }, []);

  const markCurrentDone = useCallback(() => {
    const task = session.isActive ? session.tasks[session.currentIndex] : null;
    if (task?.dailyPlanTaskId && onTaskCompletedRef.current) {
      onTaskCompletedRef.current(task.dailyPlanTaskId);
    }
  }, [session]);

  const showNextTaskModal = useCallback(() => setIsModalOpen(true), []);
  const dismissModal = useCallback(() => setIsModalOpen(false), []);

  const advanceToNext = useCallback((): SessionTask | null => {
    let next: SessionTask | null = null;
    setSession(prev => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.tasks.length) {
        onTaskCompletedRef.current = undefined;
        return INITIAL_STATE;
      }
      next = prev.tasks[nextIndex];
      return { ...prev, currentIndex: nextIndex };
    });
    return next;
  }, []);

  const currentTask = session.isActive ? session.tasks[session.currentIndex] ?? null : null;
  const nextTask = session.isActive ? session.tasks[session.currentIndex + 1] ?? null : null;
  const progress = { current: session.currentIndex + 1, total: session.tasks.length };

  return (
    <SessionFlowContext.Provider value={{
      session, startSession, endSession, showNextTaskModal, dismissModal,
      advanceToNext, markCurrentDone, isModalOpen, currentTask, nextTask, progress,
    }}>
      {children}
    </SessionFlowContext.Provider>
  );
}
