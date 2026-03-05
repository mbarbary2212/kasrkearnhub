import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
  const { data: caseData, isLoading } = useStructuredCaseDetail(caseId);
  const updateData = useUpdateStructuredCaseData();
  const publishCase = usePublishStructuredCase();
  const generateCase = useGenerateStructuredCase();

  const [editedData, setEditedData] = useState<StructuredCaseData | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const generatedData = caseData?.generated_case_data as StructuredCaseData | null;

  useEffect(() => {
    if (generatedData && !editedData) {
      setEditedData(structuredClone(generatedData));
    }
  }, [generatedData]);

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
      await updateData.mutateAsync({ caseId, data: editedData });
      setHasChanges(false);
      toast.success('Case data saved');
    } catch {
      toast.error('Failed to save');
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
          {!generatedData && (
            <Button onClick={handleGenerate} disabled={generateCase.isPending}>
              {generateCase.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Content
            </Button>
          )}
          {generatedData && (
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

      {/* No content yet */}
      {!generatedData && !generateCase.isPending && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Content Generated Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Click "Generate Content" to have AI create the full structured case based on your configuration.
            </p>
            <Button onClick={handleGenerate} disabled={generateCase.isPending}>
              <Sparkles className="w-4 h-4 mr-2" /> Generate Content
            </Button>
          </CardContent>
        </Card>
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
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Findings ({data.findings?.length || 0})</Label>
      <div className="space-y-1">
        {(data.findings || []).map((f, i) => (
          <div key={i} className={cn('flex items-center gap-3 p-2 rounded text-sm', f.is_abnormal ? 'bg-destructive/10' : 'bg-muted/50')}>
            <Badge variant={f.is_abnormal ? 'destructive' : 'secondary'} className="text-xs shrink-0">
              {f.region}
            </Badge>
            <span className="flex-1">{f.finding}</span>
            {f.is_abnormal && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function LabsEditor({ data, onChange }: { data: LabsSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Expected Orders</Label>
        <p className="text-sm mt-1">{(data.expected_orders || []).join(', ') || 'None'}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Available Labs ({data.available_labs?.length || 0})</Label>
        <div className="mt-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-1 pr-2">Test</th>
                <th className="pb-1 pr-2">Result</th>
                <th className="pb-1 pr-2">Unit</th>
                <th className="pb-1 pr-2">Reference</th>
                <th className="pb-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.available_labs || []).map((lab, i) => (
                <tr key={i} className={cn('border-b border-muted', lab.is_abnormal && 'text-destructive')}>
                  <td className="py-1 pr-2 font-medium">{lab.test_name}</td>
                  <td className="py-1 pr-2">{lab.result}</td>
                  <td className="py-1 pr-2">{lab.unit}</td>
                  <td className="py-1 pr-2">{lab.reference_range}</td>
                  <td className="py-1">{lab.is_abnormal ? '⚠️' : '✓'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ImagingEditor({ data, onChange }: { data: ImagingSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Expected Orders</Label>
        <p className="text-sm mt-1">{(data.expected_orders || []).join(', ') || 'None'}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Available Imaging ({data.available_imaging?.length || 0})</Label>
        <div className="mt-1 space-y-2">
          {(data.available_imaging || []).map((img, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded bg-muted/50 text-sm">
              <Badge variant="outline" className="shrink-0 text-xs">{img.modality}</Badge>
              <div>
                <p className="font-medium">{img.body_part}</p>
                <p className="text-muted-foreground">{img.finding}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagnosisEditor({ data, onChange }: { data: DiagnosisSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Expected Diagnosis</Label>
        <Input
          value={data.expected_diagnosis}
          onChange={e => onChange({ ...data, expected_diagnosis: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Differential Diagnoses</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {(data.differential_diagnoses || []).map((d, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManagementEditor({ data, onChange }: { data: ManagementSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      {data.free_text_prompt && (
        <div>
          <Label className="text-xs text-muted-foreground">Free Text Prompt</Label>
          <Textarea
            value={data.free_text_prompt}
            onChange={e => onChange({ ...data, free_text_prompt: e.target.value })}
            rows={2}
            className="mt-1 text-sm"
          />
        </div>
      )}
      <div>
        <Label className="text-xs text-muted-foreground">MCQs ({data.mcqs?.length || 0})</Label>
        <div className="mt-1 space-y-3">
          {(data.mcqs || []).map((mcq, qi) => (
            <div key={qi} className="border rounded p-3">
              <p className="text-sm font-medium mb-2">Q{qi + 1}: {mcq.question}</p>
              <div className="space-y-1">
                {mcq.options.map(opt => (
                  <div
                    key={opt.key}
                    className={cn(
                      'flex items-center gap-2 p-1.5 rounded text-sm',
                      opt.is_correct ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-muted/30'
                    )}
                  >
                    <span className="font-mono text-xs w-5">{opt.key}.</span>
                    <span className="flex-1">{opt.text}</span>
                    {opt.is_correct && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonitoringEditor({ data, onChange }: { data: MonitoringSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Prompt</Label>
        <Textarea value={data.prompt} onChange={e => onChange({ ...data, prompt: e.target.value })} rows={2} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Expected Answer</Label>
        <Textarea value={data.expected_answer} onChange={e => onChange({ ...data, expected_answer: e.target.value })} rows={3} className="mt-1 text-sm" />
      </div>
    </div>
  );
}

function AdviceEditor({ data, onChange }: { data: AdviceSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Prompt</Label>
        <Textarea value={data.prompt} onChange={e => onChange({ ...data, prompt: e.target.value })} rows={2} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Expected Answer</Label>
        <Textarea value={data.expected_answer} onChange={e => onChange({ ...data, expected_answer: e.target.value })} rows={3} className="mt-1 text-sm" />
      </div>
    </div>
  );
}

function ConclusionEditor({ data, onChange }: { data: ConclusionSectionData; onChange: (v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Ward Round Prompt</Label>
        <Textarea value={data.ward_round_prompt} onChange={e => onChange({ ...data, ward_round_prompt: e.target.value })} rows={3} className="mt-1 text-sm" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Key Decisions</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {(data.key_decisions || []).map((d, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
