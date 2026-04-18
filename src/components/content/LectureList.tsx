import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Video, Settings2, Pencil, Trash2, MessageSquare, AlertCircle, X, CheckCircle, Bookmark, ThumbsUp, ThumbsDown, FileText, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getVideoInfo, isValidVideoUrl, normalizeVideoInput, extractYouTubeId } from '@/lib/video';
import { useVideoDelete } from '@/hooks/useVideoDelete';
import { useUpdateContent } from '@/hooks/useContentCrud';
import { useChapterSections, useChapterSectionsEnabled, useLectureSectionIds, useSetLectureSections } from '@/hooks/useSections';
import { useVideoBookmarks } from '@/hooks/useVideoBookmarks';
import { useManualVideoComplete } from '@/hooks/useManualVideoComplete';
import { useVideoRatings } from '@/hooks/useVideoRatings';
import { useVideoNotesExistence } from '@/hooks/useVideoNotes';
import { useAuth } from '@/hooks/useAuth';
import ItemFeedbackModal from '@/components/feedback/ItemFeedbackModal';
import { VideoNotesDrawer } from '@/components/content/VideoNotesDrawer';
import { YouTubePlayer } from '@/components/content/YouTubePlayer';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BulkSectionAssignment, AutoTagSectionsButton, AutoTagYouTubeButton } from '@/components/sections';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LecturesAdminTable } from './LecturesAdminTable';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { useBulkDeleteContent } from '@/hooks/useContentBulkOperations';
import { TopicVideosModal } from './TopicVideosModal';
import { Layers } from 'lucide-react';

interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  youtube_video_id?: string | null;
  duration?: string | null;
  section_id?: string | null;
  topic_id?: string | null;
  created_at?: string | null;
}

type FilterType = 'all' | 'watch-later' | 'watched' | 'recently-added';

interface LectureListProps {
  lectures: Lecture[];
  moduleId?: string;
  chapterId?: string;
  topicId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
  onActiveItemChange?: (info: { item_id: string; item_label: string; item_index: number }) => void;
}

function getVideoIdForLecture(lecture: Lecture): string {
  const url = lecture.video_url || lecture.videoUrl || '';
  const ytId = extractYouTubeId(url);
  return ytId || lecture.id;
}

function isRecentlyAdded(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > fourteenDaysAgo;
}

function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

