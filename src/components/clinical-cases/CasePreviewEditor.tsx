import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExaminerAvatars, EXAMINER_AVATARS } from '@/lib/examinerAvatars';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  const [requestMessage, setRequestMessage] = useState('');
  const [enabledSections, setEnabledSections] = useState<SectionType[]>([]);

  const generatedData = caseData?.generated_case_data as StructuredCaseData | null;

  // Build avatar list from dynamic or static
  const avatarList = dynamicAvatars?.length
    ? dynamicAvatars.map(a => ({ id: a.id, name: a.name, image: a.image_url }))
    : EXAMINER_AVATARS.map(a => ({ id: a.id, name: a.name, image: a.image }));

  useEffect(() => {
    if (generatedData && !editedData) {
      setEditedData(structuredClone(generatedData));
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
      });
      setHasChanges(false);
      toast.success('Case data saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleRequestAvatar = async () => {
    if (!requestMessage.trim()) return;
    try {
      // Insert notification for all platform_admin / super_admin
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['platform_admin', 'super_admin']);

      if (admins?.length) {
        const notifications = admins.map(a => ({
          recipient_id: a.user_id,
          type: 'avatar_request',
          title: 'Avatar Request',
          message: requestMessage.trim(),
          entity_type: 'examiner_avatar',
          metadata: { requested_by: user?.id, case_id: caseId },
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
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const activeSections = (caseData.active_sections as SectionType[]) || [];
  const isPublished = caseData.is_published;

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

        <Card className="sm:w-56">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">History Interaction</CardTitle>
          </CardHeader>
          <CardContent>
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
            <p className="text-xs text-muted-foreground mt-2">
              {historyInteractionMode === 'text'
                ? 'Student types questions to the patient'
                : 'Student speaks via microphone'}
            </p>
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
          {/* Professional Attitude */}
          {editedData.professional_attitude && (
            <SectionPanel
              sectionKey="professional_attitude"
              label="Professional Attitude"
              icon={SECTION_ICONS.professional_attitude}
              isOpen={openSections.has('professional_attitude')}
              onToggle={() => toggleSection('professional_attitude')}
              maxScore={editedData.professional_attitude.max_score}
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
                        <span className="flex-1">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionPanel>
          )}

          {/* Active sections */}
          {activeSections.map(sectionKey => {
            const sectionData = editedData[sectionKey];
            if (!sectionData) return null;

            return (
              <SectionPanel
                key={sectionKey}
                sectionKey={sectionKey}
                label={SECTION_LABELS[sectionKey]}
                icon={SECTION_ICONS[sectionKey]}
                isOpen={openSections.has(sectionKey)}
                onToggle={() => toggleSection(sectionKey)}
                maxScore={(sectionData as any).max_score}
              >
                <SectionEditor
                  sectionKey={sectionKey}
                  data={sectionData}
                  onChange={val => updateSection(sectionKey, val)}
                />
              </SectionPanel>
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
  children: React.ReactNode;
}

function SectionPanel({ label, icon, isOpen, onToggle, maxScore, children }: SectionPanelProps) {
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
              {maxScore != null && (
                <Badge variant="outline" className="text-xs">Max: {maxScore}</Badge>
              )}
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
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Mode</Label>
        <Badge variant="outline" className="ml-2 text-xs">{data.mode}</Badge>
      </div>
      {data.atmist_handover && (
        <div>
          <Label className="text-xs text-muted-foreground">ATMIST Handover</Label>
          <div className="mt-1 space-y-1 text-sm bg-muted/50 rounded p-3">
            {Object.entries(data.atmist_handover).map(([k, v]) => (
              <div key={k}><span className="font-semibold capitalize">{k.replace('_', ' ')}:</span> {v}</div>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs text-muted-foreground">Checklist ({data.checklist?.length || 0} categories)</Label>
        <div className="mt-1 space-y-2">
          {(data.checklist || []).map(cat => (
            <div key={cat.key} className="border rounded p-2">
              <p className="text-sm font-medium mb-1">{cat.label}</p>
              <div className="space-y-1">
                {cat.items.map(item => (
                  <div key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {data.comprehension_questions && data.comprehension_questions.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">Comprehension Questions ({data.comprehension_questions.length})</Label>
          <div className="mt-1 space-y-2">
            {data.comprehension_questions.map((q, i) => (
              <div key={q.id} className="border rounded p-2 text-sm">
                <p className="font-medium">Q{i + 1}: {q.question} ({q.points} pts)</p>
                <p className="text-muted-foreground mt-1">Answer: {q.correct_answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhysicalExamEditor({ data, onChange }: { data: PhysicalExamSectionData; onChange: (v: any) => void }) {
  const findingsEntries = Object.entries(data.findings || data.regions || {});
  return (
    <div className="space-y-2">
      {data.note && <p className="text-xs text-muted-foreground italic">{data.note}</p>}
      <Label className="text-xs text-muted-foreground">Findings ({findingsEntries.length} regions)</Label>
      <div className="space-y-1">
        {findingsEntries.map(([key, finding]: [string, any]) => (
          <div key={key} className="p-2 rounded text-sm bg-muted/50">
            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
            {finding.vitals && (
              <div className="flex flex-wrap gap-1 mt-1">
                {finding.vitals.map((v: any, i: number) => (
                  <Badge key={i} variant={v.abnormal ? 'destructive' : 'secondary'} className="text-[10px]">
                    {v.name}: {v.value} {v.unit}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-muted-foreground mt-0.5">{finding.text || finding.finding}</p>
            {finding.ref && (
              <p className="text-xs text-amber-700 mt-1 italic">{finding.ref}</p>
            )}
          </div>
        ))}
      </div>
      {data.related_topics && data.related_topics.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">Related Topics ({data.related_topics.length})</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.related_topics.map(t => (
              <Badge key={t.key} variant="outline" className="text-[10px]">{t.label}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LabsEditor({ data, onChange }: { data: LabsSectionData; onChange: (v: any) => void }) {
  const testEntries = Object.entries(data.available_tests || {});
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Key Tests</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {(data.key_tests || []).map((t, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Available Tests ({testEntries.length})</Label>
        <div className="mt-1 space-y-1">
          {testEntries.map(([key, test]) => (
            <div key={key} className={cn('p-2 rounded text-sm', test.is_key ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50')}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{test.label}</span>
                {test.is_key && <Badge variant="default" className="text-[10px]">Key</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{test.points} pts</span>
              </div>
              <p className="text-muted-foreground mt-0.5">{test.result}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImagingEditor({ data, onChange }: { data: ImagingSectionData; onChange: (v: any) => void }) {
  const imagingEntries = Object.entries(data.available_imaging || {});
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Key Investigations</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {(data.key_investigations || []).map((t, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Available Imaging ({imagingEntries.length})</Label>
        <div className="mt-1 space-y-2">
          {imagingEntries.map(([key, study]) => (
            <div key={key} className={cn('p-2 rounded text-sm', study.is_key ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50')}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{study.label}</span>
                {study.is_key && <Badge variant="default" className="text-[10px]">Key</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{study.points} pts</span>
              </div>
              <p className="text-muted-foreground mt-0.5">{study.result}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagnosisEditor({ data, onChange }: { data: DiagnosisSectionData; onChange: (v: any) => void }) {
  const rubric = data.rubric;
  return (
    <div className="space-y-3">
      {rubric && Object.entries(rubric).map(([key, item]) => (
        <div key={key}>
          <Label className="text-xs text-muted-foreground">{item.label} ({item.points} pts)</Label>
          <div className="mt-1 p-2 rounded bg-muted/50 text-sm">
            <p className="text-muted-foreground">{item.model_answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ManagementEditor({ data, onChange }: { data: ManagementSectionData; onChange: (v: any) => void }) {
  const questions = data.questions || [];
  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Questions ({questions.length})</Label>
      <div className="mt-1 space-y-3">
        {questions.map((q, qi) => (
          <div key={q.id} className="border rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{q.type}</Badge>
              <span className="text-xs text-muted-foreground">{q.points || q.rubric?.points} pts</span>
            </div>
            <p className="text-sm font-medium mb-2">{q.question}</p>
            {q.type === 'mcq' && q.options && (
              <div className="space-y-1">
                {q.options.map((opt, oi) => {
                  const letter = opt.match(/^([A-Z])\./)?.[1];
                  const isCorrect = letter === q.correct;
                  return (
                    <div
                      key={oi}
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded text-sm',
                        isCorrect ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-muted/30'
                      )}
                    >
                      <span className="flex-1">{opt}</span>
                      {isCorrect && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
            {q.type === 'free_text' && q.rubric && (
              <div className="mt-1 p-2 rounded bg-muted/50 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Model Answer:</p>
                <p>{q.rubric.model_answer}</p>
              </div>
            )}
            {q.explanation && (
              <p className="text-xs text-muted-foreground mt-2">Explanation: {q.explanation}</p>
            )}
          </div>
        ))}
      </div>
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
      {data.rubric?.expected_points && (
        <div>
          <Label className="text-xs text-muted-foreground">Expected Points ({data.rubric.expected_points.length})</Label>
          <div className="mt-1 space-y-1">
            {data.rubric.expected_points.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3 h-3 text-primary shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
      {data.rubric?.expected_points && (
        <div>
          <Label className="text-xs text-muted-foreground">Expected Points ({data.rubric.expected_points.length})</Label>
          <div className="mt-1 space-y-1">
            {data.rubric.expected_points.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3 h-3 text-primary shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConclusionEditor({ data, onChange }: { data: ConclusionSectionData; onChange: (v: any) => void }) {
  const tasks = data.tasks || [];
  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Tasks ({tasks.length})</Label>
      {tasks.map((task, i) => (
        <div key={task.id} className="border rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{task.type.replace(/_/g, ' ')}</Badge>
            <span className="font-medium text-sm">{task.label}</span>
            <span className="text-xs text-muted-foreground ml-auto">{task.rubric.points} pts</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{task.instruction}</p>
          <div className="p-2 rounded bg-muted/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Model Answer:</p>
            <p>{task.rubric.model_answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
