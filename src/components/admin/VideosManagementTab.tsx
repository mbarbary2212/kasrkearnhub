import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractYouTubeId, uploadVideoToStorage } from '@/lib/video';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { isValidVideoUrl, normalizeVideoInput } from '@/lib/video';
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
  Link,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getModuleCode(name: string): string {
  return name.match(/^[A-Z]+-\d+/)?.[0] ?? name.split(':')[0].trim();
}

// ─── Lecture Edit Dialog ──────────────────────────────────────────────────────

function LectureEditDialog({ lecture }: { lecture: LectureNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [doctor, setDoctor] = useState('');
  const [doctorSelectVal, setDoctorSelectVal] = useState('');
  const [yearId, setYearId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { data: hierarchy = [] } = useVideosHierarchy();

  const openDialog = () => {
    setTitle(lecture.title);
    setVideoUrl(lecture.video_url || '');
    setChapterId(lecture.chapter_id);
    // Derive module and year from chapter_id (lecture.module_id is not always populated)
    let derivedModuleId = '';
    let derivedYearId = '';
    for (const year of hierarchy) {
      for (const mod of year.modules) {
        if (mod.chapters.some((c) => c.id === lecture.chapter_id)) {
          derivedModuleId = mod.id;
          derivedYearId = year.id;
          break;
        }
      }
      if (derivedYearId) break;
    }
    setModuleId(derivedModuleId);
    setYearId(derivedYearId);
    // Doctor select
    const doc = lecture.doctor || '';
    setDoctor(doc);
    setDoctorSelectVal(doc || '__none');
    setOpen(true);
  };

  // Collect existing doctors from selected module
  const selectedYear = hierarchy.find((y) => y.id === yearId);
  const selectedModule = selectedYear?.modules.find((m) => m.id === moduleId);
  const moduleOptions = selectedYear?.modules ?? [];
  const chapterOptions = selectedModule?.chapters ?? [];
  const existingDoctors = useMemo(() => {
    if (!selectedModule) return [];
    return [...new Set(selectedModule.chapters.flatMap((c) => c.lectures.map((l) => l.doctor)).filter(Boolean))].sort();
  }, [selectedModule]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    const normalizedUrl = normalizeVideoInput(videoUrl);
    if (normalizedUrl && !isValidVideoUrl(normalizedUrl)) {
      toast.error('Invalid video URL. Use a YouTube or Google Drive link.');
      return;
    }
    setSaving(true);
    try {
      const ytId = extractYouTubeId(normalizedUrl || '') || null;
      const doctorValue = doctor.trim() || null;
      const { error } = await supabase.from('lectures').update({
        title: title.trim(),
        description: doctorValue,
        video_url: normalizedUrl || null,
        youtube_video_id: ytId,
        chapter_id: chapterId || lecture.chapter_id,
        module_id: moduleId || lecture.module_id,
      }).eq('id', lecture.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
      toast.success('Lecture updated');
      setOpen(false);
    } catch (err) {
      toast.error(`Failed to update: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={openDialog}>
        <Edit2 className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Lecture</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lecture title" />
            </div>

            {/* Doctor */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Doctor <span className="font-normal">(optional)</span>
              </label>
              <Select
                value={doctorSelectVal}
                onValueChange={(v) => {
                  setDoctorSelectVal(v);
                  if (v === '__none') setDoctor('');
                  else if (v !== '__custom') setDoctor(v);
                  else setDoctor('');
                }}
              >
                <SelectTrigger><SelectValue placeholder="No doctor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No doctor</SelectItem>
                  {existingDoctors.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                  <SelectItem value="__custom">+ Add new doctor…</SelectItem>
                </SelectContent>
              </Select>
              {doctorSelectVal === '__custom' && (
                <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="e.g. Dr. Ahmed" className="mt-1.5" autoFocus />
              )}
            </div>

            {/* Video URL */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video URL</label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube or Google Drive link" />
            </div>

            {/* Chapter — year → module → chapter selectors */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Move to Chapter</label>
              <div className="space-y-1.5">
                <Select value={yearId} onValueChange={(v) => { setYearId(v); setModuleId(''); setChapterId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {hierarchy.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {yearId && (
                  <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setChapterId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {moduleId && (
                  <Select value={chapterId} onValueChange={setChapterId}>
                    <SelectTrigger><SelectValue placeholder="Chapter" /></SelectTrigger>
                    <SelectContent>
                      {chapterOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
      {!!lecture.doctor && (
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
        <LectureEditDialog lecture={lecture} />
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
  allowedModuleIds?: string[];
}

function CurriculumBrowser({ hierarchy, allowedModuleIds }: CurriculumBrowserProps) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');

  // Doctor management state
  const [editingDoctor, setEditingDoctor] = useState<string | null>(null);
  const [editDoctorName, setEditDoctorName] = useState('');
  const [removingDoctor, setRemovingDoctor] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Filter hierarchy to allowed modules only (for module admins) — must be before useEffects that use it
  const filteredHierarchy = useMemo(() => {
    if (!allowedModuleIds) return hierarchy;
    return hierarchy
      .map((year) => ({
        ...year,
        modules: year.modules.filter((m) => allowedModuleIds.includes(m.id)),
      }))
      .filter((year) => year.modules.length > 0);
  }, [hierarchy, allowedModuleIds]);

  // Auto-select first year on load (only if nothing selected yet)
  useEffect(() => {
    if (!selectedYearId && filteredHierarchy.length > 0) {
      setSelectedYearId(filteredHierarchy[0].id);
    }
  }, [filteredHierarchy, selectedYearId]);

  // Preserve module selection on refetch — only reset if current module no longer exists in selected year
  useEffect(() => {
    if (selectedYearId) {
      const year = filteredHierarchy.find((y) => y.id === selectedYearId);
      if (!year) return;
      const moduleStillValid = year.modules.some((m) => m.id === selectedModuleId);
      if (!moduleStillValid) {
        setSelectedModuleId(year.modules[0]?.id ?? '');
      }
    }
  }, [selectedYearId, filteredHierarchy]);

  // Reset doctor filter when module changes
  useEffect(() => {
    setSelectedDoctor('all');
  }, [selectedModuleId]);

  const selectedYear = filteredHierarchy.find((y) => y.id === selectedYearId);
  const selectedModule = selectedYear?.modules.find((m) => m.id === selectedModuleId);

  // Collect all youtube_video_ids from selected module for helpful votes query
  const moduleVideoIds = useMemo(() => {
    if (!selectedModule) return [];
    return selectedModule.chapters
      .flatMap((c) => c.lectures.map((l) => l.youtube_video_id))
      .filter((id): id is string => !!id);
  }, [selectedModule]);

  const { data: moduleHelpfulVotes = [] } = useQuery({
    queryKey: ['module-helpful-votes', selectedModuleId],
    queryFn: async () => {
      if (moduleVideoIds.length === 0) return [];
      const { data } = await supabase
        .from('video_ratings')
        .select('video_id')
        .eq('rating', 1)
        .in('video_id', moduleVideoIds);
      return (data || []) as { video_id: string }[];
    },
    enabled: moduleVideoIds.length > 0,
  });

  // Collect unique doctors sorted by helpful votes descending
  const doctors = useMemo(() => {
    if (!selectedModule) return [];
    const helpMap = new Map<string, number>();
    for (const v of moduleHelpfulVotes) {
      helpMap.set(v.video_id, (helpMap.get(v.video_id) || 0) + 1);
    }
    const doctorVotes = new Map<string, number>();
    for (const chapter of selectedModule.chapters) {
      for (const lecture of chapter.lectures) {
        const doc = lecture.doctor;
        if (!doc) continue;
        doctorVotes.set(doc, (doctorVotes.get(doc) || 0) + (helpMap.get(lecture.youtube_video_id || '') || 0));
      }
    }
    return [...doctorVotes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([doc]) => doc);
  }, [selectedModule, moduleHelpfulVotes]);

  // Doctor stats: lecture count + helpful votes per doctor in selected module
  const doctorStats = useMemo(() => {
    if (!selectedModule) return new Map<string, { count: number; votes: number }>();
    const helpMap = new Map<string, number>();
    for (const v of moduleHelpfulVotes) {
      helpMap.set(v.video_id, (helpMap.get(v.video_id) || 0) + 1);
    }
    const stats = new Map<string, { count: number; votes: number }>();
    for (const chapter of selectedModule.chapters) {
      for (const lecture of chapter.lectures) {
        const doc = lecture.doctor;
        if (!doc) continue;
        const existing = stats.get(doc) || { count: 0, votes: 0 };
        stats.set(doc, {
          count: existing.count + 1,
          votes: existing.votes + (helpMap.get(lecture.youtube_video_id || '') || 0),
        });
      }
    }
    return stats;
  }, [selectedModule, moduleHelpfulVotes]);

  const renameDoctor = async (oldName: string, newName: string) => {
    if (!selectedModule || !newName.trim() || newName.trim() === oldName) {
      setEditingDoctor(null);
      return;
    }
    const { error } = await supabase
      .from('lectures')
      .update({ description: newName.trim() })
      .eq('module_id', selectedModule.id)
      .eq('description', oldName);
    if (error) { toast.error('Failed to rename doctor'); return; }
    queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['module-helpful-votes'] });
    toast.success(`Renamed to "${newName.trim()}"`);
    setEditingDoctor(null);
    setEditDoctorName('');
  };

  const removeDoctor = async (doctorName: string) => {
    if (!selectedModule) return;
    const { error } = await supabase
      .from('lectures')
      .update({ description: null })
      .eq('module_id', selectedModule.id)
      .eq('description', doctorName);
    if (error) { toast.error('Failed to remove doctor'); return; }
    queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
    toast.success(`Removed doctor "${doctorName}"`);
    setRemovingDoctor(null);
    if (selectedDoctor === doctorName) setSelectedDoctor('all');
  };

  const pillBase = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer';
  const pillActive = `${pillBase} bg-primary text-primary-foreground`;
  const pillInactive = `${pillBase} bg-muted hover:bg-muted/80 text-foreground`;

  return (
    <div className="space-y-4">
      {/* Year pills — centered */}
      {filteredHierarchy.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">Year</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {filteredHierarchy.map((year) => (
              <button
                key={year.id}
                className={`${selectedYearId === year.id ? pillActive : pillInactive} flex items-center gap-1.5`}
                onClick={() => setSelectedYearId(year.id)}
              >
                {year.name}
                <span className={`flex items-center gap-0.5 text-[10px] px-1.5 rounded-full ${selectedYearId === year.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/60 text-muted-foreground'}`}>
                  <Eye className="w-2.5 h-2.5" />
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

      {/* ── Doctor Management ── */}
      {selectedModule && doctorStats.size > 0 && (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Doctors in this Module
            </p>
            <span className="text-xs text-muted-foreground">{doctorStats.size} doctor{doctorStats.size !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-border/50">
            {[...doctorStats.entries()].sort((a, b) => b[1].votes - a[1].votes).map(([doc, { count, votes }]) => (
              <div key={doc} className="flex items-center gap-3 px-4 py-2.5">
                {editingDoctor === doc ? (
                  <>
                    <Input
                      value={editDoctorName}
                      onChange={(e) => setEditDoctorName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameDoctor(doc, editDoctorName);
                        if (e.key === 'Escape') { setEditingDoctor(null); setEditDoctorName(''); }
                      }}
                    />
                    <Button size="sm" className="h-7 px-2" onClick={() => renameDoctor(doc, editDoctorName)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingDoctor(null); setEditDoctorName(''); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : removingDoctor === doc ? (
                  <>
                    <span className="text-sm text-muted-foreground flex-1">Remove <span className="font-medium text-foreground">"{doc}"</span> from all {count} lecture{count !== 1 ? 's' : ''}?</span>
                    <Button size="sm" variant="destructive" className="h-7 px-2 gap-1 text-xs" onClick={() => removeDoctor(doc)}>
                      <Check className="w-3.5 h-3.5" />Yes
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setRemovingDoctor(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium flex-1">{doc}</span>
                    <span className="text-xs text-muted-foreground">{count} video{count !== 1 ? 's' : ''}</span>
                    {votes > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        👍 {votes}
                      </span>
                    )}
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => { setEditingDoctor(doc); setEditDoctorName(doc); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRemovingDoctor(doc)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
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

  // Mode toggle
  const [mode, setMode] = useState<'link' | 'upload'>('link');

  // Selection state — three-level: year → module → chapter
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  // Shared metadata
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');

  // Link mode
  const [linkUrl, setLinkUrl] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);

  // Upload mode
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Derived options
  const yearOptions = hierarchy;
  const moduleOptions = hierarchy.find((y) => y.id === selectedYearId)?.modules ?? [];
  const chapterOptions = moduleOptions.find((m) => m.id === selectedModuleId)?.chapters ?? [];

  const isUploading = ['initiating', 'uploading', 'finalizing'].includes(uploadStatus);

  const handleLinkSave = async () => {
    if (!title.trim()) { toast.error('Please enter a video title.'); return; }
    if (!selectedChapterId) { toast.error('Please select a chapter.'); return; }
    const normalizedUrl = normalizeVideoInput(linkUrl);
    if (normalizedUrl && !isValidVideoUrl(normalizedUrl)) {
      toast.error('Invalid video URL. Please use a YouTube or Google Drive link.');
      return;
    }
    setLinkSaving(true);
    try {
      const { error } = await supabase.from('lectures').insert({
        title: title.trim(),
        description: doctor.trim() || null,
        video_url: normalizedUrl || null,
        chapter_id: selectedChapterId,
        module_id: selectedModuleId || null,
      });
      if (error) throw error;
      toast.success('Lecture linked successfully!');
      queryClient.invalidateQueries({ queryKey: ['videos-hierarchy'] });
      handleReset();
    } catch (err) {
      toast.error(`Failed to save: ${(err as Error).message}`);
    } finally {
      setLinkSaving(false);
    }
  };

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
      const supabaseUrl = SUPABASE_URL;

      await uploadVideoToStorage({
        file,
        storagePath,
        supabaseUrl,
        accessToken: session?.access_token ?? '',
        onProgress: setUploadProgress,
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
            doctor: doctor.trim() || null,
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
    setLinkUrl('');
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
        <CardTitle className="text-base">Add Video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Mode toggle */}
        <div className="flex rounded-lg border p-1 gap-1">
          <button
            onClick={() => setMode('link')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'link' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link className="w-4 h-4" />
            Link Video
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload to YouTube
          </button>
        </div>

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

        {/* Form — hidden after upload done/error */}
        {(mode === 'link' || (uploadStatus !== 'done' && uploadStatus !== 'error')) && (
          <div className="space-y-3">
            {/* Video file — upload mode only */}
            {mode === 'upload' && (
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
            )}

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
                Doctor <span className="text-muted-foreground/60 font-normal">(optional)</span>
              </label>
              <Input
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="e.g. Dr. Ahmed…"
                disabled={isUploading}
              />
            </div>

            {/* Link mode: Video URL */}
            {mode === 'link' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video URL</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="YouTube or Google Drive link"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports YouTube and Google Drive. Drive videos must be shared as "Anyone with the link can view".
                </p>
              </div>
            )}

            {/* Upload mode: Description + Privacy + Progress */}
            {mode === 'upload' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video description (optional)…"
                    disabled={isUploading}
                  />
                </div>

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
              </>
            )}

            {/* Action button */}
            {mode === 'link' ? (
              <Button
                onClick={handleLinkSave}
                disabled={linkSaving || !title.trim() || !selectedChapterId}
                className="gap-2 w-full sm:w-auto"
              >
                {linkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                Save
              </Button>
            ) : (
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
            )}
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

export function VideosManagementTab({ allowedModuleIds }: { allowedModuleIds?: string[] }) {
  const { data: rawHierarchy, isLoading, error } = useVideosHierarchy();

  // Filter to allowed modules if scoped (module admin)
  const hierarchy = useMemo(() => {
    if (!rawHierarchy || !allowedModuleIds) return rawHierarchy;
    return rawHierarchy
      .map((year) => ({
        ...year,
        modules: year.modules.filter((m) => allowedModuleIds.includes(m.id)),
      }))
      .filter((year) => year.modules.length > 0);
  }, [rawHierarchy, allowedModuleIds]);

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

          {/* Upload Card */}
          <YouTubeUploadCard hierarchy={hierarchy || []} />

          {/* Curriculum Browser */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Curriculum Hierarchy
            </h3>
            {hierarchy && hierarchy.length > 0 ? (
              <CurriculumBrowser hierarchy={hierarchy} allowedModuleIds={allowedModuleIds} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No years found. Set up your curriculum first.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
