import { useEffect, useState } from "react";
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
import { AskCoachPanel } from "@/components/coach";
import { AudioMiniPlayer } from "@/components/audio";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import YearPage from "./pages/YearPage";
import ModulePage from "./pages/ModulePage";
import ChapterPage from "./pages/ChapterPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import MockExamPage from "./pages/MockExamPage";
import AdminPage from "./pages/AdminPage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminInboxPage from "./pages/AdminInboxPage";
import ProgressPage from "./pages/ProgressPage";
import AccountPage from "./pages/AccountPage";
import VirtualPatientPage from "./pages/VirtualPatientPage";
import NotFound from "./pages/NotFound";
import IntegrityReportPage from "./pages/IntegrityReportPage";
import ActivityLogPage from "./pages/ActivityLogPage";

const queryClient = new QueryClient();

const SPLASH_SESSION_KEY = 'splash_shown_this_session';

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash if not already shown this session
    return !sessionStorage.getItem(SPLASH_SESSION_KEY);
  });
  const [isFading, setIsFading] = useState(false);

  // Splash screen timing
  useEffect(() => {
    if (!showSplash) return;

    // Mark splash as shown for this session
    sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');

    // Start fade after 1.5s
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1500);

    // Remove splash after fade completes (1.5s + 0.5s fade)
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [showSplash]);

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
    <>
      {showSplash && <SplashScreen isFading={isFading} />}
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
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/year/:yearId" element={<YearPage />} />
                <Route path="/module/:moduleId" element={<ModulePage />} />
                <Route path="/module/:moduleId/mock-exam" element={<MockExamPage />} />
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
    </>
  );
};

export default App;
