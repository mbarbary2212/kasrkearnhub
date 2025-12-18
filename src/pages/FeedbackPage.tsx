import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ShieldCheck, Send } from 'lucide-react';
import FeedbackModal from '@/components/feedback/FeedbackModal';

export default function FeedbackPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-heading font-bold mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to submit feedback.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-bold">Feedback Portal</h1>
            <p className="text-muted-foreground">Share your thoughts to help improve KasrLearn</p>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">Your Privacy is Protected</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Your feedback is completely anonymous by default</li>
                  <li>• No individual responses are visible to faculty or admins</li>
                  <li>• Only extreme safety concerns may require identity disclosure</li>
                  <li>• You can submit up to 5 feedback entries per day</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Anonymous Feedback</CardTitle>
            <CardDescription>
              Report bugs, suggest improvements, or share concerns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your feedback helps us improve the learning experience for everyone. 
              You can report technical issues, content errors, make suggestions, 
              or raise any concerns you may have.
            </p>
            
            <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
              <Send className="w-4 h-4 mr-2" />
              Submit New Feedback
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What You Can Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Technical Issues</h4>
                <p className="text-sm text-muted-foreground">
                  Videos not playing, pages not loading, broken links, or app crashes
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Content Errors</h4>
                <p className="text-sm text-muted-foreground">
                  Incorrect information, typos, missing content, or outdated materials
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Suggestions</h4>
                <p className="text-sm text-muted-foreground">
                  Ideas for new features, improvements, or better ways of learning
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Concerns</h4>
                <p className="text-sm text-muted-foreground">
                  Academic integrity issues, safety concerns, or any serious matters
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <FeedbackModal open={showModal} onOpenChange={setShowModal} />
    </MainLayout>
  );
}
