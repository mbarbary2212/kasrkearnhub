import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ConnectView = 'messages' | 'inquiry' | 'feedback' | 'discussions' | 'study-groups';

interface ConnectContextType {
  isOpen: boolean;
  activeView: ConnectView;
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string;
  yearId?: string;
  openConnect: (view?: ConnectView, moduleContext?: { moduleId?: string; moduleName?: string; moduleCode?: string; yearId?: string }) => void;
  closeConnect: () => void;
  setView: (view: ConnectView) => void;
}

const ConnectContext = createContext<ConnectContextType | null>(null);

export function ConnectProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ConnectView>('menu');
  const [moduleId, setModuleId] = useState<string | undefined>();
  const [moduleName, setModuleName] = useState<string | undefined>();
  const [moduleCode, setModuleCode] = useState<string | undefined>();
  const [yearId, setYearId] = useState<string | undefined>();

  const openConnect = useCallback((view: ConnectView = 'menu', moduleContext?: { moduleId?: string; moduleName?: string; moduleCode?: string; yearId?: string }) => {
    setActiveView(view);
    if (moduleContext) {
      setModuleId(moduleContext.moduleId);
      setModuleName(moduleContext.moduleName);
      setModuleCode(moduleContext.moduleCode);
      setYearId(moduleContext.yearId);
    }
    setIsOpen(true);
  }, []);

  const closeConnect = useCallback(() => {
    setIsOpen(false);
    // Reset view after close animation
    setTimeout(() => setActiveView('menu'), 300);
  }, []);

  const setView = useCallback((view: ConnectView) => {
    setActiveView(view);
  }, []);

  return (
    <ConnectContext.Provider value={{ isOpen, activeView, moduleId, moduleName, moduleCode, yearId, openConnect, closeConnect, setView }}>
      {children}
    </ConnectContext.Provider>
  );
}

export function useConnect() {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error('useConnect must be used within ConnectProvider');
  return ctx;
}
