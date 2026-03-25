import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ActiveYearInfo {
  yearNumber: number;
  yearName: string;
}

interface ActiveYearContextType {
  activeYear: ActiveYearInfo | null;
  setActiveYear: (year: ActiveYearInfo | null) => void;
}

const ActiveYearContext = createContext<ActiveYearContextType>({
  activeYear: null,
  setActiveYear: () => {},
});

export function ActiveYearProvider({ children }: { children: ReactNode }) {
  const [activeYear, setActiveYearState] = useState<ActiveYearInfo | null>(null);

  const setActiveYear = useCallback((year: ActiveYearInfo | null) => {
    setActiveYearState(year);
  }, []);

  return (
    <ActiveYearContext.Provider value={{ activeYear, setActiveYear }}>
      {children}
    </ActiveYearContext.Provider>
  );
}

export function useActiveYear() {
  return useContext(ActiveYearContext);
}
