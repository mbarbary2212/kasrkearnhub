import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2, X, Check, Sparkles, FileText,
  ClipboardList, MessageSquare, User, Eye,
  Stethoscope, FlaskConical, ScanLine, Brain,
  Pill, Scissors, Activity, Heart, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionType,
  SECTION_LABELS,
  HistoryMode,
  DeliveryMode,
  PatientLanguage,
  StructuredCaseFormData,
} from '@/types/structuredCase';
import { useModuleChapters } from '@/hooks/useChapters';
import { useModules } from '@/hooks/useModules';
import { EXAMINER_AVATARS } from '@/lib/examinerAvatars';
import { useCreateStructuredCase } from '@/hooks/useStructuredCase';

// ── Constants ──────────────────────────────────────────

const ALL_SECTIONS: SectionType[] = [
  'history_taking',
  'physical_examination',
  'investigations_labs',
  'investigations_imaging',
  'diagnosis',
  'medical_management',
  'surgical_management',
  'monitoring_followup',
  'patient_family_advice',
  'conclusion',
];

const SECTION_ICONS: Record<SectionType, React.ReactNode> = {
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
};

const HISTORY_MODES: { value: HistoryMode; label: string; description: string }[] = [
  { value: 'full_conversation', label: 'Full Conversation', description: 'Student interviews the patient freely — AI responds as the patient' },
  { value: 'paramedic_handover', label: 'Paramedic Handover', description: 'Patient arrives by ambulance — brief handover provided, limited patient communication' },
  { value: 'triage_note', label: 'Triage Note', description: 'Student receives a triage summary and must ask follow-up questions' },
  { value: 'witness_account', label: 'Witness Account', description: 'A family member or bystander describes what happened' },
  { value: 'no_history', label: 'No History', description: 'Skip history taking — start from physical examination' },
];

// ── Props ──────────────────────────────────────────────

interface StructuredCaseCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId?: string;
  chapterId?: string;
  onSuccess?: (caseId: string) => void;
}

