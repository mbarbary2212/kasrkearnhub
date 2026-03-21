import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractYouTubeId } from '@/lib/video';
import { useVideosHierarchy, YearNode, ModuleNode, ChapterNode, LectureNode } from '@/hooks/useVideosHierarchy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Play,
  Eye,
  Youtube,
  Edit2,
  Check,
  X,
  Upload,
  Video,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getModuleCode(name: string): string {
  return name.match(/^[A-Z]+-\d+/)?.[0] ?? name.split(':')[0].trim();
}

// ─── Inline URL Edit ─────────────────────────────────────────────────────────

interface InlineUrlEditProps {
  lectureId: string;
  currentUrl: string | null;
}

function InlineUrlEdit({ lectureId, currentUrl }: InlineUrlEditProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentUrl || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      const ytId = extractYouTubeId(url) || null;
      const { error } = await supabase
        .from('lectures')
        .update({ video_url: url || null, youtube_video_id: ytId })
        .eq('id', lectureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
      toast.success('Video URL updated');
      setEditing(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => {
          setValue(currentUrl || '');
          setEditing(true);
        }}
      >
        <Edit2 className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste YouTube URL..."
        className="h-7 text-xs flex-1 min-w-0"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') mutation.mutate(value);
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-green-600"
        onClick={() => mutation.mutate(value)}
        disabled={mutation.isPending}
      >
        <Check className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground"
        onClick={() => setEditing(false)}
        disabled={mutation.isPending}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ─── Lecture Row ──────────────────────────────────────────────────────────────

function LectureRow({ lecture }: { lecture: LectureNode }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const thumb = lecture.youtube_video_id
    ? `https://img.youtube.com/vi/${lecture.youtube_video_id}/default.jpg`
    : null;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete from YouTube if we have a video ID
      if (lecture.youtube_video_id) {
        const { error: fnError } = await supabase.functions.invoke('youtube-upload', {
          body: { action: 'delete', youtube_video_id: lecture.youtube_video_id },
        });
        // Log but don't block — DB record still gets soft-deleted
        if (fnError) console.warn('YouTube delete warning:', fnError.message);
      }
      const { error } = await supabase
        .from('lectures')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
      toast.success('Lecture deleted');
      setDeletingId(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
      setDeletingId(null);
    },
  });

  const isConfirming = deletingId === lecture.id;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors group">
      {/* Thumbnail */}
      <div className="w-12 h-[27px] rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <Video className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <span className="text-sm flex-1 min-w-0 truncate">{lecture.title}</span>

      {/* Doctor badge */}
      {lecture.doctor && lecture.doctor !== 'General' && (
        <Badge variant="outline" className="text-[10px] px-1.5 shrink-0 text-muted-foreground">
          {lecture.doctor}
        </Badge>
      )}

      {/* Duration */}
      {lecture.duration && (
        <span className="text-xs text-muted-foreground shrink-0">{lecture.duration}</span>
      )}

      {/* Source badge */}
      {lecture.youtube_video_id ? (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0 text-[10px] px-1.5 shrink-0">
          <Youtube className="w-3 h-3 mr-1" />
          YouTube
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">No Source</Badge>
      )}

      {/* View count */}
      <Badge variant="outline" className="text-[10px] px-1.5 shrink-0 gap-1">
        <Eye className="w-3 h-3" />
        {lecture.view_count}
      </Badge>

      {/* Edit button */}
      <div className="shrink-0">
        <InlineUrlEdit lectureId={lecture.id} currentUrl={lecture.video_url} />
      </div>

      {/* Delete button / inline confirmation */}
      <div className="shrink-0 flex items-center gap-1">
        {isConfirming ? (
          <>
            <span className="text-xs text-muted-foreground">Delete?</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => deleteMutation.mutate(lecture.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => setDeletingId(null)}
              disabled={deleteMutation.isPending}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setDeletingId(lecture.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Chapter Section ──────────────────────────────────────────────────────────

function ChapterSection({ chapter, filteredLectures }: { chapter: ChapterNode; filteredLectures?: LectureNode[] }) {
  const lectures = filteredLectures ?? chapter.lectures;
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          {chapter.title}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5">{lectures.length} videos</Badge>
      </div>
      <div className="divide-y divide-border/50">
        {lectures.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2 italic">No lectures</p>
        ) : (
          lectures.map((lecture) => (
            <LectureRow key={lecture.id} lecture={lecture} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────

interface StatsCardsProps {
  totalVideos: number;
  totalViews: number;
  youtubeVideos: number;
  noSource: number;
}

function StatsCards({ totalVideos, totalViews, youtubeVideos, noSource }: StatsCardsProps) {
  const cards = [
    { label: 'Total Videos', value: totalVideos, icon: <Video className="w-4 h-4" />, color: 'text-blue-600' },
    { label: 'Total Views', value: totalViews, icon: <Eye className="w-4 h-4" />, color: 'text-green-600' },
    { label: 'YouTube Videos', value: youtubeVideos, icon: <Youtube className="w-4 h-4" />, color: 'text-red-600' },
    { label: 'No Source', value: noSource, icon: <X className="w-4 h-4" />, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4 pb-4">
            <div className={`flex items-center gap-2 mb-1 ${card.color}`}>
              {card.icon}
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Curriculum Browser ───────────────────────────────────────────────────────

interface CurriculumBrowserProps {
  hierarchy: YearNode[];
}

function CurriculumBrowser({ hierarchy }: CurriculumBrowserProps) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');

  // Auto-select first year on load (only if nothing selected yet)
  useEffect(() => {
    if (!selectedYearId && hierarchy.length > 0) {
      setSelectedYearId(hierarchy[0].id);
    }
  }, [hierarchy, selectedYearId]);

  // Preserve module selection on refetch — only reset if current module no longer exists in selected year
  useEffect(() => {
    if (selectedYearId) {
      const year = hierarchy.find((y) => y.id === selectedYearId);
      if (!year) return;
      const moduleStillValid = year.modules.some((m) => m.id === selectedModuleId);
      if (!moduleStillValid) {
        setSelectedModuleId(year.modules[0]?.id ?? '');
      }
    }
  }, [selectedYearId, hierarchy]);

  // Reset doctor filter when module changes
  useEffect(() => {
    setSelectedDoctor('all');
  }, [selectedModuleId]);

  const selectedYear = hierarchy.find((y) => y.id === selectedYearId);
  const selectedModule = selectedYear?.modules.find((m) => m.id === selectedModuleId);

  // Collect unique doctors from selected module's lectures
  const doctors = selectedModule
    ? [...new Set(
        selectedModule.chapters.flatMap((c) => c.lectures.map((l) => l.doctor))
      )].filter(Boolean).sort()
    : [];

  const pillBase = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer';
  const pillActive = `${pillBase} bg-primary text-primary-foreground`;
  const pillInactive = `${pillBase} bg-muted hover:bg-muted/80 text-foreground`;

  return (
    <div className="space-y-4">
      {/* Year pills — centered */}
      {hierarchy.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">Year</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {hierarchy.map((year) => (
              <button
                key={year.id}
                className={`${selectedYearId === year.id ? pillActive : pillInactive} flex items-center gap-1.5`}
                onClick={() => setSelectedYearId(year.id)}
              >
                {year.name}
                <span className={`text-[10px] px-1 rounded-full ${selectedYearId === year.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/60 text-muted-foreground'}`}>
                  {year.total_views.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Module pills */}
      {selectedYear && selectedYear.modules.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Module</p>
          <div className="flex flex-wrap gap-2">
            {selectedYear.modules.map((module) => (
              <button
                key={module.id}
                title={module.name}
                className={`${selectedModuleId === module.id ? pillActive : pillInactive} flex items-center gap-1.5`}
                onClick={() => setSelectedModuleId(module.id)}
              >
                {getModuleCode(module.name)}
                <span className={`text-[10px] px-1 rounded-full ${selectedModuleId === module.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/60 text-muted-foreground'}`}>
                  {module.total_videos}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Doctor filter pills */}
      {selectedModule && doctors.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Doctor</p>
          <div className="flex flex-wrap gap-2">
            <button
              className={selectedDoctor === 'all' ? pillActive : pillInactive}
              onClick={() => setSelectedDoctor('all')}
            >
              All
            </button>
            {doctors.map((doc) => (
              <button
                key={doc}
                className={selectedDoctor === doc ? pillActive : pillInactive}
                onClick={() => setSelectedDoctor(doc)}
              >
                {doc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chapter sections */}
      {selectedModule && (
        <div className="border rounded-lg overflow-hidden bg-card">
          {selectedModule.chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6 italic">No chapters in this module.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {selectedModule.chapters.map((chapter) => {
                const filteredLectures = selectedDoctor === 'all'
                  ? undefined
                  : chapter.lectures.filter((l) => l.doctor === selectedDoctor);
                // Hide chapter if filter active and no matching lectures
                if (filteredLectures && filteredLectures.length === 0) return null;
                return (
                  <ChapterSection key={chapter.id} chapter={chapter} filteredLectures={filteredLectures} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedYear && selectedYear.modules.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No modules in this year.</p>
      )}
    </div>
  );
}

// ─── YouTube Upload Card ──────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'initiating' | 'uploading' | 'finalizing' | 'done' | 'error';

interface UploadCardProps {
  hierarchy: YearNode[];
}

function YouTubeUploadCard({ hierarchy }: UploadCardProps) {
  const queryClient = useQueryClient();

  // Selection state — three-level: year → module → chapter
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // Upload metadata
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted');

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Derived options
  const yearOptions = hierarchy;
  const moduleOptions = hierarchy.find((y) => y.id === selectedYearId)?.modules ?? [];
  const chapterOptions = moduleOptions.find((m) => m.id === selectedModuleId)?.chapters ?? [];

  const isUploading = ['initiating', 'uploading', 'finalizing'].includes(uploadStatus);

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a video file.'); return; }
    if (!title.trim()) { toast.error('Please enter a video title.'); return; }
    if (!selectedChapterId) { toast.error('Please select a chapter.'); return; }

    setUploadStatus('initiating');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Step 1: Upload file to Supabase Storage (supports CORS, shows progress)
      setUploadStatus('uploading');

      const storagePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadEndpoint = `${supabaseUrl}/storage/v1/object/video-uploads/${storagePath}`;
        const accessToken = session?.access_token ?? '';

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage upload failed: ${xhr.responseText}`));
        xhr.onerror = () => reject(new Error('Network error uploading to storage.'));
        xhr.open('POST', uploadEndpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      });

      // Step 2: Call edge function to upload from storage → YouTube → create lecture
      setUploadStatus('finalizing');

      const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke(
        'youtube-upload',
        {
          body: {
            action: 'upload',
            storage_path: storagePath,
            title,
            description,
            privacy,
            chapter_id: selectedChapterId,
            module_id: selectedModuleId || undefined,
            doctor: doctor.trim() || 'General',
          },
        }
      );
      if (finalizeError) throw new Error(finalizeError.message);

      setYoutubeUrl(finalizeData?.youtube_url ?? '');
      setUploadStatus('done');
      toast.success('Video uploaded and linked to lecture!');
      queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMessage(msg);
      setUploadStatus('error');
      toast.error(`Upload failed: ${msg}`);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle('');
    setDoctor('');
    setDescription('');
    setPrivacy('unlisted');
    setSelectedChapterId('');
    setUploadStatus('idle');
    setUploadProgress(0);
    setYoutubeUrl('');
    setErrorMessage('');
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle: '',
    initiating: 'Preparing…',
    uploading: `Uploading to server… ${uploadProgress}%`,
    finalizing: 'Sending to YouTube & creating lecture…',
    done: 'Upload complete!',
    error: 'Upload failed',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Upload Video to YouTube</CardTitle>
        </div>
        <CardDescription>
          Upload a video file directly to your YouTube channel. After upload, the video will be embedded from YouTube on your site.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Done state */}
        {uploadStatus === 'done' && (
          <div className="rounded-md bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-800 px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Upload complete — lecture linked successfully!
            </p>
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on YouTube
              </a>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              Upload Another
            </Button>
          </div>
        )}

        {/* Error state */}
        {uploadStatus === 'error' && (
          <div className="rounded-md bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-800 px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Upload failed: {errorMessage}
            </p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}

        {/* Upload form — hidden after done/error */}
        {uploadStatus !== 'done' && uploadStatus !== 'error' && (
          <div className="space-y-3">
            {/* Video file */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video File</label>
              <Input
                type="file"
                accept="video/*"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                }}
              />
            </div>

            {/* Year selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Year</label>
              <Select
                value={selectedYearId}
                onValueChange={(v) => {
                  setSelectedYearId(v);
                  setSelectedModuleId('');
                  setSelectedChapterId('');
                }}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a year…" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Module selector */}
            {selectedYearId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Module</label>
                <Select
                  value={selectedModuleId}
                  onValueChange={(v) => { setSelectedModuleId(v); setSelectedChapterId(''); }}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a module…" />
                  </SelectTrigger>
                  <SelectContent>
                    {moduleOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Chapter selector */}
            {selectedModuleId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Chapter</label>
                <Select
                  value={selectedChapterId}
                  onValueChange={setSelectedChapterId}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chapter…" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapterOptions.length === 0 ? (
                      <SelectItem value="__empty" disabled>No chapters found</SelectItem>
                    ) : (
                      chapterOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video title…"
                disabled={isUploading}
              />
            </div>

            {/* Doctor (optional) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Doctor <span className="text-muted-foreground/60 font-normal">(optional — defaults to General)</span>
              </label>
              <Input
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="e.g. Dr. Ahmed…"
                disabled={isUploading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Video description (optional)…"
                disabled={isUploading}
              />
            </div>

            {/* Privacy */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Privacy</label>
              <Select
                value={privacy}
                onValueChange={(v) => setPrivacy(v as typeof privacy)}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{statusLabel[uploadStatus]}</span>
                  {uploadStatus === 'uploading' && <span>{uploadProgress}%</span>}
                </div>
                <Progress
                  value={uploadStatus === 'uploading' ? uploadProgress : undefined}
                  className={uploadStatus !== 'uploading' ? 'animate-pulse' : ''}
                />
              </div>
            )}

            {/* Upload button */}
            <Button
              onClick={handleUpload}
              disabled={isUploading || !file || !title.trim() || !selectedChapterId}
              className="gap-2 w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusLabel[uploadStatus]}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload to YouTube
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideosManagementTab() {
  const { data: hierarchy, isLoading, error } = useVideosHierarchy();

  const totalVideos = hierarchy?.reduce((s, y) => s + y.total_videos, 0) ?? 0;
  const totalViews = hierarchy?.reduce((s, y) => s + y.total_views, 0) ?? 0;

  // Count YouTube videos and no-source lectures across all
  let youtubeVideos = 0;
  let noSource = 0;
  if (hierarchy) {
    for (const year of hierarchy) {
      for (const module of year.modules) {
        for (const chapter of module.chapters) {
          for (const lecture of chapter.lectures) {
            if (lecture.youtube_video_id) youtubeVideos++;
            else if (!lecture.video_url) noSource++;
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Play className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Video Library</h2>
            <p className="text-sm text-muted-foreground">Manage all lecture videos across the curriculum</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-sm px-3 py-1">
            <Video className="w-3.5 h-3.5" />
            {totalVideos} videos
          </Badge>
          <Badge variant="outline" className="gap-1 text-sm px-3 py-1">
            <Eye className="w-3.5 h-3.5" />
            {totalViews} views
          </Badge>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Failed to load video hierarchy. Please refresh and try again.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <StatsCards
            totalVideos={totalVideos}
            totalViews={totalViews}
            youtubeVideos={youtubeVideos}
            noSource={noSource}
          />

          {/* Curriculum Browser */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Curriculum Hierarchy
            </h3>
            {hierarchy && hierarchy.length > 0 ? (
              <CurriculumBrowser hierarchy={hierarchy} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No years found. Set up your curriculum first.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upload Card */}
          <YouTubeUploadCard hierarchy={hierarchy || []} />
        </>
      )}
    </div>
  );
}
