import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExaminerAvatars } from '@/lib/examinerAvatars';
import { useTTSVoices } from '@/lib/ttsVoices';
import { useGeminiVoices } from '@/lib/geminiVoices';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Stethoscope,
  MessageSquare,
  FlaskConical,
  ScanLine,
  Brain,
  Pill,
  Scissors,
  Activity,
  Heart,
  BookOpen,
  Shield,
  Check,
  X,
  PenLine,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { speakArabic, stopAllTTS } from '@/utils/tts';
import { useAISettings, getSettingValue } from '@/hooks/useAISettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CaseImageUpload } from './CaseImageUpload';
import {
  StructuredCaseData,
  SectionType,
  SECTION_LABELS,
  HistorySectionData,
  PhysicalExamSectionData,
  LabsSectionData,
  ImagingSectionData,
  DiagnosisSectionData,
  ManagementSectionData,
  MonitoringSectionData,
  AdviceSectionData,
  ConclusionSectionData,
} from '@/types/structuredCase';
import {
  useStructuredCaseDetail,
  useUpdateStructuredCaseData,
  usePublishStructuredCase,
} from '@/hooks/useStructuredCaseData';
import { useGenerateStructuredCase } from '@/hooks/useStructuredCase';
import { createEmptyCaseSkeleton } from '@/utils/createEmptyCaseSkeleton';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  history_taking: <MessageSquare className="w-4 h-4" />,
  physical_examination: <Stethoscope className="w-4 h-4" />,
  investigations_labs: <FlaskConical className="w-4 h-4" />,
  investigations_imaging: <ScanLine className="w-4 h-4" />,
  diagnosis: <Brain className="w-4 h-4" />,
  medical_management: <Pill className="w-4 h-4" />,
  surgical_management: <Scissors className="w-4 h-4" />,
  monitoring_followup: <Activity className="w-4 h-4" />,
  patient_family_advice: <Heart className="w-4 h-4" />,
  conclusion: <BookOpen className="w-4 h-4" />,
  professional_attitude: <Shield className="w-4 h-4" />,
};