export function StructuredCaseCreator({
  open,
  onOpenChange,
  moduleId: defaultModuleId,
  chapterId: defaultChapterId,
  onSuccess,
}: StructuredCaseCreatorProps) {
  const [tab, setTab] = useState('basics');

  // Tab 1 — Basics
  const [title, setTitle] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(defaultModuleId || '');
  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId || '');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [estimatedMinutes, setEstimatedMinutes] = useState(20);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Tab 2 — Sections
  const [activeSections, setActiveSections] = useState<SectionType[]>([...ALL_SECTIONS]);
  const [sectionCounts, setSectionCounts] = useState<Partial<Record<SectionType, number>>>({});

  // Tab 3 — History Mode
  const [historyMode, setHistoryMode] = useState<HistoryMode>('full_conversation');
  const [patientLanguage, setPatientLanguage] = useState<PatientLanguage>('en');

  // Tab 4 — Patient
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState(45);
  const [patientGender, setPatientGender] = useState('male');
  const [avatarId, setAvatarId] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('practice');

  // Data hooks
  const { data: modules } = useModules();
  const { data: chapters } = useModuleChapters(selectedModuleId || undefined);
  const createCase = useCreateStructuredCase();

  // Helpers
  const toggleSection = (s: SectionType) => {
    setActiveSections(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const isBasicsValid = title.trim() && chiefComplaint.trim() && selectedModuleId;
  const isSectionsValid = activeSections.length > 0;

  const handleSubmit = async () => {
    if (!isBasicsValid || !isSectionsValid) {
      toast.error('Please complete all required fields');
      return;
    }

    const formData: StructuredCaseFormData = {
      title: title.trim(),
      chief_complaint: chiefComplaint.trim(),
      module_id: selectedModuleId,
      chapter_id: selectedChapterId || undefined,
      level,
      estimated_minutes: estimatedMinutes,
      additional_instructions: additionalInstructions.trim() || undefined,
      tags,
      active_sections: activeSections,
      section_question_counts: sectionCounts,
      history_mode: historyMode,
      patient_language: patientLanguage,
      patient_name: patientName.trim() || 'Patient',
      patient_age: patientAge,
      patient_gender: patientGender,
      avatar_id: avatarId,
      delivery_mode: deliveryMode,
    };

    try {
      const result = await createCase.mutateAsync(formData);
      toast.success('Structured case created! You can now generate content or edit it.');
      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (err) {
      console.error('Failed to create structured case:', err);
      toast.error('Failed to create case');
    }
  };

  const tabOrder = ['basics', 'sections', 'history', 'patient', 'review'];
  const currentIndex = tabOrder.indexOf(tab);
  const canNext = currentIndex < tabOrder.length - 1;
  const canPrev = currentIndex > 0;

  const goNext = () => {
    if (tab === 'basics' && !isBasicsValid) {
      toast.error('Fill in title, chief complaint, and select a module');
      return;
    }
    if (tab === 'sections' && !isSectionsValid) {
      toast.error('Enable at least one section');
      return;
    }
    if (canNext) setTab(tabOrder[currentIndex + 1]);
  };

  const goPrev = () => {
    if (canPrev) setTab(tabOrder[currentIndex - 1]);
  };

  const chapterWithPdf = chapters?.find(c => c.id === selectedChapterId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Create Structured Case
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid grid-cols-5 flex-shrink-0">
            <TabsTrigger value="basics" className="text-xs sm:text-sm">
              <FileText className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Basics
            </TabsTrigger>
            <TabsTrigger value="sections" className="text-xs sm:text-sm">
              <ClipboardList className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Sections
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <MessageSquare className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              History
            </TabsTrigger>
            <TabsTrigger value="patient" className="text-xs sm:text-sm">
              <User className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Patient
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs sm:text-sm">
              <Eye className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Review
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1">
            {/* ── TAB 1: BASICS ── */}
            <TabsContent value="basics" className="mt-0 space-y-4">
              <div>
                <Label htmlFor="sc-title">Case Title *</Label>
                <Input
                  id="sc-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Acute Abdomen in a 35-year-old Female"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sc-cc">Chief Complaint / Presentation *</Label>
                <Textarea
                  id="sc-cc"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  placeholder="Describe the clinical scenario — demographics, chief complaint, setting..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module *</Label>
                  <Select value={selectedModuleId} onValueChange={v => { setSelectedModuleId(v); setSelectedChapterId(''); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      {(modules || []).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chapter</Label>
                  <Select value={selectedChapterId || 'none'} onValueChange={v => setSelectedChapterId(v === 'none' ? '' : v)} disabled={!selectedModuleId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select chapter" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific chapter</SelectItem>
                      {(chapters || []).map(ch => (
                        <SelectItem key={ch.id} value={ch.id}>
                          Ch {ch.chapter_number}: {ch.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedChapterId && chapterWithPdf && (
                <Alert className="bg-muted/50">
                  <FileText className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    Chapter PDF will be used as the primary RAG source for case generation.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Difficulty Level</Label>
                  <Select value={level} onValueChange={v => setLevel(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sc-time">Estimated Time (min)</Label>
                  <Input
                    id="sc-time"
                    type="number"
                    min={5}
                    max={120}
                    value={estimatedMinutes}
                    onChange={e => setEstimatedMinutes(parseInt(e.target.value) || 20)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sc-instructions">Additional AI Instructions</Label>
                <Textarea
                  id="sc-instructions"
                  value={additionalInstructions}
                  onChange={e => setAdditionalInstructions(e.target.value)}
                  placeholder="Optional: specific focus areas, style, or constraints for case generation..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Add tag + Enter"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(t => (
                      <Badge key={t} variant="secondary" className="gap-1 text-xs">
                        {t}
                        <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TAB 2: SECTIONS ── */}
            <TabsContent value="sections" className="mt-0 space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Select which sections to include in this case. Each section becomes a step in the student's simulation.
              </p>
              {ALL_SECTIONS.map(s => {
                const active = activeSections.includes(s);
                const showCount = active && ['investigations_labs', 'investigations_imaging', 'medical_management', 'surgical_management'].includes(s);
                return (
                  <div
                    key={s}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      active ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={active}
                        onCheckedChange={() => toggleSection(s)}
                        id={`section-${s}`}
                      />
                      <span className="text-muted-foreground">{SECTION_ICONS[s]}</span>
                      <Label htmlFor={`section-${s}`} className="cursor-pointer font-medium text-sm">
                        {SECTION_LABELS[s]}
                      </Label>
                    </div>
                    {showCount && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Questions:</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={sectionCounts[s] || 3}
                          onChange={e => setSectionCounts({ ...sectionCounts, [s]: parseInt(e.target.value) || 3 })}
                          className="w-16 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* ── TAB 3: HISTORY MODE ── */}
            <TabsContent value="history" className="mt-0 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">History Taking Mode</Label>
                <RadioGroup value={historyMode} onValueChange={v => setHistoryMode(v as HistoryMode)} className="space-y-2">
                  {HISTORY_MODES.map(m => (
                    <label
                      key={m.value}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        historyMode === m.value
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <RadioGroupItem value={m.value} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">{m.label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Patient Language</Label>
                  <p className="text-xs text-muted-foreground">
                    {patientLanguage === 'en' ? 'Patient responds in English' : 'Patient responds in Egyptian Arabic (العامية المصرية)'}
                  </p>
                </div>
                <Select value={patientLanguage} onValueChange={v => setPatientLanguage(v as PatientLanguage)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar_eg">Egyptian Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ── TAB 4: PATIENT ── */}
            <TabsContent value="patient" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sc-pname">Patient Name</Label>
                  <Input
                    id="sc-pname"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="e.g., Ahmed Hassan"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sc-page">Age</Label>
                  <Input
                    id="sc-page"
                    type="number"
                    min={1}
                    max={120}
                    value={patientAge}
                    onChange={e => setPatientAge(parseInt(e.target.value) || 45)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Gender</Label>
                <Select value={patientGender} onValueChange={setPatientGender}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Examiner Avatar */}
              <div>
                <Label>Examiner Avatar</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {EXAMINER_AVATARS.map(exam => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setAvatarId(exam.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
                        avatarId === exam.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted-foreground/20'
                      )}
                    >
                      <div className="relative">
                        <Avatar className="w-14 h-14 border border-background shadow-sm">
                          <AvatarImage src={exam.image} alt={exam.name} />
                          <AvatarFallback>{exam.name.charAt(4)}</AvatarFallback>
                        </Avatar>
                        {avatarId === exam.id && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-center">{exam.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Mode */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Delivery Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {deliveryMode === 'practice'
                      ? 'Practice — hints and checklist visible during the case'
                      : 'Exam — no hints, checklist hidden until submission'}
                  </p>
                </div>
                <Select value={deliveryMode} onValueChange={v => setDeliveryMode(v as DeliveryMode)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">Practice</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ── TAB 5: REVIEW ── */}
            <TabsContent value="review" className="mt-0 space-y-4">
              <Alert className="bg-primary/5 border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <AlertDescription className="text-sm">
                  Review your case configuration below. After creating, you can generate the full case content with AI and edit it before publishing.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 text-sm">
                <ReviewRow label="Title" value={title || '—'} />
                <ReviewRow label="Chief Complaint" value={chiefComplaint || '—'} />
                <ReviewRow label="Module" value={modules?.find(m => m.id === selectedModuleId)?.name || '—'} />
                <ReviewRow label="Chapter" value={chapters?.find(c => c.id === selectedChapterId)?.title || 'None'} />
                <ReviewRow label="Difficulty" value={level} />
                <ReviewRow label="Time" value={`${estimatedMinutes} min`} />
                <ReviewRow label="History Mode" value={HISTORY_MODES.find(m => m.value === historyMode)?.label || historyMode} />
                <ReviewRow label="Patient Language" value={patientLanguage === 'en' ? 'English' : 'Egyptian Arabic'} />
                <ReviewRow label="Patient" value={`${patientName || 'Patient'}, ${patientAge}y, ${patientGender}`} />
                <ReviewRow label="Delivery Mode" value={deliveryMode === 'practice' ? 'Practice' : 'Exam'} />
                <div className="flex items-start justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Sections ({activeSections.length})</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {activeSections.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{SECTION_LABELS[s]}</Badge>
                    ))}
                  </div>
                </div>
                {tags.length > 0 && (
                  <div className="flex items-start justify-between py-1.5">
                    <span className="text-muted-foreground">Tags</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Navigation */}
        <div className="flex justify-between pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={canPrev ? goPrev : () => onOpenChange(false)}>
            {canPrev ? 'Back' : 'Cancel'}
          </Button>
          <div className="flex gap-2">
            {tab === 'review' ? (
              <Button onClick={handleSubmit} disabled={createCase.isPending || !isBasicsValid}>
                {createCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Sparkles className="w-4 h-4 mr-1" />
                Create Case
              </Button>
            ) : (
              <Button onClick={goNext}>
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
