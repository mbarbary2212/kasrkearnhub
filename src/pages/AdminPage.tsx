import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, ShieldAlert, Users, Building2, ChevronRight, Trash2, Plus, Edit, BookOpen, Calendar, Layers, Settings, HelpCircle, FileText, Search, GraduationCap, Megaphone, BarChart3, Activity, AlertTriangle, CheckCircle2, Copy, Download, Stethoscope, CreditCard, HeartPulse, Video, ArrowLeftRight, ListChecks, Lightbulb, Network, Sparkles, UserPlus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Profile, AppRole, Department, DepartmentAdmin } from '@/types/database';
import type { Year, Module, ModuleAdmin } from '@/types/curriculum';
import { HelpTemplatesTab } from '@/components/admin/HelpTemplatesTab';
import { TopicAdminsTab } from '@/components/admin/TopicAdminsTab';
import { AnnouncementsTab } from '@/components/admin/AnnouncementsTab';
import { UserAnalyticsTab } from '@/components/admin/UserAnalyticsTab';
import { CurriculumTab } from '@/components/admin/CurriculumTab';
import { PDFLibraryTab } from '@/components/admin/PDFLibraryTab';
import { QuestionAnalyticsTabs } from '@/components/analytics/QuestionAnalyticsTabs';
import { useHideEmptySelfAssessmentTabs, useUpsertStudySetting } from '@/hooks/useStudyResources';
import { useArchiveLegacyOsce } from '@/hooks/useOsceQuestions';
import { AISettingsPanel } from '@/components/admin/AISettingsPanel';
import { AIBatchJobsList } from '@/components/admin/AIBatchJobsList';
import { AccountsTab } from '@/components/admin/AccountsTab';

