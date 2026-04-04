import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { ContextGuide } from '@/components/guidance/ContextGuide';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAllFeedback, useUpdateFeedback, FeedbackStatus, ItemFeedback } from '@/hooks/useItemFeedback';
import { useAllInquiries, useUpdateInquiry, useAssignInquiry, useMarkInquirySeen, InquiryStatus, Inquiry, AssignedTeam } from '@/hooks/useInquiries';
import { useUserManagedModules } from '@/hooks/useModuleAdmin';
import { useThreadReplies, useSubmitReply } from '@/hooks/useAdminReplies';
import { AdminReplyDialog } from '@/components/feedback/AdminReplyDialog';
import { getInquiryCategoryLabel, INQUIRY_CATEGORY_DISPLAY } from '@/lib/feedbackValidation';
import { buildContentLink } from '@/lib/contentNavigation';
import {
  MessageSquare, Mail, Flag, Star, AlertTriangle, User, Eye, EyeOff, Reply,
  MoreHorizontal, Clock, CheckCircle, Search, Send, Loader2, Circle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { YearGroupedModuleOptions } from '@/components/admin/YearGroupedModuleOptions';
import { cn } from '@/lib/utils';

// ─── Priority types ───
type UrgencyLevel = 'overdue' | 'attention' | 'new' | 'in_progress' | 'in_review' | 'resolved' | 'none';

function getUrgency(inquiry: Inquiry): UrgencyLevel {
  if (inquiry.status === 'resolved' || inquiry.status === 'closed') return 'resolved';
  if (inquiry.status === 'in_review') return 'in_review';
  if (inquiry.status === 'open' && inquiry.reply_count > 0) return 'in_progress';

  const ageHours = differenceInHours(new Date(), new Date(inquiry.created_at));
  if (ageHours > 48) return 'overdue';
  if (ageHours > 24) return 'attention';
  return 'new';
}

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; className: string }> = {
  overdue:     { label: 'Overdue',     className: 'bg-destructive/15 text-destructive border-destructive/30' },
  attention:   { label: 'Attention',   className: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400' },
  new:         { label: 'New',         className: 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary border-primary/30' },
  in_review:   { label: 'In Review',   className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' },
  resolved:    { label: 'Resolved',    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
  none:        { label: '',            className: '' },
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

type SortOption = 'unanswered_first' | 'newest' | 'oldest' | 'most_urgent';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'unanswered_first', label: 'Unanswered first' },
  { value: 'most_urgent', label: 'Most urgent' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const CATEGORY_OPTIONS = Object.entries(INQUIRY_CATEGORY_DISPLAY)
  .filter(([key]) => !['content', 'general', 'account', 'content_question', 'general_question', 'technical_issue'].includes(key))
  .map(([value, label]) => ({ value, label }));

const URGENCY_FILTER_OPTIONS = [
  { value: 'all', label: 'All urgency' },
  { value: 'overdue', label: 'Overdue (>48h)' },
  { value: 'attention', label: 'Attention (>24h)' },
  { value: 'new', label: 'New (<24h)' },
];

function getAgeBadgeStyle(ageHours: number): string {
  if (ageHours > 48) return 'text-destructive';
  if (ageHours > 24) return 'text-orange-500';
  return 'text-muted-foreground';
}

// ─── Sort logic ───
const URGENCY_SORT_ORDER: Record<UrgencyLevel, number> = {
  overdue: 0, attention: 1, new: 2, in_progress: 3, in_review: 4, resolved: 5, none: 6,
};

function sortInquiries(list: Inquiry[], sort: SortOption): Inquiry[] {
  const sorted = [...list];
  switch (sort) {
    case 'unanswered_first':
      return sorted.sort((a, b) => {
        // Open first, then in_review, then resolved/closed
        const statusOrder: Record<string, number> = { open: 0, in_review: 1, resolved: 2, closed: 3 };
        const sa = statusOrder[a.status] ?? 4;
        const sb = statusOrder[b.status] ?? 4;
        if (sa !== sb) return sa - sb;
        // Within same status, oldest first
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    case 'most_urgent':
      return sorted.sort((a, b) => {
        const ua = URGENCY_SORT_ORDER[getUrgency(a)];
        const ub = URGENCY_SORT_ORDER[getUrgency(b)];
        if (ua !== ub) return ua - ub;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    default:
      return sorted;
  }
}

export default function AdminInboxPage() {
  const { isSuperAdmin, isPlatformAdmin, isAdmin, isTopicAdmin, isDepartmentAdmin, topicAssignments } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─── State from URL params with defaults ───
  const [selectedModule, setSelectedModule] = useState<string>(searchParams.get('module') || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'open');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>(searchParams.get('urgency') || 'all');
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'unanswered_first');
  const [unansweredOnly, setUnansweredOnly] = useState(searchParams.get('unanswered') === 'true');

  // Detail sheet
  const [sheetInquiry, setSheetInquiry] = useState<Inquiry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Feedback tab state (kept simpler)
  const [selectedFeedback, setSelectedFeedback] = useState<ItemFeedback | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [revealedFeedbackIds, setRevealedFeedbackIds] = useState<Set<string>>(new Set());
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyThread, setReplyThread] = useState<{ type: 'feedback' | 'inquiry'; id: string; subject?: string; message: string } | null>(null);

  const { data: modules, isLoading: modulesLoading } = useUserManagedModules();

  // ─── Sync filters to URL ───
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedStatus !== 'open') params.set('status', selectedStatus);
    if (selectedModule !== 'all') params.set('module', selectedModule);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedUrgency !== 'all') params.set('urgency', selectedUrgency);
    if (sortBy !== 'unanswered_first') params.set('sort', sortBy);
    if (unansweredOnly) params.set('unanswered', 'true');
    setSearchParams(params, { replace: true });
  }, [selectedStatus, selectedModule, selectedCategory, selectedUrgency, sortBy, unansweredOnly, setSearchParams]);

  // ─── Role-based filter computation ───
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
      if (selectedModule !== 'all') filters.moduleId = selectedModule;
    } else if (isDepartmentAdmin) {
      const moduleIds = modules?.map((m: { id: string }) => m.id) || [];
      if (selectedModule !== 'all') filters.moduleId = selectedModule;
      else if (moduleIds.length > 0) filters.moduleIds = moduleIds;
    } else if (isTopicAdmin) {
      const chapterIds = topicAssignments.filter(a => a.chapter_id).map(a => a.chapter_id as string);
      if (chapterIds.length > 0) filters.chapterIds = chapterIds;
    }

    return filters;
  }, [selectedModule, selectedStatus, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin, modules, topicAssignments]);

  const feedbackFilters = useMemo(() => {
    const filters: { moduleId?: string; moduleIds?: string[]; chapterIds?: string[]; status?: FeedbackStatus } = {};
    if (selectedStatus !== 'all') filters.status = selectedStatus as FeedbackStatus;
    if (isSuperAdmin || isPlatformAdmin) {
      if (selectedModule !== 'all') filters.moduleId = selectedModule;
    } else if (isDepartmentAdmin) {
      const moduleIds = modules?.map((m: { id: string }) => m.id) || [];
      if (selectedModule !== 'all') filters.moduleId = selectedModule;
      else if (moduleIds.length > 0) filters.moduleIds = moduleIds;
    } else if (isTopicAdmin) {
      const chapterIds = topicAssignments.filter(a => a.chapter_id).map(a => a.chapter_id as string);
      if (chapterIds.length > 0) filters.chapterIds = chapterIds;
    }
    return filters;
  }, [selectedModule, selectedStatus, isSuperAdmin, isPlatformAdmin, isDepartmentAdmin, isTopicAdmin, modules, topicAssignments]);

  const { data: feedbackList, isLoading: feedbackLoading } = useAllFeedback(feedbackFilters, { includeUserProfiles: isSuperAdmin });
  const { data: inquiryList, isLoading: inquiriesLoading } = useAllInquiries(inquiryFilters);

  const updateFeedback = useUpdateFeedback();
  const updateInquiry = useUpdateInquiry();
  const assignInquiry = useAssignInquiry();
  const markSeen = useMarkInquirySeen();

  // ─── Client-side filtering & sorting for inquiries ───
  const processedInquiries = useMemo(() => {
    if (!inquiryList) return [];
    let list = [...inquiryList];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(i => i.category === selectedCategory);
    }
    // Urgency filter
    if (selectedUrgency !== 'all') {
      list = list.filter(i => getUrgency(i) === selectedUrgency);
    }
    // Unanswered only
    if (unansweredOnly) {
      list = list.filter(i => i.reply_count === 0 && i.status === 'open');
    }

    return sortInquiries(list, sortBy);
  }, [inquiryList, selectedCategory, selectedUrgency, unansweredOnly, sortBy]);

  const canAccess = isSuperAdmin || isPlatformAdmin || isAdmin;

  if (!canAccess) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </MainLayout>
    );
  }

  const handleUpdateInquiryStatus = async (id: string, status: InquiryStatus) => {
    try {
      await updateInquiry.mutateAsync({ id, status });
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handleAssignTeam = async (id: string, team: AssignedTeam) => {
    try {
      await assignInquiry.mutateAsync({ id, assignedTeam: team });
      toast.success(`Assigned to ${team}`);
    } catch { toast.error('Failed to assign team'); }
  };

  const handleSaveInquiryNotes = async () => {
    if (!sheetInquiry) return;
    try {
      await updateInquiry.mutateAsync({ id: sheetInquiry.id, admin_notes: adminNotes });
      toast.success('Notes saved');
    } catch { toast.error('Failed to save notes'); }
  };

  const handleOpenSheet = (inquiry: Inquiry) => {
    setSheetInquiry(inquiry);
    setAdminNotes(inquiry.admin_notes || '');
    if (!inquiry.seen_by_admin) {
      markSeen.mutate(inquiry.id);
    }
  };

  // Feedback handlers (kept from original)
  const handleUpdateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try { await updateFeedback.mutateAsync({ id, status }); toast.success('Status updated'); }
    catch { toast.error('Failed to update status'); }
  };
  const handleToggleFlagged = async (id: string, isFlagged: boolean) => {
    try { await updateFeedback.mutateAsync({ id, is_flagged: !isFlagged }); toast.success(isFlagged ? 'Unflagged' : 'Flagged'); }
    catch { toast.error('Failed to update flag'); }
  };
  const handleSaveFeedbackNotes = async () => {
    if (!selectedFeedback) return;
    try { await updateFeedback.mutateAsync({ id: selectedFeedback.id, admin_notes: feedbackNotes }); toast.success('Notes saved'); setSelectedFeedback(null); }
    catch { toast.error('Failed to save notes'); }
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
          <Star key={star} className={`w-3 h-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        ))}
      </div>
    );
  };

  const showModuleFilter = isSuperAdmin || isPlatformAdmin || (isDepartmentAdmin && modules && modules.length > 1);

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <ContextGuide
          title="Student support"
          description="Student questions will appear here. Respond promptly."
          storageKey="kalm_guide_admin_inbox_dismissed"
        />
        <div>
          <h1 className="text-2xl font-heading font-semibold">Admin Inbox</h1>
          <p className="text-sm text-muted-foreground">Triage and respond to student questions and feedback</p>
        </div>

        {/* ─── Filters ─── */}
        <div className="flex gap-3 flex-wrap items-center">
          {showModuleFilter && (
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <YearGroupedModuleOptions modules={modules} showSlug={false} />
              </SelectContent>
            </Select>
          )}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Urgency" /></SelectTrigger>
            <SelectContent>
              {URGENCY_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="unanswered-only" checked={unansweredOnly} onCheckedChange={setUnansweredOnly} />
            <Label htmlFor="unanswered-only" className="text-xs text-muted-foreground cursor-pointer">Unanswered only</Label>
          </div>
        </div>

        <Tabs defaultValue="inquiries" className="w-full">
          <TabsList>
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Questions ({processedInquiries.length})
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback ({feedbackList?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ INQUIRIES TAB ═══════════════ */}
          <TabsContent value="inquiries" className="mt-4">
            {inquiriesLoading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}</div>
            ) : processedInquiries.length > 0 ? (
              <div className="space-y-2">
                {processedInquiries.map((inquiry) => {
                  const urgency = getUrgency(inquiry);
                  const ageHours = differenceInHours(new Date(), new Date(inquiry.created_at));
                  const unseen = !inquiry.seen_by_admin;

                  return (
                    <Card
                      key={inquiry.id}
                      className={cn(
                        "hover:shadow-md transition-shadow cursor-pointer",
                        unseen && "border-l-2 border-l-primary"
                      )}
                      onClick={() => handleOpenSheet(inquiry)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Row 1: Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              {unseen && <Circle className="w-2.5 h-2.5 fill-primary text-primary flex-shrink-0" />}
                              {urgency !== 'none' && urgency !== 'resolved' && (
                                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", URGENCY_CONFIG[urgency].className)}>
                                  {URGENCY_CONFIG[urgency].label}
                                </Badge>
                              )}
                              <Badge className={cn("text-[10px] h-5 px-1.5", STATUS_COLORS[inquiry.status])}>
                                {inquiry.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                {getInquiryCategoryLabel(inquiry.category)}
                              </Badge>
                              {inquiry.reply_count > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5">
                                  <Reply className="w-2.5 h-2.5" /> {inquiry.reply_count}
                                </Badge>
                              )}
                              {inquiry.assigned_team && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                  {inquiry.assigned_team}
                                </Badge>
                              )}
                            </div>

                            {/* Row 2: Subject + preview */}
                            <h3 className={cn("text-sm", unseen ? "font-semibold" : "font-medium")}>
                              {inquiry.subject}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{inquiry.message}</p>

                            {/* Row 3: Meta */}
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                              {inquiry.user_profile && (
                                <>
                                  <User className="w-3 h-3" />
                                  <span className="text-foreground/80">
                                    {inquiry.user_profile.full_name || inquiry.user_profile.email}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              <span className={getAgeBadgeStyle(ageHours)}>
                                {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {/* Quick actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleOpenSheet(inquiry)}>
                                <Reply className="w-4 h-4 mr-2" /> Reply
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateInquiryStatus(inquiry.id, 'in_review')}>
                                <Search className="w-4 h-4 mr-2" /> Mark as In Review
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateInquiryStatus(inquiry.id, 'resolved')}>
                                <CheckCircle className="w-4 h-4 mr-2" /> Mark as Resolved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAssignTeam(inquiry.id, 'platform')}>
                                Assign → Platform
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssignTeam(inquiry.id, 'module')}>
                                Assign → Module
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssignTeam(inquiry.id, 'chapter')}>
                                Assign → Chapter
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssignTeam(inquiry.id, 'teacher')}>
                                Assign → Teacher
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {selectedUrgency !== 'all'
                    ? `No ${URGENCY_FILTER_OPTIONS.find(o => o.value === selectedUrgency)?.label.toLowerCase()} questions found.`
                    : unansweredOnly
                    ? 'No unanswered questions — great job! 🎉'
                    : 'No inquiries found.'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════ FEEDBACK TAB (kept mostly original) ═══════════════ */}
          <TabsContent value="feedback" className="mt-4">
            {feedbackLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
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
                              {feedback.is_flagged && <Badge variant="destructive" className="flex items-center gap-1"><Flag className="w-3 h-3" /> Flagged</Badge>}
                              {feedback.is_anonymous && !isRevealed && <Badge variant="secondary" className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Anonymous</Badge>}
                              {renderRating(feedback.rating)}
                            </div>
                            <p className="mt-2 text-sm">{feedback.message}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              {showUserInfo && feedback.user_profile ? (
                                <>
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-foreground font-medium">{feedback.user_profile.full_name || feedback.user_profile.email}</span>
                                  {isRevealed && <Badge variant="outline" className="text-xs">Revealed</Badge>}
                                </>
                              ) : <span className="text-muted-foreground">Anonymous</span>}
                              <span className="text-muted-foreground">• {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Open Content deep link */}
                            {feedback.chapter_id && feedback.module_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = buildContentLink({
                                    moduleId: feedback.module_id!,
                                    chapterId: feedback.chapter_id,
                                    materialType: feedback.item_type as any,
                                    materialId: feedback.item_id || undefined,
                                    from: 'feedback',
                                  });
                                  window.open(link, '_blank');
                                }}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Open Content
                              </Button>
                            )}
                            {!feedback.chapter_id && feedback.module_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(`/module/${feedback.module_id}`, '_blank');
                                }}
                                title="Linked content not found — showing module"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Open Module
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleOpenReply('feedback', feedback.id, feedback.message)}><Reply className="w-4 h-4 mr-1" />Reply</Button>
                            {isSuperAdmin && feedback.is_anonymous && !isRevealed && feedback.user_profile && (
                              <Button variant="outline" size="icon" className="h-8 w-8" title="Reveal user identity" onClick={() => {
                                if (confirm('Are you sure you want to reveal the identity of this anonymous user?')) {
                                  setRevealedFeedbackIds(prev => new Set([...prev, feedback.id]));
                                }
                              }}><Eye className="w-4 h-4" /></Button>
                            )}
                            <Select value={feedback.status} onValueChange={(v) => handleUpdateFeedbackStatus(feedback.id, v as FeedbackStatus)}>
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_review">In Review</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            {isSuperAdmin && (
                              <Button variant={feedback.is_flagged ? 'destructive' : 'outline'} size="icon" className="h-8 w-8" onClick={() => handleToggleFlagged(feedback.id, feedback.is_flagged)}><Flag className="w-4 h-4" /></Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => { setSelectedFeedback(feedback); setFeedbackNotes(feedback.admin_notes || ''); }}>Notes</Button>
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
        </Tabs>
      </div>

      {/* ─── Inquiry Detail Sheet ─── */}
      <InquiryDetailSheet
        inquiry={sheetInquiry}
        onClose={() => setSheetInquiry(null)}
        adminNotes={adminNotes}
        onAdminNotesChange={setAdminNotes}
        onSaveNotes={handleSaveInquiryNotes}
        onStatusChange={handleUpdateInquiryStatus}
        onAssignTeam={handleAssignTeam}
      />

      {/* Feedback Notes Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admin Notes</DialogTitle></DialogHeader>
          <Textarea value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} placeholder="Add notes about this feedback..." rows={4} />
          <Button onClick={handleSaveFeedbackNotes}>Save Notes</Button>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog (for feedback tab) */}
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
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════
// Inquiry Detail Sheet
// ═══════════════════════════════════════════════

function InquiryDetailSheet({
  inquiry,
  onClose,
  adminNotes,
  onAdminNotesChange,
  onSaveNotes,
  onStatusChange,
  onAssignTeam,
}: {
  inquiry: Inquiry | null;
  onClose: () => void;
  adminNotes: string;
  onAdminNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onStatusChange: (id: string, status: InquiryStatus) => void;
  onAssignTeam: (id: string, team: AssignedTeam) => void;
}) {
  const [replyMessage, setReplyMessage] = useState('');
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const { data: replies = [], isLoading: repliesLoading } = useThreadReplies('inquiry', inquiry?.id);
  const submitReply = useSubmitReply();

  const urgency = inquiry ? getUrgency(inquiry) : 'none';
  const ageHours = inquiry ? differenceInHours(new Date(), new Date(inquiry.created_at)) : 0;

  // Scroll to latest reply when replies change
  useEffect(() => {
    if (replies.length > 0) {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies.length]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry || !replyMessage.trim()) return;

    try {
      await submitReply.mutateAsync({
        threadType: 'inquiry',
        threadId: inquiry.id,
        message: replyMessage.trim(),
      });
      setReplyMessage('');
      toast.success('Reply sent');
    } catch {
      toast.error('Failed to send reply');
    }
  };

  return (
    <Sheet open={!!inquiry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        {inquiry && (
          <>
            {/* Header */}
            <SheetHeader className="p-4 pb-3 border-b">
              <div className="flex items-center gap-2 flex-wrap pr-8">
                {urgency !== 'none' && urgency !== 'resolved' && (
                  <Badge variant="outline" className={cn("text-xs", URGENCY_CONFIG[urgency].className)}>
                    {URGENCY_CONFIG[urgency].label}
                  </Badge>
                )}
                <Badge className={cn("text-xs", STATUS_COLORS[inquiry.status])}>
                  {inquiry.status}
                </Badge>
              </div>
              <SheetTitle className="text-base text-left mt-1">{inquiry.subject}</SheetTitle>
              <SheetDescription className="sr-only">Inquiry detail panel</SheetDescription>
            </SheetHeader>

            {/* Body */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Student: </span>
                    <span className="font-medium">{inquiry.user_profile?.full_name || inquiry.user_profile?.email || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category: </span>
                    <span>{getInquiryCategoryLabel(inquiry.category)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    <span className={getAgeBadgeStyle(ageHours)}>
                      {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {inquiry.assigned_team && (
                    <div>
                      <span className="text-muted-foreground">Team: </span>
                      <span className="capitalize">{inquiry.assigned_team}</span>
                    </div>
                  )}
                </div>

                {/* Open Content button */}
                {inquiry.module_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      const link = buildContentLink({
                        moduleId: inquiry.module_id!,
                        chapterId: inquiry.chapter_id,
                        from: 'inbox',
                      });
                      window.open(link, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Content
                    {!inquiry.chapter_id && (
                      <span className="text-xs text-muted-foreground ml-auto">(module only)</span>
                    )}
                  </Button>
                )}

                {/* Full question */}
                <div className="p-3 rounded-lg bg-muted border">
                  <p className="text-xs text-muted-foreground mb-1">Question:</p>
                  <p className="text-sm whitespace-pre-wrap">{inquiry.message}</p>
                </div>

                {/* Replies */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Replies ({replies.length})</Label>
                  {repliesLoading ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Loading replies...</div>
                  ) : replies.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">No replies yet</div>
                  ) : (
                    <div className="space-y-2">
                      {replies.map((reply) => (
                        <div key={reply.id} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary">
                              {reply.admin_profile?.full_name || reply.admin_profile?.email || 'Admin'}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">Admin</Badge>
                          </div>
                          <p className="text-sm">{reply.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                      <div ref={repliesEndRef} />
                    </div>
                  )}
                </div>

                {/* Reply form */}
                <form onSubmit={handleSendReply} className="space-y-2">
                  <Label className="text-xs">Your Reply</Label>
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to the student..."
                    rows={3}
                  />
                  <Button type="submit" size="sm" className="w-full" disabled={submitReply.isPending || !replyMessage.trim()}>
                    {submitReply.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Reply
                  </Button>
                </form>

                {/* Admin notes */}
                <div className="space-y-2">
                  <Label className="text-xs">Internal Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => onAdminNotesChange(e.target.value)}
                    placeholder="Internal notes (not visible to student)..."
                    rows={2}
                  />
                  <Button variant="outline" size="sm" onClick={onSaveNotes}>Save Notes</Button>
                </div>

                {/* Quick actions */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Actions</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={inquiry.status} onValueChange={(v) => onStatusChange(inquiry.id, v as InquiryStatus)}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={inquiry.assigned_team || ''} onValueChange={(v) => onAssignTeam(inquiry.id, v as AssignedTeam)}>
                      <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Assign team" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">Platform</SelectItem>
                        <SelectItem value="module">Module</SelectItem>
                        <SelectItem value="chapter">Chapter</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
