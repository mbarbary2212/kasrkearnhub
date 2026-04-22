import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, MessageSquare, MessagesSquare, Users, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import InquiryModal from '@/components/feedback/InquiryModal';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { MessagesCard } from '@/components/connect/MessagesCard';
import { MyQuestionsCard } from '@/components/connect/MyQuestionsCard';
import { DiscussionSection } from '@/components/discussion';
import { StudyGroupList, GroupDetailView } from '@/components/study-groups';
import { Badge } from '@/components/ui/badge';
import { useConnectBadges } from '@/hooks/useConnectBadges';

export default function ConnectPage() {
  const [searchParams] = useSearchParams();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showStudyGroups, setShowStudyGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const badges = useConnectBadges();

  // Handle ?view= query param from sidebar navigation
  useEffect(() => {
    const view = searchParams.get('view');
    if (!view) return;
    switch (view) {
      case 'inquiry': setInquiryOpen(true); break;
      case 'feedback': setFeedbackOpen(true); break;
      case 'discussions': setShowDiscussion(true); break;
      case 'study-groups': setShowStudyGroups(true); break;
      // 'messages' is the default view, no action needed
    }
  }, [searchParams]);

  if (selectedGroupId) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <GroupDetailView groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />
        </div>
      </MainLayout>
    );
  }

  if (showStudyGroups) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <button
            onClick={() => setShowStudyGroups(false)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Back to Connect
          </button>
          <StudyGroupList onSelectGroup={(groupId) => setSelectedGroupId(groupId)} />
        </div>
      </MainLayout>
    );
  }

  if (showDiscussion) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <button
            onClick={() => setShowDiscussion(false)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Back to Connect
          </button>
          <DiscussionSection />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-xl font-heading font-semibold mb-2">Connect</h1>
          <p className="text-muted-foreground text-sm">
            Get help, share feedback, and connect with your peers
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Messages Card */}
          <MessagesCard moduleId="" />

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
              <CardDescription>Submit questions about content or technical issues</CardDescription>
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
              <CardDescription>Share suggestions, report issues, or provide general feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary font-medium">
                Submit Feedback <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          {/* Discussion Forum Card */}
          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            onClick={() => setShowDiscussion(true)}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <MessagesSquare className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Open Discussions</CardTitle>
              <CardDescription>Public forum for all students to discuss topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary font-medium">
                Join Discussion <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          {/* My Questions Card */}
          <MyQuestionsCard />

          {/* Study Groups Card */}
          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 sm:col-span-2"
            onClick={() => setShowStudyGroups(true)}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-secondary-foreground" />
              </div>
              <CardTitle className="text-lg">Study Groups</CardTitle>
              <CardDescription>Create or join private study groups with selected classmates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary font-medium">
                Manage Groups <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
        <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      </div>
    </MainLayout>
  );
}
