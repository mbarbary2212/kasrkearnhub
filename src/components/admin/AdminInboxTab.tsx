import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAllFeedback, useUpdateFeedback, FeedbackStatus, ItemFeedback } from '@/hooks/useItemFeedback';
import { useAllInquiries, useUpdateInquiry, InquiryStatus, Inquiry } from '@/hooks/useInquiries';
import { useUserManagedModules } from '@/hooks/useModuleAdmin';
import { AdminReplyDialog } from '@/components/feedback/AdminReplyDialog';
import { getInquiryCategoryLabel } from '@/lib/feedbackValidation';
import { MessageSquare, Mail, Flag, Star, AlertTriangle, User, Eye, EyeOff, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { YearGroupedModuleOptions } from '@/components/admin/YearGroupedModuleOptions';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function AdminInboxTab() {
  const { isSuperAdmin, isPlatformAdmin, isAdmin, isTopicAdmin, isDepartmentAdmin, isModuleAdmin, moduleAdminModuleIds, topicAssignments } = useAuthContext();
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<ItemFeedback | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [revealedFeedbackIds, setRevealedFeedbackIds] = useState<Set<string>>(new Set());
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyThread, setReplyThread] = useState<{ type: 'feedback' | 'inquiry'; id: string; subject?: string; message: string } | null>(null);
  const { data: modules, isLoading: modulesLoading } = useUserManagedModules();

  const feedbackFilters = useMemo(() => {
    const filters: {
      moduleId?: string;
      moduleIds?: string[];
      chapterIds?: string[];
      status?: FeedbackStatus;
    } = {};

    if (selectedStatus !== 'all') {
      filters.status = selectedStatus as FeedbackStatus;
    }

    if (isSuperAdmin || isPlatformAdmin) {
      if (selectedModule !== 'all') {
        filters.moduleId = selectedModule;
      }
    } else if (isModuleAdmin) {
      if (selectedModule !== 'all') {
        filters.moduleId = selectedModule;
      } else if (moduleAdminModuleIds.length > 0) {
        filters.moduleIds = moduleAdminModuleIds;
      }
    } else if (isDepartmentAdmin) {
      const moduleIds = modules?.map((m: { id: string }) => m.id) || [];
      if (selectedModule !== 'all') {
        filters.moduleId = selectedModule;
      } else if (moduleIds.length > 0) {
        filters.moduleIds = moduleIds;
      }
    } else if (isTopicAdmin) {
      const chapterIds = topicAssignments
        .filter(a => a.chapter_id)
        .map(a => a.chapter_id as string);
      if (chapterIds.length > 0) {
        filters.chapterIds = chapterIds;
      }
    }

    return filters;
  }, [selectedModule, selectedStatus, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin, modules, topicAssignments]);

  const inquiryFilters = useMemo(() => {
    const filters: {
      moduleId?: string;
      moduleIds?: string[];
      chapterIds?: string[];
      status?: InquiryStatus;
    } = {};

    if (selectedStatus !== 'all') {
      filters.status = selectedStatus as InquiryStatus;
    }

    if (isSuperAdmin || isPlatformAdmin) {
      if (selectedModule !== 'all') {
        filters.moduleId = selectedModule;
      }
    } else if (isModuleAdmin) {
      if (selectedModule !== 'all') {
        filters.moduleId = selectedModule;
      } else if (moduleAdminModuleIds.length > 0) {
        filters.moduleIds = moduleAdminModuleIds;
      }
    } else if (isDepartmentAdmin) {
      const moduleIds = modules?.map((m: { id: string }) => m.id) || [];
      if (selectedModule !== 'all') {
        filters.moduleId = selectedModule;
      } else if (moduleIds.length > 0) {
        filters.moduleIds = moduleIds;
      }
    } else if (isTopicAdmin) {
      const chapterIds = topicAssignments
        .filter(a => a.chapter_id)
        .map(a => a.chapter_id as string);
      if (chapterIds.length > 0) {
        filters.chapterIds = chapterIds;
      }
    }

    return filters;
  }, [selectedModule, selectedStatus, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin, modules, topicAssignments]);

  const { data: feedbackList, isLoading: feedbackLoading } = useAllFeedback(feedbackFilters, { includeUserProfiles: isSuperAdmin });
  const { data: inquiryList, isLoading: inquiriesLoading } = useAllInquiries(inquiryFilters);

  const updateFeedback = useUpdateFeedback();
  const updateInquiry = useUpdateInquiry();

  const handleUpdateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try {
      await updateFeedback.mutateAsync({ id, status });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleToggleFlagged = async (id: string, isFlagged: boolean) => {
    try {
      await updateFeedback.mutateAsync({ id, is_flagged: !isFlagged });
      toast.success(isFlagged ? 'Unflagged' : 'Flagged');
    } catch (error) {
      toast.error('Failed to update flag');
    }
  };

  const handleSaveFeedbackNotes = async () => {
    if (!selectedFeedback) return;
    try {
      await updateFeedback.mutateAsync({ id: selectedFeedback.id, admin_notes: adminNotes });
      toast.success('Notes saved');
      setSelectedFeedback(null);
    } catch (error) {
      toast.error('Failed to save notes');
    }
  };

  const handleUpdateInquiryStatus = async (id: string, status: InquiryStatus) => {
    try {
      await updateInquiry.mutateAsync({ id, status });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveInquiryNotes = async () => {
    if (!selectedInquiry) return;
    try {
      await updateInquiry.mutateAsync({ id: selectedInquiry.id, admin_notes: adminNotes });
      toast.success('Notes saved');
      setSelectedInquiry(null);
    } catch (error) {
      toast.error('Failed to save notes');
    }
  };

  const handleOpenReply = (type: 'feedback' | 'inquiry', id: string, message: string, subject?: string) => {
    setReplyThread({ type, id, message, subject });
    setReplyDialogOpen(true);
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  };

  const showModuleFilter = isSuperAdmin || isPlatformAdmin || (isDepartmentAdmin && modules && modules.length > 1);

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-4 flex-wrap">
          {showModuleFilter && (
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <YearGroupedModuleOptions modules={modules} showSlug={false} />
              </SelectContent>
            </Select>
          )}

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="feedback" className="w-full">
          <TabsList>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback ({feedbackList?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Inquiries ({inquiryList?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="mt-4">
            {feedbackLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : feedbackList && feedbackList.length > 0 ? (
              <div className="space-y-3">
                {feedbackList.map((feedback) => {
                  const isRevealed = revealedFeedbackIds.has(feedback.id);
                  const showUserInfo = !feedback.is_anonymous || isRevealed;

                  return (
                    <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{feedback.item_type}</Badge>
                              <Badge className={STATUS_COLORS[feedback.status]}>{feedback.status}</Badge>
                              {feedback.is_flagged && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <Flag className="w-3 h-3" /> Flagged
                                </Badge>
                              )}
                              {feedback.is_anonymous && !isRevealed && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <EyeOff className="w-3 h-3" /> Anonymous
                                </Badge>
                              )}
                              {renderRating(feedback.rating)}
                            </div>
                            <p className="mt-2 text-sm">{feedback.message}</p>

                            <div className="flex items-center gap-2 mt-2 text-xs">
                              {showUserInfo && feedback.user_profile ? (
                                <>
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-foreground font-medium">
                                    {feedback.user_profile.full_name || feedback.user_profile.email}
                                    {feedback.user_profile.full_name && (
                                      <span className="text-muted-foreground ml-1">({feedback.user_profile.email})</span>
                                    )}
                                  </span>
                                  {isRevealed && <Badge variant="outline" className="text-xs">Revealed</Badge>}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Anonymous</span>
                              )}
                              <span className="text-muted-foreground">• {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReply('feedback', feedback.id, feedback.message)}
                            >
                              <Reply className="w-4 h-4 mr-1" />
                              Reply
                            </Button>
                            {isSuperAdmin && feedback.is_anonymous && !isRevealed && feedback.user_profile && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                title="Reveal user identity"
                                onClick={() => {
                                  if (confirm('Are you sure you want to reveal the identity of this anonymous user? This action should only be taken for serious issues like offensive content.')) {
                                    setRevealedFeedbackIds(prev => new Set([...prev, feedback.id]));
                                    toast.success('Identity revealed');
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Select
                              value={feedback.status}
                              onValueChange={(v) => handleUpdateFeedbackStatus(feedback.id, v as FeedbackStatus)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_review">In Review</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            {isSuperAdmin && (
                              <Button
                                variant={feedback.is_flagged ? 'destructive' : 'outline'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleFlagged(feedback.id, feedback.is_flagged)}
                              >
                                <Flag className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedFeedback(feedback);
                                setAdminNotes(feedback.admin_notes || '');
                              }}
                            >
                              Notes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No feedback found.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inquiries" className="mt-4">
            {inquiriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : inquiryList && inquiryList.length > 0 ? (
              <div className="space-y-3">
                {inquiryList.map((inquiry) => (
                  <Card key={inquiry.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{getInquiryCategoryLabel(inquiry.category)}</Badge>
                            <Badge className={STATUS_COLORS[inquiry.status]}>{inquiry.status}</Badge>
                          </div>
                          <h3 className="font-medium mt-2">{inquiry.subject}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{inquiry.message}</p>

                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <User className="w-3 h-3 text-muted-foreground" />
                            {inquiry.user_profile ? (
                              <span className="text-foreground font-medium">
                                {inquiry.user_profile.full_name || inquiry.user_profile.email}
                                {inquiry.user_profile.full_name && (
                                  <span className="text-muted-foreground ml-1">({inquiry.user_profile.email})</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">User info unavailable</span>
                            )}
                            <span className="text-muted-foreground">• {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReply('inquiry', inquiry.id, inquiry.message, inquiry.subject)}
                          >
                            <Reply className="w-4 h-4 mr-1" />
                            Reply
                          </Button>
                          <Select
                            value={inquiry.status}
                            onValueChange={(v) => handleUpdateInquiryStatus(inquiry.id, v as InquiryStatus)}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_review">In Review</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInquiry(inquiry);
                              setAdminNotes(inquiry.admin_notes || '');
                            }}
                          >
                            Notes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No inquiries found.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Feedback Notes Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about this feedback..."
            rows={4}
          />
          <Button onClick={handleSaveFeedbackNotes}>Save Notes</Button>
        </DialogContent>
      </Dialog>

      {/* Inquiry Notes Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about this inquiry..."
            rows={4}
          />
          <Button onClick={handleSaveInquiryNotes}>Save Notes</Button>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      {replyThread && (
        <AdminReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          threadType={replyThread.type}
          threadId={replyThread.id}
          threadSubject={replyThread.subject}
          threadMessage={replyThread.message}
        />
      )}
    </>
  );
}