import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, CheckCircle2, XCircle, AlertTriangle, StopCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemAutoTag, SystemAutoTagProgress, SkipReasons, TableResult } from '@/hooks/useSystemAutoTag';

function SkipBreakdown({ reasons, compact = false }: { reasons: SkipReasons; compact?: boolean }) {
  const entries = [
    { label: 'Already tagged', value: reasons.alreadyTagged, color: 'text-blue-600' },
    { label: 'No chapter', value: reasons.noChapter, color: 'text-amber-600' },
    { label: 'No sections defined', value: reasons.noSectionsForChapter, color: 'text-orange-600' },
    { label: 'AI no match', value: reasons.aiNoMatch, color: 'text-red-500' },
  ].filter(e => e.value > 0);

  if (entries.length === 0) return null;

  if (compact) {
    return (
      <span className="text-xs text-muted-foreground">
        ({entries.map(e => `${e.label}: ${e.value}`).join(', ')})
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {entries.map(e => (
        <span key={e.label} className={e.color}>
          {e.label}: <strong>{e.value}</strong>
        </span>
      ))}
    </div>
  );
}

function generateReport(display: SystemAutoTagProgress): string {
  const lines: string[] = [];
  const ts = new Date().toISOString();
  lines.push(`AI Auto-Tag Report — ${ts}`);
  lines.push('='.repeat(60));
  lines.push('');

  const coverage = display.itemsScanned > 0
    ? ((display.itemsTagged + display.skipReasons.alreadyTagged) / display.itemsScanned * 100).toFixed(1)
    : '0';

  lines.push('OVERALL SUMMARY');
  lines.push(`  Scanned:          ${display.itemsScanned}`);
  lines.push(`  Already tagged:   ${display.skipReasons.alreadyTagged}`);
  lines.push(`  Eligible:         ${display.itemsEligible}`);
  lines.push(`  Tagged (new):     ${display.itemsTagged}`);
  lines.push(`  Skipped:          ${display.itemsSkipped}`);
  lines.push(`  Coverage:         ${coverage}%`);
  lines.push('');
  lines.push('SKIP REASONS');
  lines.push(`  Already tagged:         ${display.skipReasons.alreadyTagged}`);
  lines.push(`  No chapter assigned:    ${display.skipReasons.noChapter}`);
  lines.push(`  No sections for chapter:${display.skipReasons.noSectionsForChapter}`);
  lines.push(`  AI could not match:     ${display.skipReasons.aiNoMatch}`);
  lines.push('');
  lines.push('-'.repeat(60));
  lines.push('PER-TABLE BREAKDOWN');
  lines.push('-'.repeat(60));

  for (const [table, r] of Object.entries(display.tableResults)) {
    lines.push('');
    lines.push(`  ${table}`);
    lines.push(`    Scanned:    ${r.scanned}`);
    lines.push(`    Eligible:   ${r.eligible}`);
    lines.push(`    Tagged:     ${r.tagged}`);
    lines.push(`    Skipped:    ${r.skipped}`);
    if (r.skipReasons.alreadyTagged) lines.push(`      Already tagged:          ${r.skipReasons.alreadyTagged}`);
    if (r.skipReasons.noChapter) lines.push(`      No chapter:              ${r.skipReasons.noChapter}`);
    if (r.skipReasons.noSectionsForChapter) lines.push(`      No sections for chapter: ${r.skipReasons.noSectionsForChapter}`);
    if (r.skipReasons.aiNoMatch) lines.push(`      AI no match:             ${r.skipReasons.aiNoMatch}`);
  }

  lines.push('');
  if (display.errors.length > 0) {
    lines.push('ERRORS');
    display.errors.forEach((e, i) => lines.push(`  ${i + 1}. ${e}`));
  }

  return lines.join('\n');
}

function downloadReport(display: SystemAutoTagProgress) {
  const text = generateReport(display);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auto-tag-report-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const STORAGE_KEY = 'system-auto-tag-last-result';

export function SystemAutoTagCard() {
  const { runSystemAutoTag, isRunning, progress, abort } = useSystemAutoTag();
  const [lastResult, setLastResult] = useState<SystemAutoTagProgress | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.result || null;
      }
    } catch {}
    return null;
  });
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.timestamp || null;
      }
    } catch {}
    return null;
  });
  const [showTableDetails, setShowTableDetails] = useState(false);

  // Warn before navigating away while running
  useEffect(() => {
    if (!isRunning) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isRunning]);

  const handleRun = async () => {
    toast.info('Starting system-wide AI section tagging...');
    const result = await runSystemAutoTag(false);
    if (result) {
      const timestamp = new Date().toISOString();
      setLastResult(result);
      setLastRunTimestamp(timestamp);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ result, timestamp }));
      } catch {}
      downloadReport(result);
      if (result.errors.length > 0) {
        toast.warning(`Completed with ${result.errors.length} error(s). Tagged ${result.itemsTagged} items. Report downloaded.`);
      } else {
        toast.success(`Tagged ${result.itemsTagged} of ${result.itemsEligible} eligible items. Report downloaded.`);
      }
    }
  };

  const pct = progress && progress.itemsEligible > 0
    ? Math.round((progress.itemsProcessed / progress.itemsEligible) * 100)
    : progress?.tablesProcessed && progress.totalTables > 0
      ? Math.round((progress.tablesProcessed / progress.totalTables) * 100)
      : 0;

  const display = isRunning ? progress : lastResult;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="w-5 h-5" />
          AI Auto-Tag All Content by Section
        </CardTitle>
        <CardDescription>
          Scans all content tables and uses AI to assign section_id based on clinical concept and ILO matching.
          Only untagged items are processed. Existing assignments are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button onClick={handleRun} disabled={isRunning} className="gap-2">
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Running...</>
            ) : (
              <><Wand2 className="w-4 h-4" />Auto-tag All Content</>
            )}
          </Button>
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={abort} className="gap-1.5">
              <StopCircle className="w-3.5 h-3.5" />Stop
            </Button>
          )}
        </div>

        {/* Running progress */}
        {isRunning && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.phase}</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Tables: {progress.tablesProcessed}/{progress.totalTables}</span>
              <span>Scanned: {progress.itemsScanned}</span>
              <span>Eligible: {progress.itemsEligible}</span>
              <span className="text-green-600">Tagged: {progress.itemsTagged}</span>
              <span className="text-amber-600">Skipped: {progress.skipReasons.noChapter + progress.skipReasons.noSectionsForChapter + progress.skipReasons.aiNoMatch}</span>
            </div>
          </div>
        )}

        {/* Completed results */}
        {!isRunning && display && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {display.errors.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <span className="font-medium text-sm">
                    {display.phase === 'Complete' ? 'Tagging Complete' : 'Tagging Finished'}
                  </span>
                  {lastRunTimestamp && !isRunning && (
                    <div className="text-xs text-muted-foreground">
                      Last run: {new Date(lastRunTimestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadReport(display)} className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />Report
              </Button>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold">{display.itemsScanned}</div>
                <div className="text-xs text-muted-foreground">Scanned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{display.skipReasons.alreadyTagged}</div>
                <div className="text-xs text-muted-foreground">Already Tagged</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{display.itemsEligible}</div>
                <div className="text-xs text-muted-foreground">Eligible</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{display.itemsTagged}</div>
                <div className="text-xs text-muted-foreground">Newly Tagged</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {display.itemsScanned > 0
                    ? Math.round(((display.itemsTagged + display.skipReasons.alreadyTagged) / display.itemsScanned) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>

            {/* Skip reasons */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Skip reasons:</div>
              <SkipBreakdown reasons={display.skipReasons} />
            </div>

            {/* Per-table breakdown */}
            {Object.keys(display.tableResults).length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowTableDetails(!showTableDetails)}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTableDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Per-table breakdown ({Object.keys(display.tableResults).length} tables)
                </button>

                {!showTableDetails && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(display.tableResults).map(([table, r]) => (
                      <Badge
                        key={table}
                        variant={r.tagged > 0 ? 'default' : 'secondary'}
                        className="text-xs font-normal"
                      >
                        {table.replace(/_/g, ' ')}: {r.tagged}/{r.scanned}
                      </Badge>
                    ))}
                  </div>
                )}

                {showTableDetails && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(display.tableResults).map(([table, r]) => (
                      <div key={table} className="border rounded p-2.5 bg-background text-xs space-y-1">
                        <div className="font-medium">{table.replace(/_/g, ' ')}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                          <span>Scanned: {r.scanned}</span>
                          <span>Eligible: {r.eligible}</span>
                          <span className="text-green-600">Tagged: {r.tagged}</span>
                          <span className="text-amber-600">Skipped: {r.skipped}</span>
                        </div>
                        <SkipBreakdown reasons={r.skipReasons} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Errors */}
            {display.errors.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-destructive">Errors:</div>
                {display.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                    <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
                {display.errors.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ...and {display.errors.length - 5} more errors
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
