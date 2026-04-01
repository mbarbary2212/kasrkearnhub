import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  HelpCircle, 
  MessageSquare, 
  MessagesSquare,
  Users,
  ChevronRight,
} from 'lucide-react';
import InquiryModal from '@/components/feedback/InquiryModal';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { MessagesCard } from '@/components/connect/MessagesCard';
import { MyQuestionsCard } from '@/components/connect/MyQuestionsCard';
import { DiscussionSection } from '@/components/discussion';
import { StudyGroupList, GroupDetailView } from '@/components/study-groups';

interface ModuleConnectTabProps {
  moduleId: string;
  moduleName: string;
  moduleCode?: string;
  yearId?: string;
}

export function ModuleConnectTab({ moduleId, moduleName, moduleCode, yearId }: ModuleConnectTabProps) {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showStudyGroups, setShowStudyGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  if (selectedGroupId) {
    return (
      <div className="space-y-4">
        <GroupDetailView 
          groupId={selectedGroupId} 
          onBack={() => setSelectedGroupId(null)} 
        />
      </div>
    );
  }

  if (showStudyGroups) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setShowStudyGroups(false)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Connect
        </button>
        <StudyGroupList 
          moduleId={moduleId} 
          onSelectGroup={(groupId) => setSelectedGroupId(groupId)} 
        />
      </div>
    );
  }

  if (showDiscussion) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setShowDiscussion(false)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Connect
        </button>
        <DiscussionSection moduleId={moduleId} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-4">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Connect</h2>
        <p className="text-muted-foreground text-sm">
          Get help and share feedback for {moduleName}
        </p>
      </div>

      <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {/* Messages Card - Announcements + Replies */}
        <MessagesCard moduleId={moduleId} yearId={yearId} />

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
            <CardDescription>
              Public forum for all students to discuss module topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-primary font-medium">
              Join Discussion <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </CardContent>
        </Card>

        {/* My Questions Card */}
        <MyQuestionsCard moduleId={moduleId} />

        {/* Study Groups Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 sm:col-span-2 lg:col-span-2"
          onClick={() => setShowStudyGroups(true)}
        >
          <CardHeader className="pb-2">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <CardTitle className="text-lg">Study Groups</CardTitle>
            <CardDescription>
              Create or join private study groups with selected classmates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-primary font-medium">
              Manage Groups <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <InquiryModal 
        isOpen={inquiryOpen} 
        onClose={() => setInquiryOpen(false)}
        moduleId={moduleId}
        moduleName={moduleName}
        moduleCode={moduleCode}
      />
      <FeedbackModal 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
        moduleId={moduleId}
        moduleName={moduleName}
        moduleCode={moduleCode}
      />
    </div>
  );
}
