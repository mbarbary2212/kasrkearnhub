import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  MessageSquare, 
  MessagesSquare,
  ChevronRight,
} from 'lucide-react';
import InquiryModal from '@/components/feedback/InquiryModal';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';

interface ModuleConnectTabProps {
  moduleId: string;
  moduleName: string;
}

export function ModuleConnectTab({ moduleId, moduleName }: ModuleConnectTabProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Announcements Banner */}
      <AnnouncementBanner moduleId={moduleId} className="mb-4" />

      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Connect</h2>
        <p className="text-muted-foreground text-sm">
          Get help and share feedback for {moduleName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Questions Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => setInquiryOpen(true)}
        >
          <CardHeader className="pb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Ask a Question</CardTitle>
            <CardDescription>
              Submit questions about module content or technical issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-primary font-medium">
              Submit Question <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Feedback Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => setFeedbackOpen(true)}
        >
          <CardHeader className="pb-2">
            <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-2">
              <MessageSquare className="w-6 h-6 text-accent-foreground" />
            </div>
            <CardTitle className="text-lg">Give Feedback</CardTitle>
            <CardDescription>
              Share suggestions, report issues, or provide general feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-primary font-medium">
              Submit Feedback <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* Discussion Card (Coming Soon) */}
        <Card className="opacity-60 cursor-not-allowed sm:col-span-2">
          <CardHeader className="pb-2">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2">
              <MessagesSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg text-muted-foreground">Discussion Forum</CardTitle>
            <CardDescription>
              Connect with peers and discuss module topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground font-medium">
              Coming Soon
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <InquiryModal 
        isOpen={inquiryOpen} 
        onClose={() => setInquiryOpen(false)}
        moduleId={moduleId}
      />
      <FeedbackModal 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
        moduleId={moduleId}
        moduleName={moduleName}
      />
    </div>
  );
}
