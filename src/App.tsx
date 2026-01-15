import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BadgeCelebrationProvider } from "@/contexts/BadgeCelebrationContext";
import { CoachProvider } from "@/contexts/CoachContext";
import { BadgeCelebration } from "@/components/ui/badge-celebration";
import { AskCoachPanel } from "@/components/coach";
import { useUpdateChecker } from "@/hooks/useUpdateChecker";
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

const queryClient = new QueryClient();

// Component that runs update checker inside providers
function UpdateCheckerRunner() {
  useUpdateChecker();
  return null;
}

const App = () => {
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
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BadgeCelebrationProvider>
        <CoachProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BadgeCelebration />
            <AskCoachPanel />
            <UpdateCheckerRunner />
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
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/virtual-patient/:caseId" element={<VirtualPatientPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CoachProvider>
      </BadgeCelebrationProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
