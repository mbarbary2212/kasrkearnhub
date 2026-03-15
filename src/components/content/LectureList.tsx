import { useState, useCallback, useMemo } from 'react';
import { Clock, Video, Settings2, Pencil, Trash2, MessageSquare, AlertCircle, X, CheckCircle, Bookmark, ThumbsUp, ThumbsDown, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { getVideoInfo, isValidVideoUrl, normalizeVideoInput, isVimeoUrl, extractYouTubeId } from '@/lib/video';
import { useVideoDelete } from '@/hooks/useVideoDelete';
import { useUpdateContent } from '@/hooks/useContentCrud';
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
import { SectionSelector, BulkSectionAssignment } from '@/components/sections';
import { LecturesAdminTable } from './LecturesAdminTable';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { useBulkDeleteContent } from '@/hooks/useContentBulkOperations';

interface Lecture {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  duration?: string | null;
  section_id?: string | null;
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
}: LectureListProps) {
  const { user } = useAuth();
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<Lecture | null>(null);
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [notesLecture, setNotesLecture] = useState<Lecture | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  const bulkDelete = useBulkDeleteContent('lectures');

  // Get video IDs for all lectures
  const videoIds = useMemo(() => lectures.map(getVideoIdForLecture), [lectures]);

  // Engagement hooks
  const { bookmarkedIds, addBookmark, removeBookmark } = useVideoBookmarks();
  const { watchedIds, percentMap, markWatched, unmarkWatched } = useManualVideoComplete();
  const { userRatings, aggregates, rateVideo } = useVideoRatings(videoIds);
  const videoIdsWithNotes = useVideoNotesExistence(videoIds);

  const canManage = canEdit || canDelete;
  const isStudent = !canManage;

  // Filter lectures
  const filteredLectures = useMemo(() => {
    if (activeFilter === 'all') return lectures;
    return lectures.filter((lecture) => {
      const vid = getVideoIdForLecture(lecture);
      switch (activeFilter) {
        case 'watch-later':
          return bookmarkedIds.has(vid);
        case 'watched':
          return watchedIds.has(vid);
        case 'recently-added':
          return isRecentlyAdded(lecture.created_at);
        default:
          return true;
      }
    });
  }, [lectures, activeFilter, bookmarkedIds, watchedIds]);

  const handleSelectLecture = useCallback((lecture: Lecture) => {
    setSelectedLecture(lecture);
    setCurrentVideoTime(0);
    setIsPlayerReady(false);
    setPlayerKey(prev => prev + 1);
  }, []);

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
    setEditDuration(lecture.duration || '');
    setEditSectionId(lecture.section_id || null);
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
      await updateContent.mutateAsync({
        id: editLecture.id,
        data: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          video_url: normalizedUrl || null,
          duration: editDuration.trim() || null,
          section_id: editSectionId,
        },
      });
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
  const isVimeoVideo = isVimeoUrl(normalizedVideoUrl);
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
          onDelete={(lecture) => askDelete(lecture.id, lecture.title)}
        />
        
        {/* Edit Modal */}
        <Dialog open={!!editLecture} onOpenChange={(open) => !open && setEditLecture(null)}>
          <DialogContent className="z-[99999]">
            <DialogHeader><DialogTitle>Edit Lecture</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label htmlFor="edit-title">Title</Label><Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Lecture title" className="mt-1" /></div>
              <div><Label htmlFor="edit-description">Description (optional)</Label><Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Lecture description" className="mt-1" rows={3} /></div>
              <div><Label htmlFor="edit-video-url">Video URL</Label><Input id="edit-video-url" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link (or paste iframe code)" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Supports YouTube and Google Drive. Vimeo support coming soon.</p></div>
              <div><Label htmlFor="edit-duration">Duration (optional)</Label><Input id="edit-duration" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g., 15:30" className="mt-1" /></div>
              <SectionSelector chapterId={chapterId} value={editSectionId} onChange={setEditSectionId} />
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
        <div className="flex gap-2 mb-4 flex-wrap">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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

      {/* Admin View Toggle */}
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
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-7 gap-1">
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </Button>
              </>
            )}
          </div>
          <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
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
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left"
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
              <button
                onClick={() => isValid && handleSelectLecture(lecture)}
                disabled={!isValid}
                className="flex-1 min-w-0 text-left disabled:opacity-50"
              >
                <div className="font-semibold truncate">{lecture.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {lecture.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{lecture.duration}
                    </span>
                  )}
                  <span>Tap to play</span>
                </div>
              </button>

              {/* Student action buttons */}
              {isStudent && user && (
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isWatched) unmarkWatched.mutate(vid);
                          else markWatched.mutate(vid);
                        }}
                      >
                        <CheckCircle className={`h-4 w-4 ${isWatched ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{isWatched ? 'Unmark' : 'Mark as watched'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isBookmarked) removeBookmark.mutate(vid);
                          else addBookmark.mutate(vid);
                        }}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'text-blue-500 fill-blue-500' : 'text-muted-foreground'}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{isBookmarked ? 'Remove from Watch Later' : 'Watch later'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          rateVideo.mutate({ videoId: vid, rating: 1 });
                        }}
                      >
                        <ThumbsUp className={`h-4 w-4 ${rating === 1 ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                        {agg.thumbsUp > 0 && <span className="text-[10px] text-muted-foreground">{agg.thumbsUp}</span>}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Helpful</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          rateVideo.mutate({ videoId: vid, rating: -1 });
                        }}
                      >
                        <ThumbsDown className={`h-4 w-4 ${rating === -1 ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`} />
                        {agg.thumbsDown > 0 && <span className="text-[10px] text-muted-foreground">{agg.thumbsDown}</span>}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Not helpful</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-md hover:bg-muted transition-colors relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesLecture(lecture);
                          setNotesDrawerOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {hasNotes && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>My notes</TooltipContent>
                  </Tooltip>
                </div>
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); askDelete(lecture.id, lecture.title); }} className="gap-2 text-destructive focus:text-destructive">
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
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-2 pr-8">
              <DialogTitle className="truncate">{selectedLecture?.title}</DialogTitle>
              {isStudent && user && selectedLecture && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
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
            {isVimeoVideo ? (
              <div className="w-full aspect-video flex items-center justify-center bg-muted">
                <div className="text-center space-y-4 p-6 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-background flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground">Vimeo Not Supported</h3>
                    <p className="text-sm text-muted-foreground">Vimeo video playback is temporarily unavailable. Please use YouTube or Google Drive links.</p>
                  </div>
                </div>
              </div>
            ) : selectedYouTubeId ? (
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
            <div><Label htmlFor="edit-description">Description (optional)</Label><Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Lecture description" className="mt-1" rows={3} /></div>
            <div><Label htmlFor="edit-video-url">Video URL</Label><Input id="edit-video-url" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link (or paste iframe code)" className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Supports YouTube and Google Drive. Vimeo support coming soon.</p></div>
            <div><Label htmlFor="edit-duration">Duration (optional)</Label><Input id="edit-duration" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="e.g., 15:30" className="mt-1" /></div>
            <SectionSelector chapterId={chapterId} value={editSectionId} onChange={setEditSectionId} />
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
        />
      )}
    </TooltipProvider>
  );
}
