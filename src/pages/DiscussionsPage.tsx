import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { DiscussionSection } from '@/components/discussion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ContextGuide } from '@/components/guidance/ContextGuide';

export default function DiscussionsPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Open Discussions</h1>
        </div>
        <ContextGuide
          title="Get help when needed"
          description="Ask questions or contact your module lead if you're stuck."
          storageKey="kalm_guide_connect_dismissed"
        />
        <DiscussionSection />
      </div>
    </MainLayout>
  );
}