export function LectureList({
  lectures,
  moduleId,
  chapterId,
  topicId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
  onActiveItemChange,
}: LectureListProps) {
  const { user } = useAuth();
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<Lecture | null>(null);
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editDoctor, setEditDoctor] = useState('');
  const [editDoctorSelectVal, setEditDoctorSelectVal] = useState('');
  const [editSectionIds, setEditSectionIds] = useState<string[]>([]);

  // Fetch existing doctors for this module
  const { data: existingDoctors = [] } = useQuery({
    queryKey: ['module-doctors', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      const { data } = await supabase
        .from('lectures')
        .select('description')
        .eq('module_id', moduleId)
        .eq('is_deleted', false)
        .not('description', 'is', null);
      const unique = [...new Set((data || []).map((l) => l.description).filter(Boolean))];
      return unique.sort() as string[];
    },
    enabled: !!moduleId,
  });
  const { data: chapterSections = [] } = useChapterSections(chapterId);
  const { data: sectionsEnabled } = useChapterSectionsEnabled(chapterId);
  const { data: fetchedSectionIds = [] } = useLectureSectionIds(editLecture?.id);
  const setLectureSections = useSetLectureSections();

  // Sync fetched section IDs into edit state whenever the dialog opens or data loads
  useEffect(() => {
    if (editLecture) setEditSectionIds(fetchedSectionIds);
  }, [editLecture?.id, fetchedSectionIds.join(',')]);

  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [notesLecture, setNotesLecture] = useState<Lecture | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [topicModalTopicId, setTopicModalTopicId] = useState<string | null>(null);
  const [topicModalExcludeId, setTopicModalExcludeId] = useState<string | undefined>();

  const bulkDelete = useBulkDeleteContent('lectures');

  // Count sibling lectures per topic_id (across all chapters/doctors) so we
  // only show the "More videos on this topic" link when there are ≥2.
  const lectureTopicIds = useMemo(
    () => Array.from(new Set(lectures.map((l) => l.topic_id).filter(Boolean) as string[])),
    [lectures]
  );
  const { data: topicSiblingCounts = {} } = useQuery({
    queryKey: ['lecture-topic-sibling-counts', lectureTopicIds],
    enabled: lectureTopicIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('lectures')
        .select('topic_id')
        .in('topic_id', lectureTopicIds)
        .eq('is_deleted', false);
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (row.topic_id) counts[row.topic_id] = (counts[row.topic_id] || 0) + 1;
      }
      return counts;
    },
  });

  // Get video IDs for all lectures
  const videoIds = useMemo(() => lectures.map(getVideoIdForLecture), [lectures]);

  // Engagement hooks
  const { bookmarkedIds, addBookmark, removeBookmark } = useVideoBookmarks();
  const { watchedIds, percentMap, markWatched, unmarkWatched } = useManualVideoComplete();
  const { userRatings, aggregates, rateVideo } = useVideoRatings(videoIds);
  const videoIdsWithNotes = useVideoNotesExistence(videoIds);

  const canManage = canEdit || canDelete;
  const isStudent = !canManage;

  // Fetch helpful votes for all lectures in this chapter to sort doctors
  const chapterVideoIds = useMemo(
    () => lectures.map((l) => l.youtube_video_id || extractYouTubeId(l.video_url || '') || l.id).filter(Boolean),
    [lectures]
  );
  const { data: helpfulVotesRaw = [] } = useQuery({
    queryKey: ['chapter-helpful-votes', chapterVideoIds],
    queryFn: async () => {
      if (chapterVideoIds.length === 0) return [];
      const { data } = await supabase
        .from('video_ratings')
        .select('video_id')
        .eq('rating', 1)
        .in('video_id', chapterVideoIds);
      return (data || []) as { video_id: string }[];
    },
    enabled: chapterVideoIds.length > 0,
  });

  // Unique doctors sorted by helpful votes descending
  const chapterDoctors = useMemo(() => {
    const helpMap = new Map<string, number>();
    for (const v of helpfulVotesRaw) {
      helpMap.set(v.video_id, (helpMap.get(v.video_id) || 0) + 1);
    }
    const doctorVotes = new Map<string, number>();
    for (const l of lectures) {
      const doc = l.description;
      if (!doc) continue;
      const vid = l.youtube_video_id || extractYouTubeId(l.video_url || '') || l.id;
      doctorVotes.set(doc, (doctorVotes.get(doc) || 0) + (helpMap.get(vid) || 0));
    }
    return [...doctorVotes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([doc]) => doc);
  }, [lectures, helpfulVotesRaw]);

  // Filter lectures — first by engagement filter, then by doctor
  const filteredLectures = useMemo(() => {
    let result = lectures;
    if (activeFilter !== 'all') {
      result = result.filter((lecture) => {
        const vid = getVideoIdForLecture(lecture);
        switch (activeFilter) {
          case 'watch-later': return bookmarkedIds.has(vid);
          case 'watched': return watchedIds.has(vid);
          case 'recently-added': return isRecentlyAdded(lecture.created_at);
          default: return true;
        }
      });
    }
    if (selectedDoctor !== 'all') {
      result = result.filter((l) => l.description === selectedDoctor);
    }
    return result;
  }, [lectures, activeFilter, bookmarkedIds, watchedIds, selectedDoctor]);

  const handleSelectLecture = useCallback((lecture: Lecture) => {
    setSelectedLecture(lecture);
    setCurrentVideoTime(0);
    setIsPlayerReady(false);
    setPlayerKey(prev => prev + 1);
    // Report active item
    if (onActiveItemChange) {
      const idx = lectures.findIndex(l => l.id === lecture.id);
      onActiveItemChange({ item_id: lecture.id, item_label: lecture.title, item_index: idx >= 0 ? idx : 0 });
    }
  }, [onActiveItemChange, lectures]);

  const handlePlayerTimeUpdate = useCallback((seconds: number) => {
    setCurrentVideoTime(seconds);
  }, []);

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(lectures.map(l => l.id)));
  }, [lectures]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync({
        ids: Array.from(selectedIds),
        chapterId,
      });
      toast.success(`Deleted ${selectedIds.size} lectures`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to delete lectures');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const { askDelete, doDelete, cancelDelete, confirmOpen, isDeleting, pendingItem } = useVideoDelete(
    moduleId || '',
    chapterId
  );
  const updateContent = useUpdateContent('lectures');

  const handleOpenEdit = (lecture: Lecture) => {
    setEditLecture(lecture);
    setEditTitle(lecture.title);
    setEditDescription(lecture.description || '');
    setEditVideoUrl(lecture.video_url || lecture.videoUrl || '');
    // Doctor is stored in description field
    const doc = lecture.description || '';
    setEditDoctor(doc);
    // Determine select value: 'none', known doctor, or '__custom'
    if (!doc) {
      setEditDoctorSelectVal('none');
    } else if (existingDoctors.includes(doc)) {
      setEditDoctorSelectVal(doc);
    } else {
      setEditDoctorSelectVal('__custom');
    }
  };

  const handleSaveEdit = async () => {
    if (!editLecture) return;
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    const normalizedUrl = normalizeVideoInput(editVideoUrl);
    if (normalizedUrl && !isValidVideoUrl(normalizedUrl)) {
      toast.error('Invalid video URL. Use YouTube, Vimeo, or Google Drive links.');
      return;
    }
    setIsEditSaving(true);
    try {
      const doctorValue = editDoctor.trim() || null;
      await updateContent.mutateAsync({
        id: editLecture.id,
        data: {
          title: editTitle.trim(),
          description: doctorValue,
          video_url: normalizedUrl || null,
        },
      });
      await setLectureSections.mutateAsync({ lectureId: editLecture.id, sectionIds: editSectionIds });
      toast.success('Lecture updated successfully');
      setEditLecture(null);
    } catch (error) {
      toast.error('Failed to update lecture');
    } finally {
      setIsEditSaving(false);
    }
  };

  if (lectures.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No chapters available yet.</p>
      </div>
    );
  }

  const videoUrl = selectedLecture?.video_url || selectedLecture?.videoUrl;
  const normalizedVideoUrl = normalizeVideoInput(videoUrl);
  
  const selectedYouTubeId = extractYouTubeId(normalizedVideoUrl);

  // For Google Drive, keep plain iframe
  const isGoogleDrive = normalizedVideoUrl?.includes('drive.google.com');
  const googleDriveEmbedUrl = isGoogleDrive ? normalizedVideoUrl : null;

  // Admin Table View
  if (canManage && adminViewMode === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
        </div>
        <LecturesAdminTable
          lectures={lectures}
          chapterId={chapterId}
          moduleId={moduleId}
          onEdit={handleOpenEdit}
          onDelete={(lecture) => askDelete(lecture.id, lecture.title, lecture.youtube_video_id)}
        />
        
        {/* Edit Modal */}
        <Dialog open={!!editLecture} onOpenChange={(open) => !open && setEditLecture(null)}>
          <DialogContent className="z-[99999]">
            <DialogHeader><DialogTitle>Edit Lecture</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label htmlFor="edit-title">Title</Label><Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Lecture title" className="mt-1" /></div>
              <div className="space-y-1.5">
                <Label>Doctor <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Select
                  value={editDoctorSelectVal}
                  onValueChange={(v) => {
                    setEditDoctorSelectVal(v);
                    if (v === 'none') setEditDoctor('');
                    else if (v !== '__custom') setEditDoctor(v);
                    else setEditDoctor('');
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {existingDoctors.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                    <SelectItem value="__custom">+ Add new doctor…</SelectItem>
                  </SelectContent>
                </Select>
                {editDoctorSelectVal === '__custom' && (
                  <Input value={editDoctor} onChange={(e) => setEditDoctor(e.target.value)} placeholder="e.g. Dr. Ahmed" autoFocus className="mt-1" />
                )}
              </div>
              <div><Label htmlFor="edit-video-url">Video URL</Label><Input id="edit-video-url" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link (or paste iframe code)" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Supports YouTube and Google Drive. Vimeo support coming soon.</p></div>
              {sectionsEnabled && chapterSections.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Sections <span className="text-muted-foreground font-normal text-xs">(optional, select all that apply)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="mt-1 w-full justify-between font-normal">
                        <span className="truncate text-sm">
                          {editSectionIds.length === 0
                            ? 'No sections selected'
                            : editSectionIds.length === 1
                              ? (chapterSections.find(s => s.id === editSectionIds[0])?.name ?? '1 selected')
                              : `${editSectionIds.length} sections selected`}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2 z-[99999]" align="start">
                      <div className="max-h-52 overflow-y-auto space-y-1">
                        {chapterSections.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted">
                            <Checkbox
                              checked={editSectionIds.includes(s.id)}
                              onCheckedChange={(checked) =>
                                setEditSectionIds(prev =>
                                  checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                                )
                              }
                            />
                            <span className="text-sm">{s.section_number ? `${s.section_number}. ${s.name}` : s.name}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditLecture(null)} disabled={isEditSaving}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isEditSaving}>{isEditSaving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
          <AlertDialogContent className="z-[99999]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete lecture?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete <span className="font-medium text-foreground">"{pendingItem?.title}"</span>? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting} onClick={(e) => { e.preventDefault(); doDelete(); }}>{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const filterPills: { key: FilterType; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { key: 'all', label: 'All', icon: null, activeClass: 'bg-primary text-primary-foreground' },
    { key: 'watch-later', label: 'Watch Later', icon: <Bookmark className="h-3.5 w-3.5" />, activeClass: 'bg-blue-500 text-white' },
    { key: 'watched', label: 'Watched', icon: <CheckCircle className="h-3.5 w-3.5" />, activeClass: 'bg-green-500 text-white' },
    { key: 'recently-added', label: 'Recently Added', icon: <Sparkles className="h-3.5 w-3.5" />, activeClass: 'bg-amber-500 text-white' },
  ];

  return (
    <TooltipProvider>
      {/* Filter Pills (student view only) */}
      {isStudent && user && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide flex-nowrap pb-1">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                activeFilter === pill.key
                  ? pill.activeClass
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {pill.icon}
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {/* Doctor filter pills — shown to everyone when chapter has multiple doctors */}
      {chapterDoctors.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide flex-nowrap pb-1 items-center">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Doctor:</span>
          <button
            onClick={() => setSelectedDoctor('all')}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedDoctor === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {chapterDoctors.map((doc) => (
            <button
              key={doc}
              onClick={() => setSelectedDoctor(doc)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedDoctor === doc
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {doc}
            </button>
          ))}
        </div>
      )}

      {/* Admin View Toggle + YouTube AI Assign button */}
      {canManage && (
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size > 0 && selectedIds.size === lectures.length}
              onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
            {selectedIds.size > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 gap-1">
                  <X className="h-3.5 w-3.5" />Clear
                </Button>
                {chapterId && (
                  <BulkSectionAssignment chapterId={chapterId} selectedIds={Array.from(selectedIds)} contentTable="lectures" onComplete={clearSelection} />
                )}
                <AutoTagSectionsButton chapterId={chapterId} />
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-7 gap-1">
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chapterId && <AutoTagYouTubeButton chapterId={chapterId} lectures={filteredLectures} />}
            <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filteredLectures.map((lecture) => {
          const lectureVideoUrl = lecture.video_url || lecture.videoUrl || null;
          const videoInfo = getVideoInfo(lectureVideoUrl);
          const isValid = isValidVideoUrl(lectureVideoUrl);
          const vid = getVideoIdForLecture(lecture);
          const isWatched = watchedIds.has(vid);
          const isBookmarked = bookmarkedIds.has(vid);
          const percent = percentMap.get(vid) || 0;
          const rating = userRatings.get(vid) ?? null;
          const agg = aggregates.get(vid) || { thumbsUp: 0, thumbsDown: 0 };
          const hasNotes = videoIdsWithNotes.has(vid);
          const isNew = isRecentlyAdded(lecture.created_at);
          const isPopular = agg.thumbsUp >= 10 && (agg.thumbsUp / (agg.thumbsUp + agg.thumbsDown)) >= 0.75;

          return (
            <div
              key={lecture.id}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left min-h-[48px]"
            >
              {/* Checkbox for multi-select (admin only) */}
              {canManage && (
                <Checkbox
                  checked={selectedIds.has(lecture.id)}
                  onCheckedChange={(checked) => toggleSelection(lecture.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${lecture.title}`}
                  className="shrink-0"
                />
              )}

              {/* Thumbnail with overlays */}
              <button
                onClick={() => isValid && handleSelectLecture(lecture)}
                disabled={!isValid}
                className="w-20 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center relative disabled:opacity-50"
              >
                {videoInfo.thumbnailUrl ? (
                  <>
                    <img
                      src={videoInfo.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      style={isWatched ? { filter: 'brightness(0.85)' } : undefined}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center">
                        <span className="text-primary-foreground text-xs ml-0.5">▶</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <Video className="w-5 h-5 text-muted-foreground" />
                )}

                {/* Badges */}
                <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5">
                  {isNew && (
                    <span className="px-1 py-0.5 text-[9px] font-bold rounded bg-amber-500 text-white leading-none">NEW</span>
                  )}
                  {isWatched && (
                    <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>

                {isPopular && (
                  <span className="absolute top-0.5 right-0.5 px-1 py-0.5 text-[9px] font-bold rounded bg-orange-500 text-white leading-none">
                    🔥
                  </span>
                )}

                {/* Progress bar */}
                {percent > 0 && percent < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${percent}%` }} />
                  </div>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => isValid && handleSelectLecture(lecture)}
                  disabled={!isValid}
                  className="w-full text-left disabled:opacity-50"
                >
                  <div className="font-semibold truncate">{lecture.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {lecture.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{lecture.duration}
                      </span>
                    )}
                    <span className="hidden md:inline">Click to play</span>
                    <span className="md:hidden">Tap to play</span>
                  </div>
                </button>
                {lecture.topic_id && (topicSiblingCounts[lecture.topic_id] || 0) > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTopicModalTopicId(lecture.topic_id!);
                      setTopicModalExcludeId(lecture.id);
                    }}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Layers className="w-3 h-3" />
                    More videos on this topic ({(topicSiblingCounts[lecture.topic_id] || 1) - 1})
                  </button>
                )}
              </div>

              {/* Student action buttons */}
              {isStudent && user && (
                <>
                  {/* Desktop: all 5 buttons */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); if (isWatched) unmarkWatched.mutate(vid); else markWatched.mutate(vid); }}>
                          <CheckCircle className={`h-4 w-4 ${isWatched ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isWatched ? 'Unmark' : 'Mark as watched'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); if (isBookmarked) removeBookmark.mutate(vid); else addBookmark.mutate(vid); }}>
                          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'text-blue-500 fill-blue-500' : 'text-muted-foreground'}`} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isBookmarked ? 'Remove from Watch Later' : 'Watch later'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-0.5" onClick={(e) => { e.stopPropagation(); rateVideo.mutate({ videoId: vid, rating: 1 }); }}>
                          <ThumbsUp className={`h-4 w-4 ${rating === 1 ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                          {agg.thumbsUp > 0 && <span className="text-[10px] text-muted-foreground">{agg.thumbsUp}</span>}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Helpful</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-0.5" onClick={(e) => { e.stopPropagation(); rateVideo.mutate({ videoId: vid, rating: -1 }); }}>
                          <ThumbsDown className={`h-4 w-4 ${rating === -1 ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`} />
                          {agg.thumbsDown > 0 && <span className="text-[10px] text-muted-foreground">{agg.thumbsDown}</span>}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Not helpful</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors relative" onClick={(e) => { e.stopPropagation(); setNotesLecture(lecture); setNotesDrawerOpen(true); }}>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {hasNotes && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-500" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>My notes</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Mobile: watched + bookmark inline, rest in dropdown */}
                  <div className="flex md:hidden items-center gap-0.5 shrink-0">
                    <button className="p-2 rounded-md hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={(e) => { e.stopPropagation(); if (isWatched) unmarkWatched.mutate(vid); else markWatched.mutate(vid); }}>
                      <CheckCircle className={`h-4 w-4 ${isWatched ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                    </button>
                    <button className="p-2 rounded-md hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={(e) => { e.stopPropagation(); if (isBookmarked) removeBookmark.mutate(vid); else addBookmark.mutate(vid); }}>
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'text-blue-500 fill-blue-500' : 'text-muted-foreground'}`} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-md hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <Settings2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); rateVideo.mutate({ videoId: vid, rating: 1 }); }} className="gap-2">
                          <ThumbsUp className={`h-4 w-4 ${rating === 1 ? 'text-green-500 fill-green-500' : ''}`} />
                          Helpful {agg.thumbsUp > 0 && `(${agg.thumbsUp})`}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); rateVideo.mutate({ videoId: vid, rating: -1 }); }} className="gap-2">
                          <ThumbsDown className={`h-4 w-4 ${rating === -1 ? 'text-destructive fill-destructive' : ''}`} />
                          Not helpful {agg.thumbsDown > 0 && `(${agg.thumbsDown})`}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setNotesLecture(lecture); setNotesDrawerOpen(true); }} className="gap-2">
                          <FileText className="h-4 w-4" />
                          My notes {hasNotes && '•'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}

              {/* Admin actions */}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                      <Settings2 className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">Manage</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenEdit(lecture); }} className="gap-2">
                        <Pencil className="h-4 w-4" />Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); askDelete(lecture.id, lecture.title, lecture.youtube_video_id); }} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />Delete
                      </DropdownMenuItem>
                    )}
                    {showFeedback && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setFeedbackItem(lecture); }} className="gap-2">
                        <MessageSquare className="h-4 w-4" />Feedback
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Non-admin, non-authenticated: plain play icon */}
              {!canManage && !user && (
                <span className="text-muted-foreground text-lg">▶</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Video Player Modal */}
      <Dialog 
        open={!!selectedLecture} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLecture(null);
            setCurrentVideoTime(0);
            setIsPlayerReady(false);
            setPlayerKey(0);
          }
        }}
      >
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-md:w-full max-md:h-full max-md:max-w-full max-md:max-h-full max-md:rounded-none">
          <DialogHeader className="p-3 md:p-4 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pr-8">
              <DialogTitle className="truncate text-sm md:text-base">{selectedLecture?.title}</DialogTitle>
              {isStudent && user && selectedLecture && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 self-start md:self-auto"
                  onClick={() => {
                    setNotesLecture(selectedLecture);
                    setNotesDrawerOpen(true);
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Note @ {formatPlaybackTime(currentVideoTime)}
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="w-full bg-black">
            {selectedYouTubeId ? (
              <YouTubePlayer
                key={playerKey}
                videoId={selectedYouTubeId}
                title={selectedLecture?.title}
                onReady={() => setIsPlayerReady(true)}
                onTimeUpdate={handlePlayerTimeUpdate}
              />
            ) : isGoogleDrive && googleDriveEmbedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  key={playerKey}
                  src={googleDriveEmbedUrl}
                  title={selectedLecture?.title}
                  className="w-full h-full"
                  allow="autoplay"
                  allowFullScreen
                  onLoad={() => setTimeout(() => setIsPlayerReady(true), 500)}
                />
              </div>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-muted">
                <div className="text-center space-y-4 p-6 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-background flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">Video Source Not Supported</h3>
                    <p className="text-sm text-muted-foreground">Please use YouTube or Google Drive links for video playback.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editLecture} onOpenChange={(open) => !open && setEditLecture(null)}>
        <DialogContent className="z-[99999]">
          <DialogHeader><DialogTitle>Edit Lecture</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label htmlFor="edit-title">Title</Label><Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Lecture title" className="mt-1" /></div>
            <div className="space-y-1.5">
              <Label>Doctor <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Select
                value={editDoctorSelectVal}
                onValueChange={(v) => {
                  setEditDoctorSelectVal(v);
                  if (v === 'none') setEditDoctor('');
                  else if (v !== '__custom') setEditDoctor(v);
                  else setEditDoctor('');
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {existingDoctors.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                  <SelectItem value="__custom">+ Add new doctor…</SelectItem>
                </SelectContent>
              </Select>
              {editDoctorSelectVal === '__custom' && (
                <Input value={editDoctor} onChange={(e) => setEditDoctor(e.target.value)} placeholder="e.g. Dr. Ahmed" autoFocus className="mt-1" />
              )}
            </div>
            <div><Label htmlFor="edit-video-url">Video URL</Label><Input id="edit-video-url" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link (or paste iframe code)" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Supports YouTube and Google Drive. Vimeo support coming soon.</p></div>
            {sectionsEnabled && chapterSections.length > 0 && (
              <div className="space-y-1.5">
                <Label>Sections <span className="text-muted-foreground font-normal text-xs">(optional, select all that apply)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1 w-full justify-between font-normal">
                      <span className="truncate text-sm">
                        {editSectionIds.length === 0
                          ? 'No sections selected'
                          : editSectionIds.length === 1
                            ? (chapterSections.find(s => s.id === editSectionIds[0])?.name ?? '1 selected')
                            : `${editSectionIds.length} sections selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2 z-[99999]" align="start">
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {chapterSections.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted">
                          <Checkbox
                            checked={editSectionIds.includes(s.id)}
                            onCheckedChange={(checked) =>
                              setEditSectionIds(prev =>
                                checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                              )
                            }
                          />
                          <span className="text-sm">{s.section_number ? `${s.section_number}. ${s.name}` : s.name}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLecture(null)} disabled={isEditSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isEditSaving}>{isEditSaving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lecture?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <span className="font-medium text-foreground">"{pendingItem?.title}"</span>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting} onClick={(e) => { e.preventDefault(); doDelete(); }}>{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback modal */}
      {feedbackItem && moduleId && (
        <ItemFeedbackModal
          isOpen={!!feedbackItem}
          onClose={() => setFeedbackItem(null)}
          itemType="video"
          itemId={feedbackItem.id}
          itemTitle={feedbackItem.title}
          moduleId={moduleId}
          chapterId={chapterId}
          topicId={topicId}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lectures?</AlertDialogTitle>
            <AlertDialogDescription>This will soft-delete the selected lectures. You can restore them later from the deleted items view.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkDelete(); }} disabled={bulkDelete.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{bulkDelete.isPending ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes Drawer */}
      {notesLecture && (
        <VideoNotesDrawer
          open={notesDrawerOpen}
          onOpenChange={(open) => {
            setNotesDrawerOpen(open);
            if (!open) setNotesLecture(null);
          }}
          videoId={getVideoIdForLecture(notesLecture)}
          videoTitle={notesLecture.title}
          currentTimestampSeconds={selectedLecture?.id === notesLecture.id ? currentVideoTime : undefined}
          isTimestampLive={!!selectedYouTubeId && selectedLecture?.id === notesLecture.id}
        />
      )}
    </TooltipProvider>
  );
}
