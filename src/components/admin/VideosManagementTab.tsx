import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractYouTubeId } from '@/lib/video';
import { useVideosHierarchy, YearNode, ModuleNode, ChapterNode, LectureNode } from '@/hooks/useVideosHierarchy';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
} from 'lucide-react';

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
  const thumb = lecture.youtube_video_id
    ? `https://img.youtube.com/vi/${lecture.youtube_video_id}/default.jpg`
    : null;

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
    </div>
  );
}

// ─── Chapter Section ──────────────────────────────────────────────────────────

function ChapterSection({ chapter }: { chapter: ChapterNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          {chapter.title}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5">{chapter.total_videos} videos</Badge>
      </div>
      <div className="divide-y divide-border/50">
        {chapter.lectures.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2 italic">No lectures</p>
        ) : (
          chapter.lectures.map((lecture) => (
            <LectureRow key={lecture.id} lecture={lecture} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────

function ModuleAccordionItem({ module }: { module: ModuleNode }) {
  return (
    <AccordionItem value={module.id} className="border rounded-md mb-1.5 overflow-hidden">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 [&[data-state=open]]:bg-muted/30">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <span className="font-medium text-sm truncate">{module.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{module.total_videos} videos</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
            <Eye className="w-3 h-3 mr-1" />
            {module.total_views}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-0 pb-0">
        <div className="border-t divide-y divide-border/30">
          {module.chapters.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-3 italic">No chapters</p>
          ) : (
            module.chapters.map((chapter) => (
              <ChapterSection key={chapter.id} chapter={chapter} />
            ))
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ─── Year Accordion ───────────────────────────────────────────────────────────

function YearAccordionItem({ year }: { year: YearNode }) {
  return (
    <AccordionItem value={year.id} className="border rounded-lg mb-3 overflow-hidden bg-card">
      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
          <span className="font-semibold text-base">{year.name}</span>
          <Badge className="text-[11px] px-2">{year.total_videos} videos</Badge>
          <Badge variant="secondary" className="text-[11px] px-2 gap-1">
            <Eye className="w-3 h-3" />
            {year.total_views} views
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">
        {year.modules.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No modules</p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {year.modules.map((module) => (
              <ModuleAccordionItem key={module.id} module={module} />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
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

// ─── YouTube Upload Card ──────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'initiating' | 'uploading' | 'finalizing' | 'done' | 'error';

interface UploadCardProps {
  hierarchy: YearNode[];
}

function YouTubeUploadCard({ hierarchy }: UploadCardProps) {
  const queryClient = useQueryClient();

  // Selection state — three-level: year → module → lecture
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedLectureId, setSelectedLectureId] = useState('');

  // Upload metadata
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted');

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Derived options
  const yearOptions = hierarchy;

  const moduleOptions =
    hierarchy.find((y) => y.id === selectedYearId)?.modules ?? [];

  // Flatten all lectures from the selected module across all chapters
  const lectureOptions: { value: string; label: string }[] = [];
  const selectedModule = moduleOptions.find((m) => m.id === selectedModuleId);
  if (selectedModule) {
    for (const chapter of selectedModule.chapters) {
      for (const lecture of chapter.lectures) {
        lectureOptions.push({
          value: lecture.id,
          label: `${chapter.title} › ${lecture.title}`,
        });
      }
    }
  }

  const isUploading = ['initiating', 'uploading', 'finalizing'].includes(uploadStatus);

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a video file.'); return; }
    if (!title.trim()) { toast.error('Please enter a video title.'); return; }
    if (!selectedLectureId) { toast.error('Please select a lecture.'); return; }

    setUploadStatus('initiating');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Step 1: Initiate resumable upload
      const { data: initiateData, error: initiateError } = await supabase.functions.invoke(
        'youtube-upload',
        { body: { action: 'initiate', title, description, privacy } }
      );
      if (initiateError) throw new Error(initiateError.message);

      const uploadUrl: string = initiateData?.upload_url;
      if (!uploadUrl) throw new Error('No upload URL returned from server.');

      // Step 2: Upload file directly to YouTube resumable URL via XHR for progress
      setUploadStatus('uploading');

      const videoResource = await new Promise<{ id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch {
              reject(new Error('Failed to parse YouTube upload response.'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.onabort = () => reject(new Error('Upload aborted.'));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/*');
        xhr.send(file);
      });

      const youtubeVideoId = videoResource?.id;
      if (!youtubeVideoId) throw new Error('YouTube did not return a video ID after upload.');

      // Step 3: Finalize — update DB and add to playlist
      setUploadStatus('finalizing');

      const { data: finalizeData, error: finalizeError } = await supabase.functions.invoke(
        'youtube-upload',
        {
          body: {
            action: 'finalize',
            youtube_video_id: youtubeVideoId,
            lecture_id: selectedLectureId,
            module_id: selectedModuleId || undefined,
          },
        }
      );
      if (finalizeError) throw new Error(finalizeError.message);

      setYoutubeUrl(finalizeData?.youtube_url ?? `https://www.youtube.com/watch?v=${youtubeVideoId}`);
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
    setDescription('');
    setPrivacy('unlisted');
    setSelectedLectureId('');
    setUploadStatus('idle');
    setUploadProgress(0);
    setYoutubeUrl('');
    setErrorMessage('');
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle: '',
    initiating: 'Initiating upload…',
    uploading: `Uploading… ${uploadProgress}%`,
    finalizing: 'Finalizing and linking lecture…',
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
                  setSelectedLectureId('');
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
                  onValueChange={(v) => {
                    setSelectedModuleId(v);
                    setSelectedLectureId('');
                  }}
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

            {/* Lecture selector */}
            {selectedModuleId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lecture</label>
                <Select
                  value={selectedLectureId}
                  onValueChange={setSelectedLectureId}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lecture…" />
                  </SelectTrigger>
                  <SelectContent>
                    {lectureOptions.length === 0 ? (
                      <SelectItem value="__empty" disabled>No lectures found</SelectItem>
                    ) : (
                      lectureOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
              disabled={isUploading || !file || !title.trim() || !selectedLectureId}
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

          {/* Hierarchy Tree */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Curriculum Hierarchy
            </h3>
            {hierarchy && hierarchy.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {hierarchy.map((year) => (
                  <YearAccordionItem key={year.id} year={year} />
                ))}
              </Accordion>
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