export function CasePreviewEditor() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: caseData, isLoading } = useStructuredCaseDetail(caseId);
  const updateData = useUpdateStructuredCaseData();
  const publishCase = usePublishStructuredCase();
  const generateCase = useGenerateStructuredCase();
  const { data: dynamicAvatars } = useExaminerAvatars();

  const [editedData, setEditedData] = useState<StructuredCaseData | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(1);
  const [historyInteractionMode, setHistoryInteractionMode] = useState<'text' | 'voice'>('text');
  const [requestAvatarOpen, setRequestAvatarOpen] = useState(false);
  const [requestVoiceOpen, setRequestVoiceOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCooldown, setPreviewCooldown] = useState(false);
  const [enabledSections, setEnabledSections] = useState<SectionType[]>([]);

  const generatedData = caseData?.generated_case_data as StructuredCaseData | null;

  const { data: ttsVoices } = useTTSVoices();
  const { data: geminiVoices } = useGeminiVoices();
  const { data: aiSettings } = useAISettings();
  const globalTtsProvider = getSettingValue(aiSettings, 'tts_provider', 'browser') as string;

  // Build avatar list from database
  const avatarList = (dynamicAvatars || []).map(a => ({ id: a.id, name: a.name, image: a.image_url }));

  useEffect(() => {
    if (generatedData && !editedData) {
      const clone = structuredClone(generatedData);
      if ((clone as any).history_time_limit_minutes == null) {
        (clone as any).history_time_limit_minutes = 2;
      }
      setEditedData(clone);
    }
  }, [generatedData]);

  // Initialize avatar and interaction mode from case data
  useEffect(() => {
    if (caseData) {
      if (caseData.avatar_id) setSelectedAvatarId(caseData.avatar_id);
      setHistoryInteractionMode((caseData.history_interaction_mode as 'text' | 'voice') || 'text');
      if (caseData.active_sections) {
        setEnabledSections(caseData.active_sections as SectionType[]);
      }
    }
  }, [caseData]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateSection = (key: string, value: any) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!caseId || !editedData) return;
    try {
      await updateData.mutateAsync({
        caseId,
        data: editedData,
        avatar_id: selectedAvatarId,
        history_interaction_mode: historyInteractionMode,
        active_sections: enabledSections,
      });
      setHasChanges(false);
      toast.success('Case data saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  const getRequesterInfo = async () => {
    if (!user?.id) return { name: 'Unknown', email: '' };
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    return {
      name: profile?.full_name || profile?.email || 'Unknown',
      email: profile?.email || '',
    };
  };

  const handleRequestAvatar = async () => {
    if (!requestMessage.trim()) return;
    try {
      const requester = await getRequesterInfo();
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['platform_admin', 'super_admin']);

      if (admins?.length) {
        const notifications = admins.map(a => ({
          recipient_id: a.user_id,
          type: 'avatar_request',
          title: 'Avatar Request',
          message: `Request from ${requester.name} (${requester.email}): ${requestMessage.trim()}`,
          entity_type: 'examiner_avatar',
          metadata: { requested_by: user?.id, requester_name: requester.name, requester_email: requester.email, case_id: caseId },
        }));
        await supabase.from('admin_notifications').insert(notifications);
      }
      toast.success('Request sent to platform admins');
      setRequestAvatarOpen(false);
      setRequestMessage('');
    } catch {
      toast.error('Failed to send request');
    }
  };

  const handleRequestVoice = async () => {
    if (!requestMessage.trim()) return;
    try {
      const requester = await getRequesterInfo();
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['platform_admin', 'super_admin']);

      if (admins?.length) {
        const notifications = admins.map(a => ({
          recipient_id: a.user_id,
          type: 'voice_request',
          title: 'TTS Voice Request',
          message: `Request from ${requester.name} (${requester.email}): ${requestMessage.trim()}`,
          entity_type: 'tts_voice',
          metadata: { requested_by: user?.id, requester_name: requester.name, requester_email: requester.email, case_id: caseId },
        }));
        await supabase.from('admin_notifications').insert(notifications);
      }
      toast.success('Request sent to platform admins');
      setRequestVoiceOpen(false);
      setRequestMessage('');
    } catch {
      toast.error('Failed to send request');
    }
  };

  const handlePublish = async (publish: boolean) => {
    if (!caseId) return;
    try {
      await publishCase.mutateAsync({ caseId, publish });
      toast.success(publish ? 'Case published!' : 'Case unpublished');
    } catch {
      toast.error('Failed to update publish status');
    }
  };

  const handleGenerate = async () => {
    if (!caseId) return;
    try {
      toast.info('Generating case content with AI...');
      await generateCase.mutateAsync(caseId);
      setEditedData(null); // will re-load from query
      setHasChanges(false);
      toast.success('Case content generated!');
    } catch (err: any) {
      toast.error(err?.message || 'Generation failed');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Case not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin?tab=ai-cases')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const activeSections = enabledSections.length > 0 ? enabledSections : ((caseData.active_sections as SectionType[]) || []);
  const isPublished = caseData.is_published;

  // Compute total score from enabled sections
  const computeTotalScore = () => {
    if (!editedData) return 0;
    let total = editedData.professional_attitude?.max_score || 0;
    for (const key of enabledSections) {
      const section = editedData[key] as any;
      if (section?.max_score) total += section.max_score;
    }
    return total;
  };

  const toggleSectionEnabled = (key: SectionType) => {
    setEnabledSections(prev => {
      const next = prev.includes(key)
        ? prev.filter(s => s !== key)
        : [...prev, key];
      setHasChanges(true);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{caseData.title}</h1>
          <p className="text-muted-foreground mt-1 line-clamp-2">{caseData.chief_complaint || caseData.intro_text}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{caseData.level}</Badge>
            {caseData.module?.name && <Badge variant="secondary">{caseData.module.name}</Badge>}
            {caseData.chapter?.title && (
              <Badge variant="secondary">Ch {caseData.chapter.chapter_number}: {caseData.chapter.title}</Badge>
            )}
            <Badge variant={isPublished ? 'default' : 'secondary'}>
              {isPublished ? <><Eye className="w-3 h-3 mr-1" /> Published</> : <><EyeOff className="w-3 h-3 mr-1" /> Draft</>}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!generatedData && !editedData && (
            <Button onClick={handleGenerate} disabled={generateCase.isPending}>
              {generateCase.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate with AI
            </Button>
          )}
          {(generatedData || editedData) && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generateCase.isPending}
                size="sm"
              >
                {generateCase.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!hasChanges || updateData.isPending}
                size="sm"
              >
                {updateData.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button
                size="sm"
                variant={isPublished ? 'secondary' : 'default'}
                onClick={() => handlePublish(!isPublished)}
                disabled={publishCase.isPending}
              >
                {publishCase.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {isPublished ? 'Unpublish' : 'Publish'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Avatar Picker + History Interaction Mode */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Examiner Avatar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {avatarList.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setSelectedAvatarId(a.id); setHasChanges(true); }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                    selectedAvatarId === a.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-muted-foreground/20'
                  )}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={a.image} alt={a.name} />
                    <AvatarFallback>{a.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center truncate w-full">{a.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRequestAvatarOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Can't find the right avatar? Contact platform admin
            </button>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">History Interaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={historyInteractionMode}
              onValueChange={(v) => { setHistoryInteractionMode(v as 'text' | 'voice'); setHasChanges(true); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text History</SelectItem>
                <SelectItem value="voice">Voice History</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {historyInteractionMode === 'text'
                ? 'Student types questions to the patient'
                : 'Student speaks via microphone'}
            </p>

            {/* Patient Tone */}
            {editedData && (
              <div>
                <Label className="text-xs">Patient Tone</Label>
                <Select
                  value={editedData.patient?.tone || 'calm'}
                  onValueChange={(v) => {
                    setEditedData({
                      ...editedData,
                      patient: { ...editedData.patient, tone: v },
                    });
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Tone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calm">😌 Calm</SelectItem>
                    <SelectItem value="worried">😟 Worried</SelectItem>
                    <SelectItem value="anxious">😰 Anxious</SelectItem>
                    <SelectItem value="angry">😠 Angry</SelectItem>
                    <SelectItem value="impolite">😤 Impolite</SelectItem>
                    <SelectItem value="in_pain">😣 In Pain</SelectItem>
                    <SelectItem value="cooperative">🙂 Cooperative</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Affects AI text style &amp; voice playback
                </p>
              </div>
            )}

            {/* Voice Character */}
            {editedData && globalTtsProvider === 'gemini' && (
                <div>
                  <Label className="text-xs">Voice Character</Label>
                  <Select
                    value={(editedData as any).patient?.voice_provider === 'gemini' ? ((editedData as any).patient?.voice_id || '__default__') : '__default__'}
                    onValueChange={(v) => {
                      setEditedData({
                        ...editedData,
                        patient: {
                          ...editedData.patient,
                          voice_id: v === '__default__' ? '' : v,
                          voice_provider: v === '__default__' ? '' : 'gemini',
                        },
                      } as any);
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Use global default" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const males = (geminiVoices || []).filter(v => v.gender === 'male');
                        const females = (geminiVoices || []).filter(v => v.gender === 'female');
                        return (
                          <>
                            <SelectItem value="__default__">Global Default</SelectItem>
                            {males.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Male Voices</SelectLabel>
                                {males.map(v => (
                                  <SelectItem key={v.id} value={v.name}>
                                    {v.name} {v.label ? `— ${v.label}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {females.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Female Voices</SelectLabel>
                                {females.map(v => (
                                  <SelectItem key={v.id} value={v.name}>
                                    {v.name} {v.label ? `— ${v.label}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Gemini voice — select any active voice from the registry
                  </p>
                </div>
            )}

            {editedData && globalTtsProvider === 'elevenlabs' && (
                <div>
                  <Label className="text-xs">Voice Character</Label>
                  <Select
                    value={(editedData as any).patient?.voice_provider === 'elevenlabs' ? ((editedData as any).patient?.voice_id || '__default__') : '__default__'}
                    onValueChange={(v) => {
                      setEditedData({
                        ...editedData,
                        patient: {
                          ...editedData.patient,
                          voice_id: v === '__default__' ? '' : v,
                          voice_provider: v === '__default__' ? '' : 'elevenlabs',
                        },
                      } as any);
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Use global default" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const males = (ttsVoices || []).filter(v => v.gender === 'male');
                        const females = (ttsVoices || []).filter(v => v.gender === 'female');
                        return (
                          <>
                            <SelectItem value="__default__">Global Default</SelectItem>
                            {males.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Male Voices</SelectLabel>
                                {males.map(v => (
                                  <SelectItem key={v.id} value={v.elevenlabs_voice_id}>
                                    {v.name} {v.label ? `— ${v.label}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {females.length > 0 && (
                              <SelectGroup>
                                <SelectLabel>Female Voices</SelectLabel>
                                {females.map(v => (
                                  <SelectItem key={v.id} value={v.elevenlabs_voice_id}>
                                    {v.name} {v.label ? `— ${v.label}` : ''}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        if (isPreviewPlaying) {
                          stopAllTTS();
                          setIsPreviewPlaying(false);
                          return;
                        }
                        const voiceId = (editedData as any).patient?.voice_provider === 'elevenlabs'
                          ? ((editedData as any).patient?.voice_id || '')
                          : '';
                        if (!voiceId) {
                          toast.info('Select a voice first (not Global Default)');
                          return;
                        }
                        const tone = editedData?.patient?.tone || 'calm';
                        setIsPreviewPlaying(true);
                        try {
                          await speakArabic(
                            'مرحباً يا دكتور، أنا عندي مشكلة عايز أقولك عليها',
                            'elevenlabs',
                            voiceId,
                            tone as any,
                          );
                        } catch {
                          toast.error('Voice preview failed');
                        } finally {
                          setIsPreviewPlaying(false);
                          setPreviewCooldown(true);
                          setTimeout(() => setPreviewCooldown(false), 60000);
                        }
                      }}
                      disabled={previewCooldown}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-500 ${
                        previewCooldown
                          ? 'text-muted-foreground/40 cursor-not-allowed'
                          : 'text-primary hover:text-primary/80'
                      }`}
                    >
                      {isPreviewPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      {isPreviewPlaying ? 'Stop' : previewCooldown ? 'Wait ~1 min…' : 'Preview voice'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {previewCooldown
                      ? 'Voice preview is temporarily paused to avoid rate limits. It will re-enable automatically in ~1 minute.'
                      : 'After each preview, the button will pause for ~1 min to stay within voice API limits.'}
                  </p>
                </div>
            )}

             {/* History Time Limit */}
             {editedData && (
               <div>
                 <Label className="text-xs">History Time Limit (minutes)</Label>
                 <Input
                   type="number"
                   min={1}
                   max={30}
                   value={(editedData as any).history_time_limit_minutes || ''}
                   onChange={(e) => {
                     const val = e.target.value ? parseInt(e.target.value) : undefined;
                     setEditedData({
                       ...editedData,
                       history_time_limit_minutes: val,
                     } as any);
                     setHasChanges(true);
                   }}
                   placeholder="Default: 2 min"
                   className="mt-1"
                 />
                 <p className="text-[10px] text-muted-foreground mt-1">
                   Override the auto-calculated time limit for history taking
                 </p>
                 <button
                   type="button"
                   onClick={() => setRequestVoiceOpen(true)}
                   className="text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
                 >
                   Can't find the right voice? Contact <span className="underline">platform admin</span>
                 </button>
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Request Avatar Dialog */}
      <Dialog open={requestAvatarOpen} onOpenChange={setRequestAvatarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request New Avatar</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe the avatar you need..."
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestAvatarOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestAvatar} disabled={!requestMessage.trim()}>Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Voice Dialog */}
      <Dialog open={requestVoiceOpen} onOpenChange={setRequestVoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request New Voice</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe the voice you need (e.g. an elderly male Egyptian voice)..."
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestVoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestVoice} disabled={!requestMessage.trim()}>Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Info Editor */}
      {editedData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patient Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={editedData.patient?.name || ''}
                  onChange={(e) => {
                    setEditedData({
                      ...editedData,
                      patient: { ...editedData.patient, name: e.target.value },
                    });
                    setHasChanges(true);
                  }}
                  placeholder="Patient name"
                />
              </div>
              <div>
                <Label className="text-xs">Age</Label>
                <Input
                  type="number"
                  value={editedData.patient?.age || ''}
                  onChange={(e) => {
                    setEditedData({
                      ...editedData,
                      patient: { ...editedData.patient, age: parseInt(e.target.value) || '' },
                    });
                    setHasChanges(true);
                  }}
                  placeholder="Age"
                />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <Select
                  value={editedData.patient?.gender || ''}
                  onValueChange={(v) => {
                    setEditedData({
                      ...editedData,
                      patient: { ...editedData.patient, gender: v },
                    });
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Occupation</Label>
                <Input
                  value={editedData.patient?.occupation || ''}
                  onChange={(e) => {
                    setEditedData({
                      ...editedData,
                      patient: { ...editedData.patient, occupation: e.target.value },
                    });
                    setHasChanges(true);
                  }}
                  placeholder="Occupation"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Background</Label>
                <Input
                  value={editedData.patient?.background || ''}
                  onChange={(e) => {
                    setEditedData({
                      ...editedData,
                      patient: { ...editedData.patient, background: e.target.value },
                    });
                    setHasChanges(true);
                  }}
                  placeholder="Brief background"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No content yet — two options */}
      {!generatedData && !editedData && !generateCase.isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-dashed hover:border-primary/40 transition-colors cursor-pointer" onClick={handleGenerate}>
            <CardContent className="py-10 text-center">
              <Sparkles className="w-10 h-10 mx-auto text-primary mb-3" />
              <h3 className="font-semibold text-base mb-1">Generate with AI</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                AI creates the full case content from your configuration and chapter PDF.
              </p>
            </CardContent>
          </Card>
          <Card
            className="border-dashed hover:border-primary/40 transition-colors cursor-pointer"
            onClick={async () => {
              const skeleton = createEmptyCaseSkeleton(activeSections);
              setEditedData(skeleton);
              setHasChanges(true);
              if (caseId) {
                try {
                  await updateData.mutateAsync({ caseId, data: skeleton });
                  toast.success('Empty case template created — start filling in the sections');
                } catch {
                  toast.error('Failed to save template');
                }
              }
            }}
          >
            <CardContent className="py-10 text-center">
              <PenLine className="w-10 h-10 mx-auto text-primary mb-3" />
              <h3 className="font-semibold text-base mb-1">Build Manually</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Start from an empty template and fill in each section by hand.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {generateCase.isPending && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <h3 className="font-semibold text-lg mb-2">Generating Case Content...</h3>
            <p className="text-muted-foreground">This may take 30–60 seconds. Please wait.</p>
          </CardContent>
        </Card>
      )}

      {/* Section editors */}
      {editedData && !generateCase.isPending && (
        <div className="space-y-3">
          {/* Total Score Bar */}
          <Card className="bg-muted/30">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <span className="text-sm font-medium">Total Case Score</span>
              <Badge variant="default" className="text-base px-3 py-1">
                {computeTotalScore()} pts
              </Badge>
            </CardContent>
          </Card>

          {/* Professional Attitude (always enabled) */}
          {editedData.professional_attitude && (
            <SectionPanel
              sectionKey="professional_attitude"
              label="Professional Attitude"
              icon={SECTION_ICONS.professional_attitude}
              isOpen={openSections.has('professional_attitude')}
              onToggle={() => toggleSection('professional_attitude')}
              maxScore={editedData.professional_attitude.max_score}
              onMaxScoreChange={(val) => updateSection('professional_attitude', {
                ...editedData.professional_attitude,
                max_score: val,
              })}
            >
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Scoring Note</Label>
                  <Textarea
                    value={editedData.professional_attitude.scoring_note}
                    onChange={e => updateSection('professional_attitude', {
                      ...editedData.professional_attitude,
                      scoring_note: e.target.value,
                    })}
                    rows={2}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Checklist Items ({editedData.professional_attitude.items.length})</Label>
                  <div className="mt-1 space-y-1">
                    {editedData.professional_attitude.items.map((item, i) => (
                      <div key={item.key} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <Input
                          value={item.label}
                          onChange={e => {
                            const items = [...editedData.professional_attitude!.items];
                            items[i] = { ...items[i], label: e.target.value };
                            updateSection('professional_attitude', { ...editedData.professional_attitude, items });
                          }}
                          className="flex-1 h-7 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const items = editedData.professional_attitude!.items.filter((_, idx) => idx !== i);
                            updateSection('professional_attitude', { ...editedData.professional_attitude, items });
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => {
                      const items = [...editedData.professional_attitude!.items, {
                        key: `pa_${Date.now()}`,
                        label: 'New item',
                      }];
                      updateSection('professional_attitude', { ...editedData.professional_attitude, items });
                    }}
                  >
                    + Add item
                  </Button>
                </div>
              </div>
            </SectionPanel>
          )}

          {/* All possible sections with enable/disable toggle */}
          {activeSections.map(sectionKey => {
            const sectionData = editedData[sectionKey];
            if (!sectionData) return null;
            const isEnabled = enabledSections.includes(sectionKey);

            return (
              <div
                key={sectionKey}
                className={cn(
                  'transition-opacity',
                  !isEnabled && 'opacity-40'
                )}
              >
                <SectionPanel
                  sectionKey={sectionKey}
                  label={SECTION_LABELS[sectionKey]}
                  icon={SECTION_ICONS[sectionKey]}
                  isOpen={isEnabled && openSections.has(sectionKey)}
                  onToggle={() => isEnabled && toggleSection(sectionKey)}
                  maxScore={(sectionData as any).max_score}
                  onMaxScoreChange={(val) => updateSection(sectionKey, { ...sectionData, max_score: val })}
                  enableSwitch={
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleSectionEnabled(sectionKey)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <SectionEditor
                    sectionKey={sectionKey}
                    data={sectionData}
                    onChange={val => updateSection(sectionKey, val)}
                  />
                </SectionPanel>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section Panel wrapper ────────────────────────────
interface SectionPanelProps {
  sectionKey: string;
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  maxScore?: number;
  onMaxScoreChange?: (val: number) => void;
  enableSwitch?: React.ReactNode;
  children: React.ReactNode;
}

function SectionPanel({ label, icon, isOpen, onToggle, maxScore, onMaxScoreChange, enableSwitch, children }: SectionPanelProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="text-muted-foreground">{icon}</span>
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {maxScore != null && onMaxScoreChange ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">Max:</span>
                    <Input
                      type="number"
                      value={maxScore}
                      onChange={e => onMaxScoreChange(parseInt(e.target.value) || 0)}
                      className="w-16 h-7 text-xs text-center"
                      min={0}
                    />
                  </div>
                ) : maxScore != null ? (
                  <Badge variant="outline" className="text-xs">Max: {maxScore}</Badge>
                ) : null}
                {enableSwitch}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Section-specific editor ──────────────────────────
interface SectionEditorProps {
  sectionKey: SectionType;
  data: any;
  onChange: (val: any) => void;
}

function SectionEditor({ sectionKey, data, onChange }: SectionEditorProps) {
  switch (sectionKey) {
    case 'history_taking':
      return <HistoryEditor data={data} onChange={onChange} />;
    case 'physical_examination':
      return <PhysicalExamEditor data={data} onChange={onChange} />;
    case 'investigations_labs':
      return <LabsEditor data={data} onChange={onChange} />;
    case 'investigations_imaging':
      return <ImagingEditor data={data} onChange={onChange} />;
    case 'diagnosis':
      return <DiagnosisEditor data={data} onChange={onChange} />;
    case 'medical_management':
    case 'surgical_management':
      return <ManagementEditor data={data} onChange={onChange} />;
    case 'monitoring_followup':
      return <MonitoringEditor data={data} onChange={onChange} />;
    case 'patient_family_advice':
      return <AdviceEditor data={data} onChange={onChange} />;
    case 'conclusion':
      return <ConclusionEditor data={data} onChange={onChange} />;
    default:
      return <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ── Individual Section Editors ───────────────────────

function HistoryEditor({ data, onChange }: { data: HistorySectionData; onChange: (v: any) => void }) {
  const updateAtmist = (field: string, value: string) => {
    onChange({ ...data, atmist_handover: { ...data.atmist_handover, [field]: value } });
  };
  const updateChecklistItem = (catIdx: number, itemIdx: number, label: string) => {
    const checklist = structuredClone(data.checklist || []);
    checklist[catIdx].items[itemIdx] = { ...checklist[catIdx].items[itemIdx], label };
    onChange({ ...data, checklist });
  };
  const removeChecklistItem = (catIdx: number, itemIdx: number) => {
    const checklist = structuredClone(data.checklist || []);
    checklist[catIdx].items.splice(itemIdx, 1);
    onChange({ ...data, checklist });
  };
  const addChecklistItem = (catIdx: number) => {
    const checklist = structuredClone(data.checklist || []);
    checklist[catIdx].items.push({ key: `item_${Date.now()}`, label: 'New item' });
    onChange({ ...data, checklist });
  };
  const addCategory = () => {
    const checklist = structuredClone(data.checklist || []);
    checklist.push({ key: `cat_${Date.now()}`, label: 'New Category', items: [] });
    onChange({ ...data, checklist });
  };
  const removeCategory = (catIdx: number) => {
    const checklist = structuredClone(data.checklist || []);
    checklist.splice(catIdx, 1);
    onChange({ ...data, checklist });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Mode</Label>
        <Badge variant="outline" className="ml-2 text-xs">{data.mode}</Badge>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">English Reference (for chat)</Label>
        <Textarea
          value={data.english_reference || ''}
          onChange={e => onChange({ ...data, english_reference: e.target.value })}
          placeholder="Enter the English reference summary for the conversation..."
          className="mt-1 min-h-[100px] text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Arabic Reference (للمحادثة)</Label>
        <Textarea
          dir="rtl"
          value={data.arabic_reference || ''}
          onChange={e => onChange({ ...data, arabic_reference: e.target.value })}
          placeholder="أدخل النص العربي المرجعي للمحادثة هنا..."
          className="mt-1 min-h-[100px] text-sm"
        />
      </div>
      {data.atmist_handover && (
        <div>
          <Label className="text-xs text-muted-foreground">ATMIST Handover</Label>
          <div className="mt-1 space-y-2 bg-muted/50 rounded p-3">
            {Object.entries(data.atmist_handover).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Label className="text-xs font-semibold capitalize w-24 shrink-0">{k.replace('_', ' ')}</Label>
                <Input value={v} onChange={e => updateAtmist(k, e.target.value)} className="h-7 text-sm flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs text-muted-foreground">Checklist ({data.checklist?.length || 0} categories)</Label>
        <div className="mt-1 space-y-2">
          {(data.checklist || []).map((cat, catIdx) => (
            <div key={cat.key} className="border rounded p-2">
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={cat.label}
                  onChange={e => {
                    const checklist = structuredClone(data.checklist || []);
                    checklist[catIdx] = { ...checklist[catIdx], label: e.target.value };
                    onChange({ ...data, checklist });
                  }}
                  className="h-7 text-sm font-medium flex-1"
                />
                <button type="button" onClick={() => removeCategory(catIdx)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {cat.items.map((item, itemIdx) => (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    <Input
                      value={item.label}
                      onChange={e => updateChecklistItem(catIdx, itemIdx, e.target.value)}
                      className="h-7 text-sm flex-1"
                    />
                    <button type="button" onClick={() => removeChecklistItem(catIdx, itemIdx)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => addChecklistItem(catIdx)}>
                + Add item
              </Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={addCategory}>
          + Add category
        </Button>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Comprehension Questions ({data.comprehension_questions?.length || 0})</Label>
        <div className="mt-1 space-y-2">
          {(data.comprehension_questions || []).map((q, i) => (
            <div key={q.id} className="border rounded p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Q{i + 1}</span>
                <Input
                  value={q.question}
                  onChange={e => {
                    const qs = structuredClone(data.comprehension_questions || []);
                    qs[i] = { ...qs[i], question: e.target.value };
                    onChange({ ...data, comprehension_questions: qs });
                  }}
                  className="h-7 text-sm flex-1"
                />
                <Input
                  type="number"
                  value={q.points}
                  onChange={e => {
                    const qs = structuredClone(data.comprehension_questions || []);
                    qs[i] = { ...qs[i], points: parseInt(e.target.value) || 0 };
                    onChange({ ...data, comprehension_questions: qs });
                  }}
                  className="w-16 h-7 text-xs"
                  min={0}
                />
                <span className="text-xs text-muted-foreground">pts</span>
                <button type="button" onClick={() => {
                  const qs = (data.comprehension_questions || []).filter((_, idx) => idx !== i);
                  onChange({ ...data, comprehension_questions: qs });
                }} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0 w-8">Ans</span>
                <Input
                  value={q.correct_answer}
                  onChange={e => {
                    const qs = structuredClone(data.comprehension_questions || []);
                    qs[i] = { ...qs[i], correct_answer: e.target.value };
                    onChange({ ...data, comprehension_questions: qs });
                  }}
                  className="h-7 text-sm flex-1"
                />
              </div>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => {
          const qs = [...(data.comprehension_questions || []), { id: `cq_${Date.now()}`, question: '', correct_answer: '', points: 1 }];
          onChange({ ...data, comprehension_questions: qs });
        }}>
          + Add question
        </Button>
      </div>
    </div>
  );
}

function PhysicalExamEditor({ data, onChange }: { data: PhysicalExamSectionData; onChange: (v: any) => void }) {
  const findingsEntries = Object.entries(data.findings || data.regions || {});
  const updateFinding = (key: string, field: string, value: any) => {
    const findings = { ...(data.findings || data.regions || {}) };
    findings[key] = { ...findings[key], [field]: value };
    onChange({ ...data, findings });
  };
  const updateVital = (regionKey: string, vitalIdx: number, field: string, value: any) => {
    const findings = structuredClone(data.findings || {}) as any;
    const region = findings[regionKey];
    if (region?.vitals) {
      region.vitals[vitalIdx] = { ...region.vitals[vitalIdx], [field]: value };
      onChange({ ...data, findings });
    }
  };

  return (
    <div className="space-y-2">
      {data.note && (
        <div>
          <Label className="text-xs text-muted-foreground">Note</Label>
          <Input value={data.note} onChange={e => onChange({ ...data, note: e.target.value })} className="h-7 text-sm mt-1" />
        </div>
      )}
      <Label className="text-xs text-muted-foreground">Findings ({findingsEntries.length} regions)</Label>
      <div className="space-y-2">
        {findingsEntries.map(([key, finding]: [string, any]) => (
          <div key={key} className="p-2 rounded text-sm bg-muted/50 space-y-2">
            <span className="font-medium capitalize text-xs">{key.replace(/_/g, ' ')}</span>
            {finding.vitals && (
              <div className="space-y-1">
                {finding.vitals.map((v: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input value={v.name} onChange={e => updateVital(key, i, 'name', e.target.value)} className="h-6 text-xs w-24" />
                    <Input value={v.value} onChange={e => updateVital(key, i, 'value', e.target.value)} className="h-6 text-xs w-16" />
                    <Input value={v.unit} onChange={e => updateVital(key, i, 'unit', e.target.value)} className="h-6 text-xs w-16" />
                    <Switch checked={v.abnormal} onCheckedChange={val => updateVital(key, i, 'abnormal', val)} />
                    <span className="text-[10px] text-muted-foreground">Abnormal</span>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={finding.text || finding.finding || ''}
              onChange={e => updateFinding(key, finding.text !== undefined ? 'text' : 'finding', e.target.value)}
              rows={2}
              className="text-sm"
            />
            {finding.ref !== undefined && (
              <Input value={finding.ref || ''} onChange={e => updateFinding(key, 'ref', e.target.value)} placeholder="Reference" className="h-7 text-xs" />
            )}
            <CaseImageUpload
              imageUrls={(finding as any).image_urls || []}
              onChange={urls => updateFinding(key, 'image_urls', urls)}
              maxImages={2}
              label="Region Photos"
            />
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Related Topics ({data.related_topics?.length || 0})</Label>
        <div className="mt-1 space-y-1">
          {(data.related_topics || []).map((t, i) => (
            <div key={t.key} className="flex items-center gap-2">
              <Input
                value={t.label}
                onChange={e => {
                  const topics = structuredClone(data.related_topics || []);
                  topics[i] = { ...topics[i], label: e.target.value };
                  onChange({ ...data, related_topics: topics });
                }}
                className="h-7 text-xs flex-1"
              />
              <button type="button" onClick={() => {
                const topics = (data.related_topics || []).filter((_, idx) => idx !== i);
                onChange({ ...data, related_topics: topics });
              }} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => {
          const topics = [...(data.related_topics || []), { key: `topic_${Date.now()}`, label: 'New topic', title: '', chapter: '', body: '', quote: '' }];
          onChange({ ...data, related_topics: topics });
        }}>
          + Add topic
        </Button>
      </div>
    </div>
  );
}

function LabsEditor({ data, onChange }: { data: LabsSectionData; onChange: (v: any) => void }) {
  const testEntries = Object.entries(data.available_tests || {});
  const updateTest = (testKey: string, field: string, value: any) => {
    const tests = { ...data.available_tests };
    tests[testKey] = { ...tests[testKey], [field]: value };
    onChange({ ...data, available_tests: tests });
  };
  const removeTest = (testKey: string) => {
    const tests = { ...data.available_tests };
    delete tests[testKey];
    const keyTests = (data.key_tests || []).filter(t => t !== testKey);
    onChange({ ...data, available_tests: tests, key_tests: keyTests });
  };
  const addTest = () => {
    const key = `test_${Date.now()}`;
    const tests = { ...data.available_tests, [key]: { label: 'New Test', result: '', interpretation: '', is_key: false, points: 1 } };
    onChange({ ...data, available_tests: tests });
  };
  const toggleKeyTest = (testKey: string, isKey: boolean) => {
    updateTest(testKey, 'is_key', isKey);
    let keyTests = [...(data.key_tests || [])];
    if (isKey && !keyTests.includes(testKey)) keyTests.push(testKey);
    else if (!isKey) keyTests = keyTests.filter(t => t !== testKey);
    onChange({ ...data, available_tests: { ...data.available_tests, [testKey]: { ...data.available_tests[testKey], is_key: isKey } }, key_tests: keyTests });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Available Tests ({testEntries.length})</Label>
      <div className="mt-1 space-y-2">
        {testEntries.map(([key, test]) => (
          <div key={key} className={cn('p-2 rounded text-sm space-y-1.5', test.is_key ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50')}>
            <div className="flex items-center gap-2">
              <Input value={test.label} onChange={e => updateTest(key, 'label', e.target.value)} className="h-7 text-sm flex-1 font-medium" />
              <div className="flex items-center gap-1">
                <Switch checked={test.is_key} onCheckedChange={val => toggleKeyTest(key, val)} />
                <span className="text-[10px] text-muted-foreground">Key</span>
              </div>
              <Input type="number" value={test.points} onChange={e => updateTest(key, 'points', parseInt(e.target.value) || 0)} className="w-14 h-7 text-xs" min={0} />
              <span className="text-xs text-muted-foreground">pts</span>
              <button type="button" onClick={() => removeTest(key)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={test.result} onChange={e => updateTest(key, 'result', e.target.value)} placeholder="Result" className="h-7 text-sm" />
            <Input value={test.interpretation} onChange={e => updateTest(key, 'interpretation', e.target.value)} placeholder="Interpretation" className="h-7 text-sm" />
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="text-xs" onClick={addTest}>
        + Add test
      </Button>
    </div>
  );
}

function ImagingEditor({ data, onChange }: { data: ImagingSectionData; onChange: (v: any) => void }) {
  const imagingEntries = Object.entries(data.available_imaging || {});
  const updateStudy = (studyKey: string, field: string, value: any) => {
    const imaging = { ...data.available_imaging };
    imaging[studyKey] = { ...imaging[studyKey], [field]: value };
    onChange({ ...data, available_imaging: imaging });
  };
  const removeStudy = (studyKey: string) => {
    const imaging = { ...data.available_imaging };
    delete imaging[studyKey];
    const keyInvs = (data.key_investigations || []).filter(t => t !== studyKey);
    onChange({ ...data, available_imaging: imaging, key_investigations: keyInvs });
  };
  const addStudy = () => {
    const key = `img_${Date.now()}`;
    const imaging = { ...data.available_imaging, [key]: { label: 'New Imaging', result: '', interpretation: '', is_key: false, points: 1 } };
    onChange({ ...data, available_imaging: imaging });
  };
  const toggleKeyStudy = (studyKey: string, isKey: boolean) => {
    updateStudy(studyKey, 'is_key', isKey);
    let keyInvs = [...(data.key_investigations || [])];
    if (isKey && !keyInvs.includes(studyKey)) keyInvs.push(studyKey);
    else if (!isKey) keyInvs = keyInvs.filter(t => t !== studyKey);
    onChange({ ...data, available_imaging: { ...data.available_imaging, [studyKey]: { ...data.available_imaging[studyKey], is_key: isKey } }, key_investigations: keyInvs });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Available Imaging ({imagingEntries.length})</Label>
      <div className="mt-1 space-y-2">
        {imagingEntries.map(([key, study]) => (
          <div key={key} className={cn('p-2 rounded text-sm space-y-1.5', study.is_key ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50')}>
            <div className="flex items-center gap-2">
              <Input value={study.label} onChange={e => updateStudy(key, 'label', e.target.value)} className="h-7 text-sm flex-1 font-medium" />
              <div className="flex items-center gap-1">
                <Switch checked={study.is_key} onCheckedChange={val => toggleKeyStudy(key, val)} />
                <span className="text-[10px] text-muted-foreground">Key</span>
              </div>
              <Input type="number" value={study.points} onChange={e => updateStudy(key, 'points', parseInt(e.target.value) || 0)} className="w-14 h-7 text-xs" min={0} />
              <span className="text-xs text-muted-foreground">pts</span>
              <button type="button" onClick={() => removeStudy(key)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={study.result} onChange={e => updateStudy(key, 'result', e.target.value)} placeholder="Result" className="h-7 text-sm" />
            <Input value={study.interpretation} onChange={e => updateStudy(key, 'interpretation', e.target.value)} placeholder="Interpretation" className="h-7 text-sm" />
            <CaseImageUpload
              imageUrls={study.image_url ? [study.image_url] : []}
              onChange={urls => updateStudy(key, 'image_url', urls[0] || null)}
              maxImages={1}
              label="X-ray / CT / Report"
            />
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="text-xs" onClick={addStudy}>
        + Add imaging
      </Button>
    </div>
  );
}

function DiagnosisEditor({ data, onChange }: { data: DiagnosisSectionData; onChange: (v: any) => void }) {
  const rubric = data.rubric;
  const updateRubricItem = (key: string, field: string, value: any) => {
    onChange({ ...data, rubric: { ...rubric, [key]: { ...rubric[key as keyof typeof rubric], [field]: value } } });
  };
  return (
    <div className="space-y-3">
      {rubric && Object.entries(rubric).map(([key, item]) => (
        <div key={key} className="border rounded p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={item.label} onChange={e => updateRubricItem(key, 'label', e.target.value)} className="h-7 text-sm flex-1 font-medium" />
            <Input type="number" value={item.points} onChange={e => updateRubricItem(key, 'points', parseInt(e.target.value) || 0)} className="w-14 h-7 text-xs" min={0} />
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Model Answer</Label>
            <Textarea value={item.model_answer} onChange={e => updateRubricItem(key, 'model_answer', e.target.value)} rows={2} className="mt-1 text-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ManagementEditor({ data, onChange }: { data: ManagementSectionData; onChange: (v: any) => void }) {
  const questions = data.questions || [];
  const updateQuestion = (qi: number, field: string, value: any) => {
    const qs = structuredClone(questions);
    qs[qi] = { ...qs[qi], [field]: value };
    onChange({ ...data, questions: qs });
  };
  const updateOption = (qi: number, oi: number, value: string) => {
    const qs = structuredClone(questions);
    qs[qi].options![oi] = value;
    onChange({ ...data, questions: qs });
  };
  const removeQuestion = (qi: number) => {
    onChange({ ...data, questions: questions.filter((_, i) => i !== qi) });
  };
  const addQuestion = () => {
    const q = { id: `mq_${Date.now()}`, type: 'mcq' as const, question: '', options: ['A. ', 'B. ', 'C. ', 'D. '], correct: 'A', explanation: '', points: 1 };
    onChange({ ...data, questions: [...questions, q] });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Questions ({questions.length})</Label>
      <div className="mt-1 space-y-3">
        {questions.map((q, qi) => (
          <div key={q.id} className="border rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{q.type}</Badge>
              <Input type="number" value={q.points || q.rubric?.points || 0} onChange={e => updateQuestion(qi, 'points', parseInt(e.target.value) || 0)} className="w-14 h-7 text-xs" min={0} />
              <span className="text-xs text-muted-foreground">pts</span>
              <button type="button" onClick={() => removeQuestion(qi)} className="ml-auto text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Textarea value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} rows={2} className="text-sm" placeholder="Question text" />
            {q.type === 'mcq' && q.options && (
              <div className="space-y-1">
                {q.options.map((opt, oi) => {
                  const letter = opt.match(/^([A-Z])\./)?.[1];
                  const isCorrect = letter === q.correct;
                  return (
                    <div key={oi} className={cn('flex items-center gap-2 p-1.5 rounded text-sm', isCorrect ? 'bg-accent/50' : 'bg-muted/30')}>
                      <Input value={opt} onChange={e => updateOption(qi, oi, e.target.value)} className="h-7 text-sm flex-1" />
                      <button
                        type="button"
                        onClick={() => {
                          const l = opt.match(/^([A-Z])\./)?.[1];
                          if (l) updateQuestion(qi, 'correct', l);
                        }}
                        className={cn('text-xs px-2 py-0.5 rounded', isCorrect ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-foreground/10')}
                      >
                        {isCorrect ? '✓ Correct' : 'Set correct'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === 'free_text' && q.rubric && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model Answer</Label>
                <Textarea
                  value={q.rubric.model_answer}
                  onChange={e => {
                    const qs = structuredClone(questions);
                    qs[qi].rubric = { ...qs[qi].rubric!, model_answer: e.target.value };
                    onChange({ ...data, questions: qs });
                  }}
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}
            <Input value={q.explanation || ''} onChange={e => updateQuestion(qi, 'explanation', e.target.value)} placeholder="Explanation (optional)" className="h-7 text-xs" />
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="text-xs" onClick={addQuestion}>
        + Add question
      </Button>
    </div>
  );
}

function MonitoringEditor({ data, onChange }: { data: MonitoringSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Question</Label>
        <Textarea value={data.question} onChange={e => onChange({ ...data, question: e.target.value })} rows={2} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Model Answer</Label>
        <Textarea value={data.rubric?.model_answer || ''} onChange={e => onChange({ ...data, rubric: { ...data.rubric, model_answer: e.target.value } })} rows={3} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Expected Points ({data.rubric?.expected_points?.length || 0})</Label>
        <div className="mt-1 space-y-1">
          {(data.rubric?.expected_points || []).map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <Input
                value={p}
                onChange={e => {
                  const pts = [...(data.rubric?.expected_points || [])];
                  pts[i] = e.target.value;
                  onChange({ ...data, rubric: { ...data.rubric, expected_points: pts } });
                }}
                className="h-7 text-sm flex-1"
              />
              <button type="button" onClick={() => {
                const pts = (data.rubric?.expected_points || []).filter((_, idx) => idx !== i);
                onChange({ ...data, rubric: { ...data.rubric, expected_points: pts } });
              }} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => {
          const pts = [...(data.rubric?.expected_points || []), ''];
          onChange({ ...data, rubric: { ...data.rubric, expected_points: pts } });
        }}>
          + Add point
        </Button>
      </div>
    </div>
  );
}

function AdviceEditor({ data, onChange }: { data: AdviceSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Question</Label>
        <Textarea value={data.question} onChange={e => onChange({ ...data, question: e.target.value })} rows={2} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Model Answer</Label>
        <Textarea value={data.rubric?.model_answer || ''} onChange={e => onChange({ ...data, rubric: { ...data.rubric, model_answer: e.target.value } })} rows={3} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Expected Points ({data.rubric?.expected_points?.length || 0})</Label>
        <div className="mt-1 space-y-1">
          {(data.rubric?.expected_points || []).map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <Input
                value={p}
                onChange={e => {
                  const pts = [...(data.rubric?.expected_points || [])];
                  pts[i] = e.target.value;
                  onChange({ ...data, rubric: { ...data.rubric, expected_points: pts } });
                }}
                className="h-7 text-sm flex-1"
              />
              <button type="button" onClick={() => {
                const pts = (data.rubric?.expected_points || []).filter((_, idx) => idx !== i);
                onChange({ ...data, rubric: { ...data.rubric, expected_points: pts } });
              }} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => {
          const pts = [...(data.rubric?.expected_points || []), ''];
          onChange({ ...data, rubric: { ...data.rubric, expected_points: pts } });
        }}>
          + Add point
        </Button>
      </div>
    </div>
  );
}

function ConclusionEditor({ data, onChange }: { data: ConclusionSectionData; onChange: (v: any) => void }) {
  const tasks = data.tasks || [];
  const updateTask = (i: number, field: string, value: any) => {
    const ts = structuredClone(tasks);
    ts[i] = { ...ts[i], [field]: value };
    onChange({ ...data, tasks: ts });
  };
  const updateTaskRubric = (i: number, field: string, value: any) => {
    const ts = structuredClone(tasks);
    ts[i].rubric = { ...ts[i].rubric, [field]: value };
    onChange({ ...data, tasks: ts });
  };
  const removeTask = (i: number) => {
    onChange({ ...data, tasks: tasks.filter((_, idx) => idx !== i) });
  };
  const addTask = () => {
    const t = { id: `task_${Date.now()}`, type: 'learning_point' as const, label: 'New task', instruction: '', rubric: { model_answer: '', points: 1 } };
    onChange({ ...data, tasks: [...tasks, t] });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Tasks ({tasks.length})</Label>
      {tasks.map((task, i) => (
        <div key={task.id} className="border rounded p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{task.type.replace(/_/g, ' ')}</Badge>
            <Input value={task.label} onChange={e => updateTask(i, 'label', e.target.value)} className="h-7 text-sm flex-1 font-medium" />
            <Input type="number" value={task.rubric.points} onChange={e => updateTaskRubric(i, 'points', parseInt(e.target.value) || 0)} className="w-14 h-7 text-xs" min={0} />
            <span className="text-xs text-muted-foreground">pts</span>
            <button type="button" onClick={() => removeTask(i)} className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <Textarea value={task.instruction} onChange={e => updateTask(i, 'instruction', e.target.value)} rows={2} className="text-sm" placeholder="Instruction" />
          <div>
            <Label className="text-xs text-muted-foreground">Model Answer</Label>
            <Textarea value={task.rubric.model_answer} onChange={e => updateTaskRubric(i, 'model_answer', e.target.value)} rows={2} className="mt-1 text-sm" />
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-xs" onClick={addTask}>
        + Add task
      </Button>
    </div>
  );
}
