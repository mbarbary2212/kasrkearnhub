import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
