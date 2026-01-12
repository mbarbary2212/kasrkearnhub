import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

export interface QuestionContext {
  questionId: string;
  questionText: string;
  choices?: Array<{ key: string; text: string }>;
  correctAnswer?: string;
  userAnswer?: string;
  explanation?: string;
  questionType: 'mcq' | 'osce' | 'matching' | 'essay' | 'case';
}

export interface ResourceContext {
  resourceId: string;
  title: string;
  type: 'lecture' | 'document' | 'flashcard' | 'mind_map' | 'video' | 'clinical_case';
  metadata?: Record<string, unknown>;
}

export interface StudyContext {
  pageType: 'resource' | 'practice' | 'test' | 'dashboard' | 'module' | 'chapter';
  moduleId?: string;
  moduleName?: string;
  departmentId?: string;
  departmentName?: string;
  chapterId?: string;
  chapterName?: string;
  topicId?: string;
  lectureId?: string;
  question?: QuestionContext;
  resource?: ResourceContext;
}

export interface PerformanceMetrics {
  recentAttempts: Array<{ correct: boolean; timestamp: number }>;
  consecutiveErrors: number;
  needsIntervention: boolean;
  lastInterventionTime?: number;
}

interface CoachContextType {
  // Study context
  studyContext: StudyContext | null;
  setStudyContext: (context: StudyContext | null) => void;
  updateStudyContext: (partial: Partial<StudyContext>) => void;
  
  // Performance tracking
  performance: PerformanceMetrics;
  recordAttempt: (correct: boolean) => void;
  resetPerformance: () => void;
  
  // Ask Coach panel
  askCoachOpen: boolean;
  openAskCoach: (initialMessage?: string) => void;
  closeAskCoach: () => void;
  initialCoachMessage: string | null;
  
  // Icon pulse state
  shouldPulse: boolean;
  dismissPulse: () => void;
}

const CoachContext = createContext<CoachContextType | null>(null);

const INTERVENTION_THRESHOLD = 3; // consecutive errors before suggesting help
const INTERVENTION_COOLDOWN = 5 * 60 * 1000; // 5 minutes between interventions

export function CoachProvider({ children }: { children: ReactNode }) {
  const [studyContext, setStudyContextState] = useState<StudyContext | null>(null);
  const [askCoachOpen, setAskCoachOpen] = useState(false);
  const [initialCoachMessage, setInitialCoachMessage] = useState<string | null>(null);
  const [shouldPulse, setShouldPulse] = useState(false);
  
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    recentAttempts: [],
    consecutiveErrors: 0,
    needsIntervention: false,
  });

  const setStudyContext = useCallback((context: StudyContext | null) => {
    setStudyContextState(context);
  }, []);

  const updateStudyContext = useCallback((partial: Partial<StudyContext>) => {
    setStudyContextState(prev => prev ? { ...prev, ...partial } : null);
  }, []);

  const recordAttempt = useCallback((correct: boolean) => {
    setPerformance(prev => {
      const now = Date.now();
      const recentAttempts = [...prev.recentAttempts, { correct, timestamp: now }]
        .filter(a => now - a.timestamp < 30 * 60 * 1000) // keep last 30 mins
        .slice(-20); // keep last 20 attempts

      const consecutiveErrors = correct ? 0 : prev.consecutiveErrors + 1;
      
      // Check if we should trigger intervention
      const shouldIntervene = consecutiveErrors >= INTERVENTION_THRESHOLD && 
        (!prev.lastInterventionTime || now - prev.lastInterventionTime > INTERVENTION_COOLDOWN);

      if (shouldIntervene) {
        setShouldPulse(true);
      }

      return {
        recentAttempts,
        consecutiveErrors,
        needsIntervention: shouldIntervene,
        lastInterventionTime: shouldIntervene ? now : prev.lastInterventionTime,
      };
    });
  }, []);

  const resetPerformance = useCallback(() => {
    setPerformance({
      recentAttempts: [],
      consecutiveErrors: 0,
      needsIntervention: false,
    });
    setShouldPulse(false);
  }, []);

  const openAskCoach = useCallback((initialMessage?: string) => {
    setInitialCoachMessage(initialMessage || null);
    setAskCoachOpen(true);
    setShouldPulse(false);
  }, []);

  const closeAskCoach = useCallback(() => {
    setAskCoachOpen(false);
    setInitialCoachMessage(null);
  }, []);

  const dismissPulse = useCallback(() => {
    setShouldPulse(false);
  }, []);

  return (
    <CoachContext.Provider
      value={{
        studyContext,
        setStudyContext,
        updateStudyContext,
        performance,
        recordAttempt,
        resetPerformance,
        askCoachOpen,
        openAskCoach,
        closeAskCoach,
        initialCoachMessage,
        shouldPulse,
        dismissPulse,
      }}
    >
      {children}
    </CoachContext.Provider>
  );
}

export function useCoachContext() {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error('useCoachContext must be used within a CoachProvider');
  }
  return context;
}

// Hook to generate context-aware prompt
export function useCoachPrompt() {
  const { studyContext, performance } = useCoachContext();
  
  const generatePrompt = useCallback(() => {
    if (!studyContext) return null;

    const parts: string[] = [];
    
    // Add page context
    if (studyContext.moduleName) {
      parts.push(`Module: ${studyContext.moduleName}`);
    }
    if (studyContext.chapterName) {
      parts.push(`Chapter: ${studyContext.chapterName}`);
    }
    
    // Add question context
    if (studyContext.question) {
      const q = studyContext.question;
      parts.push(`\n--- Current Question (${q.questionType.toUpperCase()}) ---`);
      parts.push(`Question: ${q.questionText}`);
      
      if (q.choices && q.choices.length > 0) {
        parts.push('Options:');
        q.choices.forEach(c => parts.push(`  ${c.key}. ${c.text}`));
      }
      
      if (q.userAnswer) {
        parts.push(`Student's answer: ${q.userAnswer}`);
      }
      if (q.correctAnswer) {
        parts.push(`Correct answer: ${q.correctAnswer}`);
      }
      if (q.explanation) {
        parts.push(`Explanation: ${q.explanation}`);
      }
    }
    
    // Add resource context
    if (studyContext.resource) {
      const r = studyContext.resource;
      parts.push(`\n--- Current Resource ---`);
      parts.push(`Type: ${r.type}`);
      parts.push(`Title: ${r.title}`);
    }
    
    // Add performance hint for the AI
    if (performance.needsIntervention) {
      parts.push(`\n[Note: Student has made ${performance.consecutiveErrors} consecutive errors. Please provide extra guidance and encouragement.]`);
    }
    
    return parts.join('\n');
  }, [studyContext, performance]);
  
  return { generatePrompt };
}
