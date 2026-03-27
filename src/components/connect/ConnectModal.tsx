import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useConnect } from '@/contexts/ConnectContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessagesPanel } from '@/components/connect/MessagesPanel';
import InquiryModal from '@/components/feedback/InquiryModal';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { DiscussionSection } from '@/components/discussion';
import { StudyGroupList, GroupDetailView } from '@/components/study-groups';

const viewTitles: Record<string, string> = {
  messages: 'Messages',
  inquiry: 'Ask a Question',
  feedback: 'Give Feedback',
  discussions: 'Open Discussions',
  'study-groups': 'Study Groups',
};

export function ConnectModal() {
  const { isOpen, activeView, moduleId, moduleName, moduleCode, yearId, closeConnect } = useConnect();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Lock body scroll when overlay is open
  useEffect(() => {
    const showOverlay = isOpen && activeView !== 'menu' && activeView !== 'inquiry' && activeView !== 'feedback';
    if (showOverlay) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, activeView]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConnect();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeConnect]);

  // Reset group selection when closing
  useEffect(() => {
    if (!isOpen || activeView !== 'study-groups') {
      setSelectedGroupId(null);
    }
  }, [isOpen, activeView]);

  // Open inquiry/feedback as their own dialogs
  useEffect(() => {
    if (isOpen && activeView === 'inquiry') setInquiryOpen(true);
    if (isOpen && activeView === 'feedback') setFeedbackOpen(true);
  }, [isOpen, activeView]);

  const handleInquiryClose = () => {
    setInquiryOpen(false);
    closeConnect();
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    closeConnect();
  };

  // Only show the overlay panel for messages, discussions, study-groups
  const showOverlay = isOpen && activeView !== 'menu' && activeView !== 'inquiry' && activeView !== 'feedback';
  const viewTitle = viewTitles[activeView] || 'Connect';

  return (
    <>
      {/* Inquiry & Feedback use their own Dialog components */}
      <InquiryModal
        isOpen={inquiryOpen}
        onClose={handleInquiryClose}
        moduleId={moduleId}
        moduleName={moduleName}
        moduleCode={moduleCode}
      />
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={(v) => { if (!v) handleFeedbackClose(); }}
        moduleId={moduleId}
        moduleName={moduleName}
        moduleCode={moduleCode}
      />

      {showOverlay && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeConnect}
          />

          {/* Modal Panel */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
            <div
              className={cn(
                "pointer-events-auto w-full max-w-2xl max-h-[85vh] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden",
                "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedGroupId ? 'Study Group' : viewTitle}
                </h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeConnect}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeView === 'messages' && (
                  <MessagesCard moduleId={moduleId || ''} yearId={yearId} />
                )}

                {activeView === 'discussions' && (
                  <DiscussionSection moduleId={moduleId} />
                )}

                {activeView === 'study-groups' && (
                  selectedGroupId ? (
                    <GroupDetailView groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />
                  ) : (
                    <StudyGroupList
                      moduleId={moduleId}
                      onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
