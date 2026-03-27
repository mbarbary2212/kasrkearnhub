import { useEffect, useState } from 'react';
import { X, ArrowLeft, MessageCircle, HelpCircle, MessageSquare, MessagesSquare, Users, ChevronRight } from 'lucide-react';
import { useConnect, ConnectView } from '@/contexts/ConnectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MessagesCard } from '@/components/connect/MessagesCard';
import InquiryModal from '@/components/feedback/InquiryModal';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { DiscussionSection } from '@/components/discussion';
import { StudyGroupList, GroupDetailView } from '@/components/study-groups';

const menuItems: { id: ConnectView; label: string; description: string; icon: React.ElementType; iconBg: string }[] = [
  { id: 'messages', label: 'Messages', description: 'Announcements and admin replies', icon: MessageCircle, iconBg: 'bg-primary/10 text-primary' },
  { id: 'inquiry', label: 'Ask a Question', description: 'Submit questions about content or issues', icon: HelpCircle, iconBg: 'bg-primary/10 text-primary' },
  { id: 'feedback', label: 'Give Feedback', description: 'Share suggestions or report issues', icon: MessageSquare, iconBg: 'bg-accent/50 text-accent-foreground' },
  { id: 'discussions', label: 'Open Discussions', description: 'Public forum to discuss topics', icon: MessagesSquare, iconBg: 'bg-primary/10 text-primary' },
  { id: 'study-groups', label: 'Study Groups', description: 'Create or join private study groups', icon: Users, iconBg: 'bg-secondary text-secondary-foreground' },
];

export function ConnectModal() {
  const { isOpen, activeView, moduleId, moduleName, moduleCode, yearId, closeConnect, setView } = useConnect();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Lock body scroll when overlay is open (not for inquiry/feedback which have their own dialogs)
  useEffect(() => {
    const showOverlay = isOpen && activeView !== 'inquiry' && activeView !== 'feedback';
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

  // Reset group selection when closing or changing view
  useEffect(() => {
    if (!isOpen || activeView !== 'study-groups') {
      setSelectedGroupId(null);
    }
  }, [isOpen, activeView]);

  // Open inquiry/feedback as their own dialogs
  useEffect(() => {
    if (isOpen && activeView === 'inquiry') {
      setInquiryOpen(true);
    }
    if (isOpen && activeView === 'feedback') {
      setFeedbackOpen(true);
    }
  }, [isOpen, activeView]);

  const handleInquiryClose = () => {
    setInquiryOpen(false);
    setView('menu');
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    setView('menu');
  };

  const handleMenuItemClick = (id: ConnectView) => {
    if (id === 'inquiry') {
      setInquiryOpen(true);
      setView('inquiry');
      return;
    }
    if (id === 'feedback') {
      setFeedbackOpen(true);
      setView('feedback');
      return;
    }
    setView(id);
  };

  // Show the overlay panel for menu, messages, discussions, study-groups
  const showOverlay = isOpen && activeView !== 'inquiry' && activeView !== 'feedback';
  const viewTitle = activeView === 'menu' ? 'Connect' : menuItems.find(m => m.id === activeView)?.label || 'Connect';
  const showBackButton = activeView !== 'menu';

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

      {!showOverlay && null}

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
                <div className="flex items-center gap-3">
                  {showBackButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (selectedGroupId) {
                          setSelectedGroupId(null);
                        } else {
                          setView('menu');
                        }
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedGroupId ? 'Study Group' : viewTitle}</h2>
                    {activeView === 'menu' && (
                      <p className="text-xs text-muted-foreground">Get help, share feedback, and connect with peers</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeConnect}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeView === 'menu' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                          onClick={() => handleMenuItemClick(item.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", item.iconBg)}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <CardTitle className="text-base">{item.label}</CardTitle>
                            <CardDescription className="text-xs">{item.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center text-sm text-primary font-medium">
                              Open <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

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
