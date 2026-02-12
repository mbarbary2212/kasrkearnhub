import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppMindMapSetting } from '@/hooks/useStudyResources';

const fallbackMarkdown = `
# KALM Hub

## 🏠 Home
- Year Selection (Years 1–5)
- Welcome & Unread Messages
- App Mind Map

## 📚 Year Page
- Module Cards (filtered by year)
- Module search

## 📖 Module Page
- **Learning** – Lectures, Resources, Videos
- **Connect** – Discussion Threads, Study Groups
- **Formative Assessment** – MCQs, True/False, OSCE, Matching, Essays, Case Scenarios
- **Study Coach** – AI-powered study guidance
- Chapters / Topics navigation

## 📝 Chapter / Topic Page
- **Resources** – Lecture notes, Audio, PDFs, Visual Summaries, Flashcards, Guided Explanations, Clinical Cases, Worked Cases
- **Practice** – MCQs, True/False, OSCE, Matching, Essays, Case Scenarios
- **Test Yourself** – Mock Exams (MCQ & OSCE), Hard Mode
- Discussion section

## 🎓 Study Coach
- Dashboard with progress insights
- Study Plan Wizard
- Weekly schedule & timeline
- Needs Practice recommendations
- AI Coach chat

## 👤 Account
- Profile & Avatar
- Achievements & Badges
- Preferences (theme, preferred year, auto-login)

## 🛡️ Admin Panel
- **System** – Accounts, Departments, Curriculum, Announcements, Help Templates
- **Content** – MCQs, OSCE, True/False, Matching, Essays, Flashcards, Visual Summaries, Videos, Clinical Cases, PDFs
- **AI Factory** – Batch generation, AI settings
- **Messaging** – Inbox, Feedback, Inquiries
- **Analytics** – User analytics, Question analytics, Activity logs
`;

interface AppMindMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppMindMap({ open, onOpenChange }: AppMindMapProps) {
  const { isAdmin, role } = useAuthContext();
  const audience = isAdmin ? 'admin' : 'student';
  const { data: setting, isLoading } = useAppMindMapSetting(audience);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [htmlSrcdoc, setHtmlSrcdoc] = useState<string | null>(null);

  const isFileMode = setting?.format === 'file' && setting?.fileUrl;
  const isHtmlFile = isFileMode && setting?.fileType === 'html';
  const isImageFile = isFileMode && ['png', 'svg'].includes(setting?.fileType);
  const isPdfFile = isFileMode && setting?.fileType === 'pdf';

  const markdownText = setting?.format === 'markdown' && setting?.markdown_text
    ? setting.markdown_text
    : !setting ? fallbackMarkdown : null;

  // For HTML files, fetch content to handle wrong content-type from storage
  useEffect(() => {
    if (!isHtmlFile || !setting?.fileUrl) return;
    setHtmlSrcdoc(null);
    setIframeLoading(true);
    fetch(setting.fileUrl)
      .then(res => {
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('text/html')) {
          return res.text().then(html => setHtmlSrcdoc(html));
        }
      })
      .catch(() => {})
      .finally(() => setIframeLoading(false));
  }, [isHtmlFile, setting?.fileUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={
        isHtmlFile
          ? 'max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0'
          : 'max-w-2xl max-h-[85vh] flex flex-col'
      }>
        {!isHtmlFile && (
          <DialogHeader>
            <DialogTitle className="text-xl font-heading">App Structure</DialogTitle>
            <DialogDescription>Overview of KALM Hub features and navigation</DialogDescription>
          </DialogHeader>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isHtmlFile ? (
          <div className="flex-1 relative">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              {...(htmlSrcdoc ? { srcDoc: htmlSrcdoc } : { src: setting.fileUrl })}
              className="w-full h-full border-0 rounded-b-lg"
              sandbox="allow-scripts"
              onLoad={() => setIframeLoading(false)}
              title="App Mind Map"
            />
          </div>
        ) : isImageFile ? (
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <img
              src={setting.fileUrl}
              alt="App Structure"
              className="w-full h-auto rounded-md"
            />
          </ScrollArea>
        ) : isPdfFile ? (
          <div className="flex-1 min-h-0">
            <iframe
              src={setting.fileUrl}
              className="w-full h-full border-0"
              title="App Structure PDF"
            />
          </div>
        ) : markdownText ? (
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none
              [&_h1]:text-2xl [&_h1]:font-heading [&_h1]:text-primary [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-border
              [&_h2]:text-lg [&_h2]:font-heading [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-2
              [&_ul]:space-y-1 [&_ul]:text-muted-foreground
              [&_li]:text-sm
              [&_strong]:text-foreground
            ">
              <ReactMarkdown>{markdownText}</ReactMarkdown>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
