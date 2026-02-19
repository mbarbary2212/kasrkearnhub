import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditItem {
  id: string;
  title: string;
  module_title?: string;
  chapter_title?: string;
}

interface ContentTypeResult {
  label: string;
  table: string;
  count: number;
  items: AuditItem[];
  hasRun: boolean;
  isRunning: boolean;
  error: string | null;
}

const CONTENT_TYPES = [
  { key: 'study_resources', label: 'Flashcards / Study Resources', titleCol: 'title' },
  { key: 'mcqs', label: 'MCQs', titleCol: 'question' },
  { key: 'osce_questions', label: 'OSCE Stations', titleCol: 'title' },
  { key: 'clinical_cases', label: 'Clinical Cases', titleCol: 'title' },
  { key: 'matching_questions', label: 'Matching Questions', titleCol: 'title' },
  { key: 'essays', label: 'Short Answer / Essays', titleCol: 'title' },
  { key: 'case_scenarios', label: 'Case Scenarios', titleCol: 'title' },
] as const;

const SAMPLE_LIMIT = 20;

export function MissingConceptsAudit() {
  const [results, setResults] = useState<Record<string, ContentTypeResult>>(() => {
    const initial: Record<string, ContentTypeResult> = {};
    CONTENT_TYPES.forEach(ct => {
      initial[ct.key] = {
        label: ct.label,
        table: ct.key,
        count: 0,
        items: [],
        hasRun: false,
        isRunning: false,
        error: null,
      };
    });
    return initial;
  });

  const [isRunningAll, setIsRunningAll] = useState(false);

  const runCheckForType = useCallback(async (key: string, titleCol: string) => {
    setResults(prev => ({
      ...prev,
      [key]: { ...prev[key], isRunning: true, error: null },
    }));

    try {
      // Use type assertion for dynamic table names
      const table = key as any;

      // Get count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('concept_id', null)
        .eq('is_deleted', false);

      if (countError) throw countError;

      // Get sample items with module/chapter info
      const { data, error } = await supabase
        .from(table)
        .select(`id, ${titleCol}, module_id, chapter_id`)
        .is('concept_id', null)
        .eq('is_deleted', false)
        .limit(SAMPLE_LIMIT);
      if (error) throw error;

      // Collect unique module/chapter IDs for name lookup
      const moduleIds = [...new Set((data || []).map(d => (d as any).module_id).filter(Boolean))];
      const chapterIds = [...new Set((data || []).map(d => (d as any).chapter_id).filter(Boolean))];

      let moduleMap: Record<string, string> = {};
      let chapterMap: Record<string, string> = {};

      if (moduleIds.length > 0) {
        const { data: modules } = await supabase
          .from('modules')
          .select('id, name')
          .in('id', moduleIds);
        modules?.forEach(m => { moduleMap[m.id] = m.name; });
      }

      if (chapterIds.length > 0) {
        const { data: chapters } = await supabase
          .from('module_chapters')
          .select('id, title')
          .in('id', chapterIds);
        chapters?.forEach(c => { chapterMap[c.id] = c.title; });
      }

      const items: AuditItem[] = (data || []).map((d: any) => ({
        id: d.id,
        title: d[titleCol] || '(untitled)',
        module_title: moduleMap[d.module_id] || undefined,
        chapter_title: chapterMap[d.chapter_id] || undefined,
      }));

      setResults(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          count: count || 0,
          items,
          hasRun: true,
          isRunning: false,
          error: null,
        },
      }));
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          isRunning: false,
          error: err.message || 'An error occurred',
        },
      }));
    }
  }, []);

  const runAll = async () => {
    setIsRunningAll(true);
    await Promise.all(
      CONTENT_TYPES.map(ct => runCheckForType(ct.key, ct.titleCol))
    );
    setIsRunningAll(false);
  };

  const exportCsv = (key: string, result: ContentTypeResult) => {
    const headers = ['ID', 'Title', 'Module', 'Chapter'];
    const rows = result.items.map(item => [
      item.id,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      item.module_title || '',
      item.chapter_title || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-concepts-${key}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${result.items.length} items to CSV`);
  };

  const totalMissing = Object.values(results).reduce(
    (sum, r) => sum + (r.hasRun ? r.count : 0),
    0
  );
  const allHaveRun = Object.values(results).every(r => r.hasRun);

  return (
    <div className="space-y-4">
      <Alert>
        <Tag className="h-4 w-4" />
        <AlertTitle>Missing Concept Tags</AlertTitle>
        <AlertDescription>
          Find content items that have no concept assigned. Items without concepts won't be grouped for analytics or study plans.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-3">
        <Button onClick={runAll} disabled={isRunningAll} size="sm">
          {isRunningAll ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running All Checks...
            </>
          ) : (
            'Run All Checks'
          )}
        </Button>
        {allHaveRun && (
          <Badge variant={totalMissing > 0 ? 'destructive' : 'secondary'} className="text-sm">
            {totalMissing} total missing
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CONTENT_TYPES.map(ct => {
          const r = results[ct.key];
          return (
            <Card key={ct.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="w-4 h-4" />
                  {ct.label}
                </CardTitle>
                <CardDescription className="text-sm">
                  Items with no concept_id assigned
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => runCheckForType(ct.key, ct.titleCol)}
                  disabled={r.isRunning}
                  size="sm"
                >
                  {r.isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Run Check'
                  )}
                </Button>

                {r.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{r.error}</AlertDescription>
                  </Alert>
                )}

                {r.hasRun && !r.error && (
                  <Alert variant={r.count > 0 ? 'default' : 'default'}>
                    {r.count > 0 ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {r.count > 0
                        ? `${r.count} item${r.count !== 1 ? 's' : ''} missing concept`
                        : 'All tagged'}
                    </AlertTitle>
                    <AlertDescription>
                      {r.count > 0 ? (
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm">
                              Showing first {Math.min(r.items.length, SAMPLE_LIMIT)} of {r.count}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportCsv(ct.key, r)}
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
                                  <TableHead>Title</TableHead>
                                  <TableHead>Module</TableHead>
                                  <TableHead>Chapter</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {r.items.map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs truncate max-w-[80px]" title={item.id}>
                                      {item.id.slice(0, 8)}…
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={item.title}>
                                      {item.title}
                                    </TableCell>
                                    <TableCell className="text-sm">{item.module_title || '—'}</TableCell>
                                    <TableCell className="text-sm">{item.chapter_title || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <p>All {ct.label.toLowerCase()} have a concept assigned.</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
