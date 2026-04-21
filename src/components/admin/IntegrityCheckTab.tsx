import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, FileText, Stethoscope, Layers, Video, ArrowLeftRight, ListChecks, Lightbulb, Network, HeartPulse, Activity, AlertTriangle, CheckCircle2, Copy, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

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

type OrphanCheckType = 'mcqs' | 'mcq_sets' | 'essays' | 'osce' | 'flashcards' | 'lectures' | 'matching' | 'study_resources';
type QualityCheckType = 'osce' | 'flashcards' | 'clinical_cases' | 'lectures' | 'matching' | 'mcq_sets' | 'guided_explanation' | 'mind_map';

export function IntegrityCheckTab() {
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

  const [orphanStudyResourcesRunning, setOrphanStudyResourcesRunning] = useState(false);
  const [orphanStudyResourcesResult, setOrphanStudyResourcesResult] = useState<OrphanCheckResult | null>(null);
  const [orphanStudyResourcesError, setOrphanStudyResourcesError] = useState<string | null>(null);
  const [orphanStudyResourcesHasRun, setOrphanStudyResourcesHasRun] = useState(false);

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
    study_resources: { setRunning: setOrphanStudyResourcesRunning, setResult: setOrphanStudyResourcesResult, setError: setOrphanStudyResourcesError, setHasRun: setOrphanStudyResourcesHasRun },
  };

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
        `${SUPABASE_URL}/functions/v1/integrity-orphaned-all`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        `${SUPABASE_URL}/functions/v1/integrity-pilot-v2`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
          <Button variant="outline" size="sm" onClick={() => exportOrphanLocationsCsv(locations, type)}>
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
          <Button variant="outline" size="sm" onClick={() => exportQualityLocationsCsv(locations, type)}>
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

  const orphanChecks: { type: OrphanCheckType; title: string; description: string; icon: React.ReactNode; running: boolean; result: OrphanCheckResult | null; error: string | null; hasRun: boolean }[] = [
    { type: 'mcqs', title: 'MCQs', description: 'Individual MCQ questions pointing to deleted chapters', icon: <ShieldAlert className="w-4 h-4" />, running: orphanMcqsRunning, result: orphanMcqsResult, error: orphanMcqsError, hasRun: orphanMcqsHasRun },
    { type: 'mcq_sets', title: 'MCQ Sets', description: 'MCQ sets (timed quizzes) pointing to deleted chapters', icon: <ListChecks className="w-4 h-4" />, running: orphanMcqSetsRunning, result: orphanMcqSetsResult, error: orphanMcqSetsError, hasRun: orphanMcqSetsHasRun },
    { type: 'essays', title: 'Essays', description: 'Essay questions pointing to deleted chapters', icon: <FileText className="w-4 h-4" />, running: orphanEssaysRunning, result: orphanEssaysResult, error: orphanEssaysError, hasRun: orphanEssaysHasRun },
    { type: 'osce', title: 'OSCE Stations', description: 'OSCE stations pointing to deleted chapters', icon: <Stethoscope className="w-4 h-4" />, running: orphanOsceRunning, result: orphanOsceResult, error: orphanOsceError, hasRun: orphanOsceHasRun },
    { type: 'flashcards', title: 'Flashcards', description: 'Flashcards pointing to deleted chapters', icon: <Layers className="w-4 h-4" />, running: orphanFlashcardsRunning, result: orphanFlashcardsResult, error: orphanFlashcardsError, hasRun: orphanFlashcardsHasRun },
    { type: 'lectures', title: 'Chapters', description: 'Chapter videos pointing to deleted chapters', icon: <Video className="w-4 h-4" />, running: orphanLecturesRunning, result: orphanLecturesResult, error: orphanLecturesError, hasRun: orphanLecturesHasRun },
    { type: 'matching', title: 'Matching Questions', description: 'Matching questions pointing to deleted chapters', icon: <ArrowLeftRight className="w-4 h-4" />, running: orphanMatchingRunning, result: orphanMatchingResult, error: orphanMatchingError, hasRun: orphanMatchingHasRun },
    { type: 'study_resources', title: 'Study Resources', description: 'Study resources pointing to deleted chapters', icon: <BookOpen className="w-4 h-4" />, running: orphanStudyResourcesRunning, result: orphanStudyResourcesResult, error: orphanStudyResourcesError, hasRun: orphanStudyResourcesHasRun },
  ];

  const qualityChecks: { type: QualityCheckType; title: string; description: string; icon: React.ReactNode; running: boolean; result: IntegrityIssue | null; error: string | null; hasRun: boolean }[] = [
    { type: 'mcq_sets', title: 'MCQ Set Quality', description: 'Sets with empty titles or not assigned to any location', icon: <ListChecks className="w-4 h-4" />, running: qualityMcqSetsRunning, result: qualityMcqSetsResult, error: qualityMcqSetsError, hasRun: qualityMcqSetsHasRun },
    { type: 'osce', title: 'OSCE Quality', description: 'Stations with missing history, empty statements, or no answers', icon: <Stethoscope className="w-4 h-4" />, running: qualityOsceRunning, result: qualityOsceResult, error: qualityOsceError, hasRun: qualityOsceHasRun },
    { type: 'flashcards', title: 'Flashcard Quality', description: 'Cards with blank front/back text or no chapter assignment', icon: <Layers className="w-4 h-4" />, running: qualityFlashcardsRunning, result: qualityFlashcardsResult, error: qualityFlashcardsError, hasRun: qualityFlashcardsHasRun },
    { type: 'clinical_cases', title: 'Clinical Case Quality', description: 'Cases with empty titles, introductions, or no location', icon: <HeartPulse className="w-4 h-4" />, running: qualityClinicalRunning, result: qualityClinicalResult, error: qualityClinicalError, hasRun: qualityClinicalHasRun },
    { type: 'lectures', title: 'Chapter Quality', description: 'Videos with missing titles, no URL, or no location', icon: <Video className="w-4 h-4" />, running: qualityLecturesRunning, result: qualityLecturesResult, error: qualityLecturesError, hasRun: qualityLecturesHasRun },
    { type: 'matching', title: 'Matching Question Quality', description: 'Questions with empty columns or no match pairs', icon: <ArrowLeftRight className="w-4 h-4" />, running: qualityMatchingRunning, result: qualityMatchingResult, error: qualityMatchingError, hasRun: qualityMatchingHasRun },
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