interface UserWithRole extends Profile {
  role: AppRole;
  departmentAssignments?: DepartmentAdmin[];
  moduleAssignments?: ModuleAdmin[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin (Legacy)',
  topic_admin: 'Topic Admin',
  department_admin: 'Module Admin',
  platform_admin: 'Platform Admin',
  super_admin: 'Super Admin',
};

const ROLE_COLORS: Record<AppRole, string> = {
  student: 'bg-slate-100 text-slate-700',
  teacher: 'bg-blue-100 text-blue-700',
  admin: 'bg-amber-100 text-amber-700',
  topic_admin: 'bg-teal-100 text-teal-700',
  department_admin: 'bg-purple-100 text-purple-700',
  platform_admin: 'bg-indigo-100 text-indigo-700',
  super_admin: 'bg-red-100 text-red-700',
};

// Platform Settings Tab Component
function PlatformSettingsTab() {
  const { data: hideEmptyTabs, isLoading } = useHideEmptySelfAssessmentTabs();
  const upsertSetting = useUpsertStudySetting();
  const archiveLegacyOsce = useArchiveLegacyOsce();
  const { isSuperAdmin } = useAuthContext();
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleToggle = async (checked: boolean) => {
    try {
      await upsertSetting.mutateAsync({
        key: 'hide_empty_self_assessment_tabs',
        value: checked ? 'true' : 'false',
      });
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleArchiveLegacy = async () => {
    try {
      await archiveLegacyOsce.mutateAsync();
      setArchiveConfirmOpen(false);
    } catch (error) {
      console.error('Error archiving legacy OSCE:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Platform Settings
        </CardTitle>
        <CardDescription>
          Configure global platform behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="hide-empty-tabs" className="text-base font-medium">
              Hide Empty Practice Tabs
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, students will only see practice sub-tabs (MCQ, Essays, Matching, etc.) that have content. 
              Admins always see all tabs.
            </p>
          </div>
          <Switch
            id="hide-empty-tabs"
            checked={hideEmptyTabs ?? false}
            onCheckedChange={handleToggle}
            disabled={isLoading || upsertSetting.isPending}
          />
        </div>

        {/* Archive Legacy OSCE - Super Admin Only */}
        {isSuperAdmin && (
          <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                <Label className="text-base font-medium text-destructive">
                  Archive Legacy OSCE Questions
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                This will archive all old-format OSCE/Practical questions that don't fit the new Image + History + 5 T/F format.
                This is a one-time migration action.
              </p>
              <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="mt-2">
                    Archive Legacy OSCE Questions
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Archive Legacy OSCE Questions?</DialogTitle>
                    <DialogDescription>
                      This will soft-delete ALL existing Practical/OSCE questions in the old format.
                      They will be hidden from students and admin views. This action is logged in the audit trail.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleArchiveLegacy}
                      disabled={archiveLegacyOsce.isPending}
                    >
                      {archiveLegacyOsce.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Archive All Legacy OSCE
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Types for V2 Integrity Checks
interface IntegrityLocation {
  id: string;
  preview: string;
  module_id: string | null;
  module_title: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  topic_id: string | null;
  topic_title: string | null;
}

interface IntegrityIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  count: number;
  description: string;
  locations: IntegrityLocation[];
}

interface V2CheckResult {
  issues: IntegrityIssue[];
  checkedAt: string;
  scope: string;
}

// Types for orphan check results
interface OrphanedLocation {
  id: string;
  preview: string;
  orphaned_chapter_id: string;
  module_id: string | null;
  module_title: string | null;
}

interface OrphanCheckResult {
  type: string;
  severity: 'critical' | 'warning' | 'ok';
  count: number;
  description: string;
  locations: OrphanedLocation[];
  checkedAt: string;
}

// Types for V2 quality checks
interface IntegrityLocation {
  id: string;
  preview: string;
  module_id: string | null;
  module_title: string | null;
  chapter_id: string | null;
  chapter_title: string | null;
  topic_id: string | null;
  topic_title: string | null;
}

interface IntegrityIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  count: number;
  description: string;
  locations: IntegrityLocation[];
}

interface V2CheckResult {
  issues: IntegrityIssue[];
  checkedAt: string;
  scope: string;
}

// Orphan check types
type OrphanCheckType = 'mcqs' | 'mcq_sets' | 'essays' | 'osce' | 'flashcards' | 'lectures' | 'matching' | 'case_scenarios' | 'clinical_cases' | 'study_resources';

// Quality check types
type QualityCheckType = 'osce' | 'flashcards' | 'clinical_cases' | 'lectures' | 'matching' | 'case_scenarios' | 'mcq_sets' | 'guided_explanation' | 'mind_map';

// Integrity Check Tab Component (All Admins)
function IntegrityCheckTab() {
  const [activeSubTab, setActiveSubTab] = useState<'orphaned' | 'quality'>('orphaned');

  // ===== ORPHAN CHECK STATES =====
  const [orphanMcqsRunning, setOrphanMcqsRunning] = useState(false);
  const [orphanMcqsResult, setOrphanMcqsResult] = useState<OrphanCheckResult | null>(null);
  const [orphanMcqsError, setOrphanMcqsError] = useState<string | null>(null);
  const [orphanMcqsHasRun, setOrphanMcqsHasRun] = useState(false);

  const [orphanMcqSetsRunning, setOrphanMcqSetsRunning] = useState(false);
  const [orphanMcqSetsResult, setOrphanMcqSetsResult] = useState<OrphanCheckResult | null>(null);
  const [orphanMcqSetsError, setOrphanMcqSetsError] = useState<string | null>(null);
  const [orphanMcqSetsHasRun, setOrphanMcqSetsHasRun] = useState(false);

  const [orphanEssaysRunning, setOrphanEssaysRunning] = useState(false);
  const [orphanEssaysResult, setOrphanEssaysResult] = useState<OrphanCheckResult | null>(null);
  const [orphanEssaysError, setOrphanEssaysError] = useState<string | null>(null);
  const [orphanEssaysHasRun, setOrphanEssaysHasRun] = useState(false);

  const [orphanOsceRunning, setOrphanOsceRunning] = useState(false);
  const [orphanOsceResult, setOrphanOsceResult] = useState<OrphanCheckResult | null>(null);
  const [orphanOsceError, setOrphanOsceError] = useState<string | null>(null);
  const [orphanOsceHasRun, setOrphanOsceHasRun] = useState(false);

  const [orphanFlashcardsRunning, setOrphanFlashcardsRunning] = useState(false);
  const [orphanFlashcardsResult, setOrphanFlashcardsResult] = useState<OrphanCheckResult | null>(null);
  const [orphanFlashcardsError, setOrphanFlashcardsError] = useState<string | null>(null);
  const [orphanFlashcardsHasRun, setOrphanFlashcardsHasRun] = useState(false);

  const [orphanLecturesRunning, setOrphanLecturesRunning] = useState(false);
  const [orphanLecturesResult, setOrphanLecturesResult] = useState<OrphanCheckResult | null>(null);
  const [orphanLecturesError, setOrphanLecturesError] = useState<string | null>(null);
  const [orphanLecturesHasRun, setOrphanLecturesHasRun] = useState(false);

  const [orphanMatchingRunning, setOrphanMatchingRunning] = useState(false);
  const [orphanMatchingResult, setOrphanMatchingResult] = useState<OrphanCheckResult | null>(null);
  const [orphanMatchingError, setOrphanMatchingError] = useState<string | null>(null);
  const [orphanMatchingHasRun, setOrphanMatchingHasRun] = useState(false);

  const [orphanCaseScenariosRunning, setOrphanCaseScenariosRunning] = useState(false);
  const [orphanCaseScenariosResult, setOrphanCaseScenariosResult] = useState<OrphanCheckResult | null>(null);
  const [orphanCaseScenariosError, setOrphanCaseScenariosError] = useState<string | null>(null);
  const [orphanCaseScenariosHasRun, setOrphanCaseScenariosHasRun] = useState(false);

  const [orphanClinicalCasesRunning, setOrphanClinicalCasesRunning] = useState(false);
  const [orphanClinicalCasesResult, setOrphanClinicalCasesResult] = useState<OrphanCheckResult | null>(null);
  const [orphanClinicalCasesError, setOrphanClinicalCasesError] = useState<string | null>(null);
  const [orphanClinicalCasesHasRun, setOrphanClinicalCasesHasRun] = useState(false);

  const [orphanStudyResourcesRunning, setOrphanStudyResourcesRunning] = useState(false);
  const [orphanStudyResourcesResult, setOrphanStudyResourcesResult] = useState<OrphanCheckResult | null>(null);
  const [orphanStudyResourcesError, setOrphanStudyResourcesError] = useState<string | null>(null);
  const [orphanStudyResourcesHasRun, setOrphanStudyResourcesHasRun] = useState(false);

  // ===== QUALITY CHECK STATES =====
  const [qualityOsceRunning, setQualityOsceRunning] = useState(false);
  const [qualityOsceResult, setQualityOsceResult] = useState<IntegrityIssue | null>(null);
  const [qualityOsceError, setQualityOsceError] = useState<string | null>(null);
  const [qualityOsceHasRun, setQualityOsceHasRun] = useState(false);

  const [qualityFlashcardsRunning, setQualityFlashcardsRunning] = useState(false);
  const [qualityFlashcardsResult, setQualityFlashcardsResult] = useState<IntegrityIssue | null>(null);
  const [qualityFlashcardsError, setQualityFlashcardsError] = useState<string | null>(null);
  const [qualityFlashcardsHasRun, setQualityFlashcardsHasRun] = useState(false);

  const [qualityClinicalRunning, setQualityClinicalRunning] = useState(false);
  const [qualityClinicalResult, setQualityClinicalResult] = useState<IntegrityIssue | null>(null);
  const [qualityClinicalError, setQualityClinicalError] = useState<string | null>(null);
  const [qualityClinicalHasRun, setQualityClinicalHasRun] = useState(false);

  const [qualityLecturesRunning, setQualityLecturesRunning] = useState(false);
  const [qualityLecturesResult, setQualityLecturesResult] = useState<IntegrityIssue | null>(null);
  const [qualityLecturesError, setQualityLecturesError] = useState<string | null>(null);
  const [qualityLecturesHasRun, setQualityLecturesHasRun] = useState(false);

  const [qualityMatchingRunning, setQualityMatchingRunning] = useState(false);
  const [qualityMatchingResult, setQualityMatchingResult] = useState<IntegrityIssue | null>(null);
  const [qualityMatchingError, setQualityMatchingError] = useState<string | null>(null);
  const [qualityMatchingHasRun, setQualityMatchingHasRun] = useState(false);

  const [qualityCaseScenariosRunning, setQualityCaseScenariosRunning] = useState(false);
  const [qualityCaseScenariosResult, setQualityCaseScenariosResult] = useState<IntegrityIssue | null>(null);
  const [qualityCaseScenariosError, setQualityCaseScenariosError] = useState<string | null>(null);
  const [qualityCaseScenariosHasRun, setQualityCaseScenariosHasRun] = useState(false);

  const [qualityMcqSetsRunning, setQualityMcqSetsRunning] = useState(false);
  const [qualityMcqSetsResult, setQualityMcqSetsResult] = useState<IntegrityIssue | null>(null);
  const [qualityMcqSetsError, setQualityMcqSetsError] = useState<string | null>(null);
  const [qualityMcqSetsHasRun, setQualityMcqSetsHasRun] = useState(false);

  const [qualityGuidedRunning, setQualityGuidedRunning] = useState(false);
  const [qualityGuidedResult, setQualityGuidedResult] = useState<IntegrityIssue | null>(null);
  const [qualityGuidedError, setQualityGuidedError] = useState<string | null>(null);
  const [qualityGuidedHasRun, setQualityGuidedHasRun] = useState(false);

  const [qualityMindMapRunning, setQualityMindMapRunning] = useState(false);
  const [qualityMindMapResult, setQualityMindMapResult] = useState<IntegrityIssue | null>(null);
  const [qualityMindMapError, setQualityMindMapError] = useState<string | null>(null);
  const [qualityMindMapHasRun, setQualityMindMapHasRun] = useState(false);

  const getAuthToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return token;
  };

  // Orphan check state map
  const orphanStateMap: Record<OrphanCheckType, {
    setRunning: (v: boolean) => void;
    setResult: (v: OrphanCheckResult | null) => void;
    setError: (v: string | null) => void;
    setHasRun: (v: boolean) => void;
  }> = {
    mcqs: { setRunning: setOrphanMcqsRunning, setResult: setOrphanMcqsResult, setError: setOrphanMcqsError, setHasRun: setOrphanMcqsHasRun },
    mcq_sets: { setRunning: setOrphanMcqSetsRunning, setResult: setOrphanMcqSetsResult, setError: setOrphanMcqSetsError, setHasRun: setOrphanMcqSetsHasRun },
    essays: { setRunning: setOrphanEssaysRunning, setResult: setOrphanEssaysResult, setError: setOrphanEssaysError, setHasRun: setOrphanEssaysHasRun },
    osce: { setRunning: setOrphanOsceRunning, setResult: setOrphanOsceResult, setError: setOrphanOsceError, setHasRun: setOrphanOsceHasRun },
    flashcards: { setRunning: setOrphanFlashcardsRunning, setResult: setOrphanFlashcardsResult, setError: setOrphanFlashcardsError, setHasRun: setOrphanFlashcardsHasRun },
    lectures: { setRunning: setOrphanLecturesRunning, setResult: setOrphanLecturesResult, setError: setOrphanLecturesError, setHasRun: setOrphanLecturesHasRun },
    matching: { setRunning: setOrphanMatchingRunning, setResult: setOrphanMatchingResult, setError: setOrphanMatchingError, setHasRun: setOrphanMatchingHasRun },
    case_scenarios: { setRunning: setOrphanCaseScenariosRunning, setResult: setOrphanCaseScenariosResult, setError: setOrphanCaseScenariosError, setHasRun: setOrphanCaseScenariosHasRun },
    clinical_cases: { setRunning: setOrphanClinicalCasesRunning, setResult: setOrphanClinicalCasesResult, setError: setOrphanClinicalCasesError, setHasRun: setOrphanClinicalCasesHasRun },
    study_resources: { setRunning: setOrphanStudyResourcesRunning, setResult: setOrphanStudyResourcesResult, setError: setOrphanStudyResourcesError, setHasRun: setOrphanStudyResourcesHasRun },
  };

  // Quality check state map
  const qualityStateMap: Record<QualityCheckType, {
    setRunning: (v: boolean) => void;
    setResult: (v: IntegrityIssue | null) => void;
    setError: (v: string | null) => void;
    setHasRun: (v: boolean) => void;
    issueType: string;
  }> = {
    osce: { setRunning: setQualityOsceRunning, setResult: setQualityOsceResult, setError: setQualityOsceError, setHasRun: setQualityOsceHasRun, issueType: 'osce_integrity' },
    flashcards: { setRunning: setQualityFlashcardsRunning, setResult: setQualityFlashcardsResult, setError: setQualityFlashcardsError, setHasRun: setQualityFlashcardsHasRun, issueType: 'flashcard_integrity' },
    clinical_cases: { setRunning: setQualityClinicalRunning, setResult: setQualityClinicalResult, setError: setQualityClinicalError, setHasRun: setQualityClinicalHasRun, issueType: 'clinical_case_integrity' },
    lectures: { setRunning: setQualityLecturesRunning, setResult: setQualityLecturesResult, setError: setQualityLecturesError, setHasRun: setQualityLecturesHasRun, issueType: 'lecture_integrity' },
    matching: { setRunning: setQualityMatchingRunning, setResult: setQualityMatchingResult, setError: setQualityMatchingError, setHasRun: setQualityMatchingHasRun, issueType: 'matching_integrity' },
    case_scenarios: { setRunning: setQualityCaseScenariosRunning, setResult: setQualityCaseScenariosResult, setError: setQualityCaseScenariosError, setHasRun: setQualityCaseScenariosHasRun, issueType: 'case_scenario_integrity' },
    mcq_sets: { setRunning: setQualityMcqSetsRunning, setResult: setQualityMcqSetsResult, setError: setQualityMcqSetsError, setHasRun: setQualityMcqSetsHasRun, issueType: 'mcq_set_integrity' },
    guided_explanation: { setRunning: setQualityGuidedRunning, setResult: setQualityGuidedResult, setError: setQualityGuidedError, setHasRun: setQualityGuidedHasRun, issueType: 'guided_explanation_integrity' },
    mind_map: { setRunning: setQualityMindMapRunning, setResult: setQualityMindMapResult, setError: setQualityMindMapError, setHasRun: setQualityMindMapHasRun, issueType: 'mind_map_integrity' },
  };

  const runOrphanCheck = async (checkType: OrphanCheckType) => {
    const { setRunning, setResult, setError, setHasRun } = orphanStateMap[checkType];

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(
        'https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/integrity-orphaned-all',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ checkType }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to run orphan check for ${checkType}`);
      }

      const data: OrphanCheckResult = await response.json();
      setResult(data);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRunning(false);
    }
  };

  const runQualityCheck = async (checkType: QualityCheckType) => {
    const { setRunning, setResult, setError, setHasRun, issueType } = qualityStateMap[checkType];

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(
        'https://dwmxnokprfiwmvzksyjg.supabase.co/functions/v1/integrity-pilot-v2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ checkType }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to run quality check for ${checkType}`);
      }

      const data: V2CheckResult = await response.json();
      const issue = data.issues.find((i) => i.type === issueType) || null;
      setResult(issue);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRunning(false);
    }
  };

  const copyIdsToClipboard = (ids: string[], type: string) => {
    navigator.clipboard.writeText(ids.join('\n'));
    toast.success(`Copied ${ids.length} ${type} IDs to clipboard`);
  };

  const exportOrphanLocationsCsv = (locations: OrphanedLocation[], type: string) => {
    const headers = ['ID', 'Preview', 'Orphaned Chapter ID', 'Module'];
    const rows = locations.map((loc) => [
      loc.id,
      `"${(loc.preview || '').replace(/"/g, '""')}"`,
      loc.orphaned_chapter_id,
      loc.module_title || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orphaned-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${locations.length} orphaned ${type} to CSV`);
  };

  const exportQualityLocationsCsv = (locations: IntegrityLocation[], type: string) => {
    const headers = ['ID', 'Preview', 'Module', 'Chapter', 'Topic'];
    const rows = locations.map((loc) => [
      loc.id,
      `"${(loc.preview || '').replace(/"/g, '""')}"`,
      loc.module_title || '',
      loc.chapter_title || '',
      loc.topic_title || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${locations.length} ${type} issues to CSV`);
  };

  const renderOrphanLocationTable = (locations: OrphanedLocation[], type: string) => {
    if (!locations || locations.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Where are they?</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportOrphanLocationsCsv(locations, type)}
          >
            <Download className="mr-2 h-3 w-3" />
            Export CSV
          </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Module</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.slice(0, 20).map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-mono text-xs truncate max-w-[80px]" title={loc.id}>
                    {loc.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={loc.preview}>
                    {loc.preview || '—'}
                  </TableCell>
                  <TableCell className="text-sm">{loc.module_title || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {locations.length > 20 && (
          <p className="text-xs text-muted-foreground">
            Showing 20 of {locations.length} items. Export CSV for full list.
          </p>
        )}
      </div>
    );
  };

  const renderQualityLocationTable = (locations: IntegrityLocation[], type: string) => {
    if (!locations || locations.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Where are they?</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportQualityLocationsCsv(locations, type)}
          >
            <Download className="mr-2 h-3 w-3" />
            Export CSV
          </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Topic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.slice(0, 20).map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-mono text-xs truncate max-w-[80px]" title={loc.id}>
                    {loc.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={loc.preview}>
                    {loc.preview}
                  </TableCell>
                  <TableCell className="text-sm">{loc.module_title || '—'}</TableCell>
                  <TableCell className="text-sm">{loc.chapter_title || '—'}</TableCell>
                  <TableCell className="text-sm">{loc.topic_title || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {locations.length > 20 && (
          <p className="text-xs text-muted-foreground">
            Showing 20 of {locations.length} issues. Export CSV for full list.
          </p>
        )}
      </div>
    );
  };

  const renderOrphanCheckCard = (
    title: string,
    description: string,
    icon: React.ReactNode,
    isRunning: boolean,
    result: OrphanCheckResult | null,
    error: string | null,
    onRun: () => void,
    type: string,
    hasRun: boolean
  ) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onRun} disabled={isRunning} size="sm">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            `Run Check`
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(hasRun || result !== null) && !error && (
          <Alert variant={result && result.count > 0 ? 'destructive' : 'default'}>
            {result && result.count > 0 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertTitle>
              {result && result.count > 0
                ? `Found ${result.count} Orphaned`
                : 'No Issues Found'}
            </AlertTitle>
            <AlertDescription>
              {result && result.count > 0 ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm">{result.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyIdsToClipboard(result.locations.map((l) => l.id), type)}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copy IDs
                  </Button>
                  {renderOrphanLocationTable(result.locations, type.toLowerCase())}
                </div>
              ) : (
                <p>All {type.toLowerCase()} items have valid chapter references.</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderQualityCheckCard = (
    title: string,
    description: string,
    icon: React.ReactNode,
    isRunning: boolean,
    result: IntegrityIssue | null,
    error: string | null,
    onRun: () => void,
    type: string,
    hasRun: boolean
  ) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onRun} disabled={isRunning} size="sm">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            `Run Check`
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(hasRun || result !== null) && !error && (
          <Alert variant={result && result.count > 0 ? (result.severity === 'critical' ? 'destructive' : 'default') : 'default'}>
            {result && result.count > 0 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertTitle>
              {result && result.count > 0
                ? `Found ${result.count} Issue${result.count !== 1 ? 's' : ''}`
                : 'No Issues Found'}
            </AlertTitle>
            <AlertDescription>
              {result && result.count > 0 ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm">{result.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyIdsToClipboard(result.locations.map((l) => l.id), type)}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copy IDs
                  </Button>
                  {renderQualityLocationTable(result.locations, type.toLowerCase())}
                </div>
              ) : (
                <p>All {type.toLowerCase()} items passed quality checks.</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Orphan check configs
  const orphanChecks: { type: OrphanCheckType; title: string; description: string; icon: React.ReactNode; running: boolean; result: OrphanCheckResult | null; error: string | null; hasRun: boolean }[] = [
    { type: 'mcqs', title: 'MCQs', description: 'Individual MCQ questions pointing to deleted chapters', icon: <ShieldAlert className="w-4 h-4" />, running: orphanMcqsRunning, result: orphanMcqsResult, error: orphanMcqsError, hasRun: orphanMcqsHasRun },
    { type: 'mcq_sets', title: 'MCQ Sets', description: 'MCQ sets (timed quizzes) pointing to deleted chapters', icon: <ListChecks className="w-4 h-4" />, running: orphanMcqSetsRunning, result: orphanMcqSetsResult, error: orphanMcqSetsError, hasRun: orphanMcqSetsHasRun },
    { type: 'essays', title: 'Essays', description: 'Essay questions pointing to deleted chapters', icon: <FileText className="w-4 h-4" />, running: orphanEssaysRunning, result: orphanEssaysResult, error: orphanEssaysError, hasRun: orphanEssaysHasRun },
    { type: 'osce', title: 'OSCE Stations', description: 'OSCE stations pointing to deleted chapters', icon: <Stethoscope className="w-4 h-4" />, running: orphanOsceRunning, result: orphanOsceResult, error: orphanOsceError, hasRun: orphanOsceHasRun },
    { type: 'flashcards', title: 'Flashcards', description: 'Flashcards pointing to deleted chapters', icon: <Layers className="w-4 h-4" />, running: orphanFlashcardsRunning, result: orphanFlashcardsResult, error: orphanFlashcardsError, hasRun: orphanFlashcardsHasRun },
    { type: 'lectures', title: 'Lectures', description: 'Lecture videos pointing to deleted chapters', icon: <Video className="w-4 h-4" />, running: orphanLecturesRunning, result: orphanLecturesResult, error: orphanLecturesError, hasRun: orphanLecturesHasRun },
    { type: 'matching', title: 'Matching Questions', description: 'Matching questions pointing to deleted chapters', icon: <ArrowLeftRight className="w-4 h-4" />, running: orphanMatchingRunning, result: orphanMatchingResult, error: orphanMatchingError, hasRun: orphanMatchingHasRun },
    { type: 'case_scenarios', title: 'Case Scenarios', description: 'Case scenarios pointing to deleted chapters', icon: <FileText className="w-4 h-4" />, running: orphanCaseScenariosRunning, result: orphanCaseScenariosResult, error: orphanCaseScenariosError, hasRun: orphanCaseScenariosHasRun },
    { type: 'clinical_cases', title: 'Clinical Cases', description: 'Clinical cases pointing to deleted chapters', icon: <HeartPulse className="w-4 h-4" />, running: orphanClinicalCasesRunning, result: orphanClinicalCasesResult, error: orphanClinicalCasesError, hasRun: orphanClinicalCasesHasRun },
    { type: 'study_resources', title: 'Study Resources', description: 'Study resources pointing to deleted chapters', icon: <BookOpen className="w-4 h-4" />, running: orphanStudyResourcesRunning, result: orphanStudyResourcesResult, error: orphanStudyResourcesError, hasRun: orphanStudyResourcesHasRun },
  ];

  // Quality check configs
  const qualityChecks: { type: QualityCheckType; title: string; description: string; icon: React.ReactNode; running: boolean; result: IntegrityIssue | null; error: string | null; hasRun: boolean }[] = [
    { type: 'mcq_sets', title: 'MCQ Set Quality', description: 'Sets with empty titles or not assigned to any location', icon: <ListChecks className="w-4 h-4" />, running: qualityMcqSetsRunning, result: qualityMcqSetsResult, error: qualityMcqSetsError, hasRun: qualityMcqSetsHasRun },
    { type: 'osce', title: 'OSCE Quality', description: 'Stations with missing history, empty statements, or no answers', icon: <Stethoscope className="w-4 h-4" />, running: qualityOsceRunning, result: qualityOsceResult, error: qualityOsceError, hasRun: qualityOsceHasRun },
    { type: 'flashcards', title: 'Flashcard Quality', description: 'Cards with blank front/back text or no chapter assignment', icon: <Layers className="w-4 h-4" />, running: qualityFlashcardsRunning, result: qualityFlashcardsResult, error: qualityFlashcardsError, hasRun: qualityFlashcardsHasRun },
    { type: 'clinical_cases', title: 'Clinical Case Quality', description: 'Cases with empty titles, introductions, or no location', icon: <HeartPulse className="w-4 h-4" />, running: qualityClinicalRunning, result: qualityClinicalResult, error: qualityClinicalError, hasRun: qualityClinicalHasRun },
    { type: 'lectures', title: 'Lecture Quality', description: 'Videos with missing titles, no URL, or no location', icon: <Video className="w-4 h-4" />, running: qualityLecturesRunning, result: qualityLecturesResult, error: qualityLecturesError, hasRun: qualityLecturesHasRun },
    { type: 'matching', title: 'Matching Question Quality', description: 'Questions with empty columns or no match pairs', icon: <ArrowLeftRight className="w-4 h-4" />, running: qualityMatchingRunning, result: qualityMatchingResult, error: qualityMatchingError, hasRun: qualityMatchingHasRun },
    { type: 'case_scenarios', title: 'Case Scenario Quality', description: 'Scenarios with missing history or model answers', icon: <FileText className="w-4 h-4" />, running: qualityCaseScenariosRunning, result: qualityCaseScenariosResult, error: qualityCaseScenariosError, hasRun: qualityCaseScenariosHasRun },
    { type: 'guided_explanation', title: 'Guided Explanation Quality', description: 'Explanations with missing topics or fewer than 3 questions', icon: <Lightbulb className="w-4 h-4" />, running: qualityGuidedRunning, result: qualityGuidedResult, error: qualityGuidedError, hasRun: qualityGuidedHasRun },
    { type: 'mind_map', title: 'Mind Map Quality', description: 'Maps with no image and no structured content', icon: <Network className="w-4 h-4" />, running: qualityMindMapRunning, result: qualityMindMapResult, error: qualityMindMapError, hasRun: qualityMindMapHasRun },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Data Integrity
          </CardTitle>
          <CardDescription>
            Run audit checks to find broken references and incomplete content across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'orphaned' | 'quality')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="orphaned" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Orphaned Records
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Content Quality
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orphaned" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Orphaned Records</AlertTitle>
                <AlertDescription>
                  Find content that references chapters or modules that have been deleted from the system. 
                  These items may be invisible to users or cause errors.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 md:grid-cols-2">
                {orphanChecks.map((check) => (
                  <div key={check.type}>
                    {renderOrphanCheckCard(
                      check.title,
                      check.description,
                      check.icon,
                      check.running,
                      check.result,
                      check.error,
                      () => runOrphanCheck(check.type),
                      check.title,
                      check.hasRun
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Content Quality</AlertTitle>
                <AlertDescription>
                  Find content with missing fields, incomplete data, or configuration issues. 
                  These items may not display correctly for students.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 md:grid-cols-2">
                {qualityChecks.map((check) => (
                  <div key={check.type}>
                    {renderQualityCheckCard(
                      check.title,
                      check.description,
                      check.icon,
                      check.running,
                      check.result,
                      check.error,
                      () => runQualityCheck(check.type),
                      check.title,
                      check.hasRun
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user, isSuperAdmin, isPlatformAdmin, isAdmin, isTopicAdmin, isModuleAdmin, moduleAdminModuleIds, role, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Module form state
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({
    year_id: '',
    name: '',
    name_ar: '',
    slug: '',
    description: '',
    is_published: false,
    workload_level: '' as '' | 'light' | 'medium' | 'heavy' | 'heavy_plus',
    page_count: '' as string,
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!isAdmin) return;

      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) throw profilesError;

        // Fetch all roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Fetch department assignments (legacy)
        const { data: deptAssignments } = await supabase
          .from('department_admins')
          .select('*');

        // Fetch module assignments
        const { data: moduleAssignments } = await supabase
          .from('module_admins')
          .select('*');

        // Fetch departments (for reference)
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .order('display_order');

        // Fetch years
        const { data: yearsData } = await supabase
          .from('years')
          .select('*')
          .order('display_order');

        // Fetch modules
        const { data: modulesData } = await supabase
          .from('modules')
          .select('*')
          .order('display_order');

        setDepartments((depts as Department[]) || []);
        setYears((yearsData as Year[]) || []);
        setModules((modulesData as Module[]) || []);

        // Combine profiles with roles and assignments
        const usersWithRoles = (profiles || []).map((profile) => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          const userDeptAssignments = deptAssignments?.filter(a => a.user_id === profile.id) || [];
          const userModuleAssignments = moduleAssignments?.filter(a => a.user_id === profile.id) || [];
          return {
            ...profile,
            role: (userRole?.role as AppRole) || 'student',
            departmentAssignments: userDeptAssignments as DepartmentAdmin[],
            moduleAssignments: userModuleAssignments as ModuleAdmin[],
          };
        });

        setUsers(usersWithRoles);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if ((newRole === 'super_admin' || newRole === 'platform_admin') && !isSuperAdmin) {
      toast.error('Only Super Admins can assign this role');
      return;
    }

    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      // Clean up module_admins if role is no longer department_admin
      if (newRole !== 'department_admin') {
        await supabase.from('module_admins').delete().eq('user_id', userId);
      }

      // Clean up topic_admins if role is no longer topic_admin
      if (newRole !== 'topic_admin') {
        await supabase.from('topic_admins').delete().eq('user_id', userId);
      }

      setUsers(prev =>
        prev.map(u => 
          u.id === userId 
            ? { ...u, role: newRole, moduleAssignments: newRole === 'department_admin' ? u.moduleAssignments : [] } 
            : u
        )
      );

      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleAssignModule = async (userId: string, moduleId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can assign modules');
      return;
    }

    try {
      const { error } = await supabase
        .from('module_admins')
        .insert({ 
          user_id: userId, 
          module_id: moduleId,
          assigned_by: user?.id 
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already assigned to this module');
          return;
        }
        throw error;
      }

      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId) {
            const newAssignment: ModuleAdmin = {
              id: crypto.randomUUID(),
              user_id: userId,
              module_id: moduleId,
              assigned_by: user?.id || null,
              created_at: new Date().toISOString(),
            };
            return {
              ...u,
              moduleAssignments: [...(u.moduleAssignments || []), newAssignment],
            };
          }
          return u;
        })
      );

      setSelectedModule('');
      toast.success('Module assigned successfully');
    } catch (error) {
      console.error('Error assigning module:', error);
      toast.error('Failed to assign module');
    }
  };

  const handleRemoveModuleAssignment = async (userId: string, moduleId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can remove module assignments');
      return;
    }

    try {
      const { error } = await supabase
        .from('module_admins')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              moduleAssignments: u.moduleAssignments?.filter(a => a.module_id !== moduleId) || [],
            };
          }
          return u;
        })
      );

      toast.success('Module assignment removed');
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const getModuleName = (id: string) => {
    return modules.find(m => m.id === id)?.name || 'Unknown';
  };

  const getYearName = (id: string) => {
    return years.find(y => y.id === id)?.name || 'Unknown';
  };

  const getAvailableRoles = (): AppRole[] => {
    if (isSuperAdmin) {
      return ['student', 'teacher', 'topic_admin', 'department_admin', 'platform_admin', 'super_admin'];
    }
    if (isPlatformAdmin) {
      return ['student', 'teacher', 'topic_admin', 'department_admin'];
    }
    return ['student', 'teacher'];
  };

  // Module CRUD operations
  const handleCreateModule = async () => {
    if (!moduleForm.year_id || !moduleForm.name || !moduleForm.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          year_id: moduleForm.year_id,
          name: moduleForm.name,
          name_ar: moduleForm.name_ar || null,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          is_published: moduleForm.is_published,
          workload_level: moduleForm.workload_level || null,
          page_count: moduleForm.page_count ? parseInt(moduleForm.page_count, 10) : null,
          display_order: modules.filter(m => m.year_id === moduleForm.year_id).length,
        })
        .select()
        .single();

      if (error) throw error;

      setModules(prev => [...prev, data as Module]);
      setShowModuleDialog(false);
      resetModuleForm();
      toast.success('Module created successfully');
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Failed to create module');
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      const { data, error } = await supabase
        .from('modules')
        .update({
          name: moduleForm.name,
          name_ar: moduleForm.name_ar || null,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          is_published: moduleForm.is_published,
          workload_level: moduleForm.workload_level || null,
          page_count: moduleForm.page_count ? parseInt(moduleForm.page_count, 10) : null,
        })
        .eq('id', editingModule.id)
        .select()
        .single();

      if (error) throw error;

      setModules(prev => prev.map(m => m.id === editingModule.id ? data as Module : m));
      setShowModuleDialog(false);
      setEditingModule(null);
      resetModuleForm();
      toast.success('Module updated successfully');
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? This will also delete all content within it.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== moduleId));
      toast.success('Module deleted successfully');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const resetModuleForm = () => {
    setModuleForm({
      year_id: '',
      name: '',
      name_ar: '',
      slug: '',
      description: '',
      is_published: false,
      workload_level: '',
      page_count: '',
    });
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      year_id: module.year_id,
      name: module.name,
      name_ar: module.name_ar || '',
      slug: module.slug,
      description: module.description || '',
      is_published: module.is_published || false,
      workload_level: module.workload_level || '',
      page_count: module.page_count?.toString() || '',
    });
    setShowModuleDialog(true);
  };


  if (authLoading || isLoading) {

    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Determine default tab based on role
  const defaultTab = isTopicAdmin ? 'help' : 'users';

  // For topic admins, show a simplified view with just Help & Templates
  if (isTopicAdmin) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-heading font-bold">Help & Templates</h1>
              <p className="text-muted-foreground">
                Download guides and templates for content preparation.
              </p>
            </div>
          </div>

          <HelpTemplatesTab />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Super Admin Access - Full System Control' : 
               isPlatformAdmin ? 'Platform Admin Access - All Modules' : 
               'Admin Access'}
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            {(isSuperAdmin || isPlatformAdmin) && (
              <TabsTrigger value="curriculum" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Layers className="w-4 h-4" />
                Curriculum
              </TabsTrigger>
            )}
            {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
              <TabsTrigger value="announcements" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Megaphone className="w-4 h-4" />
                Announcements
              </TabsTrigger>
            )}
            {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
              <TabsTrigger value="question-analytics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Activity className="w-4 h-4" />
                Question Analytics
              </TabsTrigger>
            )}
            {isPlatformAdmin && (
              <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="ai-settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Sparkles className="w-4 h-4" />
                AI Settings
              </TabsTrigger>
            )}
            {(isPlatformAdmin || isModuleAdmin) && (
              <TabsTrigger value="pdf-library" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4" />
                PDF Library
              </TabsTrigger>
            )}
            <TabsTrigger value="help" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HelpCircle className="w-4 h-4" />
              Help & Templates
            </TabsTrigger>
            {(isSuperAdmin || isPlatformAdmin || isTopicAdmin) && (
              <TabsTrigger value="integrity" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ShieldAlert className="w-4 h-4" />
                Integrity
              </TabsTrigger>
            )}
            {(isSuperAdmin || isPlatformAdmin) && (
              <TabsTrigger value="accounts" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserPlus className="w-4 h-4" />
                Accounts
              </TabsTrigger>
            )}
          </TabsList>

          {/* Users Tab with Sub-tabs */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage users, roles, and permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="directory" className="space-y-4">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="directory" className="data-[state=active]:bg-background">
                      Directory
                    </TabsTrigger>
                    {(isSuperAdmin || isPlatformAdmin) && (
                      <TabsTrigger value="students" className="data-[state=active]:bg-background">
                        Students
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="topic-admins" className="data-[state=active]:bg-background">
                      Topic Admins
                    </TabsTrigger>
                    {isSuperAdmin && (
                      <TabsTrigger value="module-admins" className="data-[state=active]:bg-background">
                        Module Admins
                      </TabsTrigger>
                    )}
                    {isSuperAdmin && (
                      <TabsTrigger value="platform-admins" className="data-[state=active]:bg-background">
                        Platform Admins
                      </TabsTrigger>
                    )}
                    {(isSuperAdmin || isPlatformAdmin) && (
                      <TabsTrigger value="analytics" className="data-[state=active]:bg-background">
                        Analytics
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Directory Sub-tab */}
                  <TabsContent value="directory" className="mt-4">
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    {users.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No users found</p>
                    ) : (
                      <div className="space-y-4">
                        {users
                          .filter(u => {
                            if (!userSearch.trim()) return true;
                            const search = userSearch.toLowerCase();
                            return (
                              u.email.toLowerCase().includes(search) ||
                              (u.full_name?.toLowerCase().includes(search) ?? false)
                            );
                          })
                          .map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                <span className="font-semibold text-secondary-foreground">
                                  {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{u.full_name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                                {u.role === 'department_admin' && u.moduleAssignments && u.moduleAssignments.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {u.moduleAssignments.map(a => (
                                      <Badge key={a.id} variant="outline" className="text-xs">
                                        {getModuleName(a.module_id)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={ROLE_COLORS[u.role]}>
                                {ROLE_LABELS[u.role]}
                              </Badge>
                              {u.id === user?.id ? (
                                <Badge variant="outline">You</Badge>
                              ) : (
                                <>
                                  <Select
                                    value={u.role}
                                    onValueChange={(value: AppRole) => handleRoleChange(u.id, value)}
                                  >
                                    <SelectTrigger className="w-44">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableRoles().map(role => (
                                        <SelectItem key={role} value={role}>
                                          {ROLE_LABELS[role]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Students Sub-tab */}
                  {(isSuperAdmin || isPlatformAdmin) && (
                    <TabsContent value="students" className="mt-4">
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="Search by name or email..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      {(() => {
                        const studentUsers = users.filter(u => u.role === 'student');
                        const filteredStudents = studentUsers.filter(u => {
                          if (!studentSearch.trim()) return true;
                          const search = studentSearch.toLowerCase();
                          return (
                            u.full_name?.toLowerCase().includes(search) ||
                            u.email.toLowerCase().includes(search)
                          );
                        });
                        
                        if (filteredStudents.length === 0) {
                          return (
                            <p className="text-muted-foreground text-center py-8">
                              {studentSearch ? 'No students found matching your search' : 'No students found'}
                            </p>
                          );
                        }
                        
                        return (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground mb-2">
                              Showing {filteredStudents.length} of {studentUsers.length} students
                            </p>
                            {filteredStudents.slice(0, 50).map((u) => (
                              <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                    <span className="font-semibold text-secondary-foreground">
                                      {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{u.full_name || 'No name'}</p>
                                    <p className="text-sm text-muted-foreground">{u.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={ROLE_COLORS.student}>
                                    {ROLE_LABELS.student}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {filteredStudents.length > 50 && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                Showing first 50 results. Refine your search to see more.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </TabsContent>
                  )}

                  {/* Topic Admins Sub-tab */}
                  <TabsContent value="topic-admins" className="mt-4">
                    <TopicAdminsTab users={users} modules={modules} years={years} />
                  </TabsContent>

                  {/* Module Admins Sub-tab */}
                  {isSuperAdmin && (
                    <TabsContent value="module-admins" className="mt-4">
                      <div className="space-y-6">
                        {users.filter(u => u.role === 'department_admin').length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No module admins assigned. Change a user's role to "Module Admin" first.
                          </p>
                        ) : (
                          users
                            .filter(u => u.role === 'department_admin')
                            .map(u => (
                              <div key={u.id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{u.full_name || u.email}</p>
                                    <p className="text-sm text-muted-foreground">{u.email}</p>
                                  </div>
                                  <Badge className={ROLE_COLORS.department_admin}>
                                    Module Admin
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Assigned Modules:</p>
                                  {u.moduleAssignments && u.moduleAssignments.length > 0 ? (
                                    <div className="space-y-2">
                                      {years.map(year => {
                                        const yearAssignments = u.moduleAssignments?.filter(a => {
                                          const mod = modules.find(m => m.id === a.module_id);
                                          return mod?.year_id === year.id;
                                        }) || [];
                                        
                                        if (yearAssignments.length === 0) return null;
                                        
                                        return (
                                          <div key={year.id} className="space-y-1">
                                            <p className="text-xs text-muted-foreground">{year.name}</p>
                                            <div className="flex flex-wrap gap-2">
                                              {yearAssignments.map(a => (
                                                <Badge key={a.id} variant="secondary" className="gap-1">
                                                  {getModuleName(a.module_id)}
                                                  <button
                                                    onClick={() => handleRemoveModuleAssignment(u.id, a.module_id)}
                                                    className="ml-1 hover:text-destructive"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No modules assigned</p>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <Select
                                    value={selectedUser === u.id ? selectedModule : ''}
                                    onValueChange={(value) => {
                                      setSelectedUser(u.id);
                                      setSelectedModule(value);
                                    }}
                                  >
                                    <SelectTrigger className="w-72">
                                      <SelectValue placeholder="Select module to assign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {years.map(year => {
                                        const yearModules = modules
                                          .filter(m => m.year_id === year.id)
                                          .filter(m => !u.moduleAssignments?.some(a => a.module_id === m.id))
                                          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                                        
                                        if (yearModules.length === 0) return null;
                                        
                                        return (
                                          <div key={year.id}>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                              {year.name}
                                            </div>
                                            {yearModules.map(m => (
                                              <SelectItem key={m.id} value={m.id}>
                                                {m.name}
                                              </SelectItem>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    onClick={() => {
                                      if (selectedUser === u.id && selectedModule) {
                                        handleAssignModule(u.id, selectedModule);
                                      }
                                    }}
                                    disabled={selectedUser !== u.id || !selectedModule}
                                  >
                                    Assign
                                  </Button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* Platform Admins Sub-tab */}
                  {isSuperAdmin && (
                    <TabsContent value="platform-admins" className="mt-4">
                      <div className="space-y-4">
                        {users.filter(u => u.role === 'platform_admin').length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No platform admins assigned. Change a user's role to "Platform Admin" in the Directory tab.
                          </p>
                        ) : (
                          users
                            .filter(u => u.role === 'platform_admin')
                            .map(u => (
                              <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                                    <span className="font-semibold text-secondary-foreground">
                                      {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{u.full_name || 'No name'}</p>
                                    <p className="text-sm text-muted-foreground">{u.email}</p>
                                  </div>
                                </div>
                                <Badge className={ROLE_COLORS.platform_admin}>
                                  Platform Admin
                                </Badge>
                              </div>
                            ))
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* User Analytics Sub-tab */}
                  {(isSuperAdmin || isPlatformAdmin) && (
                    <TabsContent value="analytics" className="mt-4">
                      <UserAnalyticsTab />
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab */}
          {(isSuperAdmin || isPlatformAdmin) && (
            <TabsContent value="curriculum">
              <CurriculumTab modules={modules} years={years} setModules={setModules} />
            </TabsContent>
          )}

          {/* Announcements Tab */}
          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="announcements">
              <AnnouncementsTab 
                modules={modules.map(m => ({ id: m.id, name: m.name }))} 
                years={years.map(y => ({ id: y.id, name: y.name }))}
                moduleAdminModuleIds={moduleAdminModuleIds}
              />
            </TabsContent>
          )}

          {/* Question Analytics Tab */}
          {(isSuperAdmin || isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="question-analytics">
              <QuestionAnalyticsTabs 
                modules={modules} 
                moduleAdminModuleIds={moduleAdminModuleIds}
              />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {isPlatformAdmin && (
            <TabsContent value="settings">
              <PlatformSettingsTab />
            </TabsContent>
          )}

          {/* AI Settings Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="ai-settings">
              <div className="space-y-6">
                <AISettingsPanel />
                <AIBatchJobsList />
              </div>
            </TabsContent>
          )}

          {/* PDF Library Tab */}
          {(isPlatformAdmin || isModuleAdmin) && (
            <TabsContent value="pdf-library">
              <PDFLibraryTab moduleAdminModuleIds={moduleAdminModuleIds} />
            </TabsContent>
          )}

          {/* Help & Templates Tab */}
          <TabsContent value="help">
            <HelpTemplatesTab />
          </TabsContent>

          {/* Integrity Check Tab - All Admins */}
          {(isSuperAdmin || isPlatformAdmin || isTopicAdmin) && (
            <TabsContent value="integrity">
              <IntegrityCheckTab />
            </TabsContent>
          )}

          {/* Accounts Tab - Platform/Super Admin Only */}
          {(isSuperAdmin || isPlatformAdmin) && (
            <TabsContent value="accounts">
              <AccountsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
