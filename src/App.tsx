import { useEffect, useState, lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SplashScreen from "@/components/SplashScreen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { PresencePageTracker } from "@/components/PresencePageTracker";
import { BadgeCelebrationProvider } from "@/contexts/BadgeCelebrationContext";
import { CoachProvider } from "@/contexts/CoachContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { ActiveYearProvider } from "@/contexts/ActiveYearContext";
import { BadgeCelebration } from "@/components/ui/badge-celebration";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { AskCoachPanel } from "@/components/coach";
import { ConnectProvider } from "@/contexts/ConnectContext";
import { ConnectModal } from "@/components/connect/ConnectModal";
import { AudioMiniPlayer } from "@/components/audio";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Loader2 } from "lucide-react";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DisclaimerDialog, DISCLAIMER_KEY } from "@/components/DisclaimerDialog";
import { useDisclaimerEnabled } from "@/hooks/useDisclaimerSetting";
import Home from "./pages/Home";
import Auth from "./pages/Auth";

const AllYearsPage = lazy(() => import("./pages/AllYearsPage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const ChapterPage = lazy(() => import("./pages/ChapterPage"));
const TopicDetailPage = lazy(() => import("./pages/TopicDetailPage"));
const MockExamPage = lazy(() => import("./pages/MockExamPage"));
const BlueprintExamPage = lazy(() => import("./pages/BlueprintExamPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminOverview = lazy(() => import("./pages/AdminOverview"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLearningPage = lazy(() => import("./pages/AdminLearningPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const AdminInboxPage = lazy(() => import("./pages/AdminInboxPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const VirtualPatientPage = lazy(() => import("./pages/VirtualPatientPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const IntegrityReportPage = lazy(() => import("./pages/IntegrityReportPage"));
const ActivityLogPage = lazy(() => import("./pages/ActivityLogPage"));
const ExamResultsPage = lazy(() => import("./pages/ExamResultsPage"));
const CasePreviewEditorPage = lazy(() => import("./pages/CasePreviewEditorPage"));
const CaseSummaryPage = lazy(() => import("./pages/CaseSummaryPage"));
const FlashcardReviewPage = lazy(() => import("./pages/FlashcardReviewPage"));
const StudentSettingsPage = lazy(() => import("./pages/StudentSettingsPage"));
const CustomizeContentPage = lazy(() => import("./pages/CustomizeContentPage"));
const FormativePage = lazy(() => import("./pages/FormativePage"));
const DiscussionsPage = lazy(() => import("./pages/DiscussionsPage"));
const StudyGroupsPage = lazy(() => import("./pages/StudyGroupsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const { data, isLoading } = useDisclaimerEnabled();

  const showDialog = !isLoading && data?.show === true && !accepted;

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    if (data?.version) {
      localStorage.setItem('kalm_disclaimer_version', data.version);
    }
    setAccepted(true);
  };

  return (
    <>
      {children}
      {showDialog && (
        <DisclaimerDialog onAccept={handleAccept} />
      )}
    </>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (window.location.pathname.startsWith('/auth')) return false;
    const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (storageKey && localStorage.getItem(storageKey)) return false;
    return true;
  });

  const handleDismissSplash = () => {
    setShowSplash(false);
  };

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
      <DisclaimerGate>
      <ActiveYearProvider>
      <PresenceProvider>
      <BadgeCelebrationProvider>
        <CoachProvider>
          <ConnectProvider>
          <AudioPlayerProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
               <BadgeCelebration />
               <AskCoachPanel />
               <ConnectModal />
               <AudioMiniPlayer />
               <PWAInstallBanner />
               
            <BrowserRouter>
              <PresencePageTracker />
              <ScrollToTop />
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin mr-2" />Loading...</div>}>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/progress" element={<ProtectedRoute><RouteErrorBoundary><ProgressPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><RouteErrorBoundary><AccountPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/years" element={<ProtectedRoute><RouteErrorBoundary><AllYearsPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/module/:moduleId" element={<ProtectedRoute><RouteErrorBoundary><ModulePage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/module/:moduleId/mock-exam" element={<ProtectedRoute><RouteErrorBoundary><MockExamPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/module/:moduleId/blueprint-exam/:paperIndex" element={<ProtectedRoute><RouteErrorBoundary><BlueprintExamPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/module/:moduleId/exam-results/:attemptId" element={<ProtectedRoute><RouteErrorBoundary><ExamResultsPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/module/:moduleId/chapter/:chapterId" element={<ProtectedRoute><RouteErrorBoundary><ChapterPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/module/:moduleId/topic/:topicId" element={<ProtectedRoute><RouteErrorBoundary><TopicDetailPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><AdminPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin/overview" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><AdminOverview /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><AdminDashboard /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin/learning" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><AdminLearningPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin/inbox" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><AdminInboxPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin/integrity-report" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><IntegrityReportPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/admin/activity-log" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><ActivityLogPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><RouteErrorBoundary><FeedbackPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/virtual-patient/:caseId" element={<ProtectedRoute><RouteErrorBoundary><VirtualPatientPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/structured-case/:caseId/edit" element={<ProtectedRoute requiredRole="admin"><RouteErrorBoundary><CasePreviewEditorPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/case-summary/:attemptId" element={<ProtectedRoute><RouteErrorBoundary><CaseSummaryPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/review/flashcards" element={<ProtectedRoute><RouteErrorBoundary><FlashcardReviewPage /></RouteErrorBoundary></ProtectedRoute>} />
                
                <Route path="/formative" element={<ProtectedRoute><RouteErrorBoundary><FormativePage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/connect/discussions" element={<ProtectedRoute><RouteErrorBoundary><DiscussionsPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/connect/groups" element={<ProtectedRoute><RouteErrorBoundary><StudyGroupsPage /></RouteErrorBoundary></ProtectedRoute>} />
                
                <Route path="/student-settings" element={<ProtectedRoute><RouteErrorBoundary><StudentSettingsPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/customize-content" element={<ProtectedRoute><RouteErrorBoundary><CustomizeContentPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="*" element={<RouteErrorBoundary><NotFound /></RouteErrorBoundary>} />
              </Routes>
              </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AudioPlayerProvider>
          </ConnectProvider>
        </CoachProvider>
      </BadgeCelebrationProvider>
      </PresenceProvider>
      </ActiveYearProvider>
      </DisclaimerGate>
    </AuthProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};

export default App;
