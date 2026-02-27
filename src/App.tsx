import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BadgeCelebrationProvider } from "@/contexts/BadgeCelebrationContext";
import { CoachProvider } from "@/contexts/CoachContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { BadgeCelebration } from "@/components/ui/badge-celebration";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { AskCoachPanel } from "@/components/coach";
import { AudioMiniPlayer } from "@/components/audio";
import { ScrollToTop } from "@/components/ScrollToTop";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import YearPage from "./pages/YearPage";
import ModulePage from "./pages/ModulePage";
import ChapterPage from "./pages/ChapterPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import MockExamPage from "./pages/MockExamPage";
import BlueprintExamPage from "./pages/BlueprintExamPage";
import AdminPage from "./pages/AdminPage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminInboxPage from "./pages/AdminInboxPage";
import ProgressPage from "./pages/ProgressPage";
import AccountPage from "./pages/AccountPage";
import VirtualPatientPage from "./pages/VirtualPatientPage";
import NotFound from "./pages/NotFound";
import IntegrityReportPage from "./pages/IntegrityReportPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import ExamResultsPage from "./pages/ExamResultsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (window.location.pathname.startsWith('/auth')) return false;
    // Skip splash if user already has a session stored
    const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (storageKey && localStorage.getItem(storageKey)) return false;
    return true;
  });

  const handleDismissSplash = () => {
    setShowSplash(false);
  };

  // Prevent browser from opening dropped files in new tabs
  useEffect(() => {
    const preventBrowserDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    window.addEventListener('dragover', preventBrowserDrop);
    window.addEventListener('drop', preventBrowserDrop);
    
    return () => {
      window.removeEventListener('dragover', preventBrowserDrop);
      window.removeEventListener('drop', preventBrowserDrop);
    };
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen p-8 text-center"><div><h1 className="text-xl font-bold mb-2">Something went wrong</h1><p className="text-muted-foreground mb-4">An unexpected error occurred.</p><button className="px-4 py-2 bg-primary text-primary-foreground rounded" onClick={() => window.location.reload()}>Reload</button></div></div>}>
      {showSplash && <SplashScreen onDismiss={handleDismissSplash} />}
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BadgeCelebrationProvider>
        <CoachProvider>
          <AudioPlayerProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BadgeCelebration />
              <AskCoachPanel />
              <AudioMiniPlayer />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/year/:yearId" element={<YearPage />} />
                <Route path="/module/:moduleId" element={<ModulePage />} />
                <Route path="/module/:moduleId/mock-exam" element={<MockExamPage />} />
                <Route path="/module/:moduleId/blueprint-exam/:paperIndex" element={<BlueprintExamPage />} />
                <Route path="/module/:moduleId/exam-results/:attemptId" element={<ExamResultsPage />} />
                <Route path="/module/:moduleId/chapter/:chapterId" element={<ChapterPage />} />
                <Route path="/module/:moduleId/topic/:topicId" element={<TopicDetailPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/inbox" element={<AdminInboxPage />} />
                <Route path="/admin/integrity-report" element={<IntegrityReportPage />} />
                <Route path="/admin/activity-log" element={<ActivityLogPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/virtual-patient/:caseId" element={<VirtualPatientPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AudioPlayerProvider>
        </CoachProvider>
      </BadgeCelebrationProvider>
    </AuthProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};

export default App;
