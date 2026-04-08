import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, CheckCircle2, XCircle, AlertTriangle, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemAutoTag, SystemAutoTagProgress } from '@/hooks/useSystemAutoTag';

export function SystemAutoTagCard() {
  const { runSystemAutoTag, isRunning, progress, abort } = useSystemAutoTag();
  const [lastResult, setLastResult] = useState<SystemAutoTagProgress | null>(null);

  const handleRun = async () => {
    toast.info('Starting system-wide AI section tagging...');
    const result = await runSystemAutoTag(false);
    if (result) {
      setLastResult(result);
      if (result.errors.length > 0) {
        toast.warning(`Completed with ${result.errors.length} error(s). Tagged ${result.itemsTagged} items.`);
      } else {
        toast.success(`Tagged ${result.itemsTagged} of ${result.totalItems} items across all tables.`);
      }
    }
  };

  const pct = progress && progress.totalItems > 0
    ? Math.round((progress.itemsProcessed / progress.totalItems) * 100)
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
          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Auto-tag All Content
              </>
            )}
          </Button>
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={abort} className="gap-1.5">
              <StopCircle className="w-3.5 h-3.5" />
              Stop
            </Button>
          )}
        </div>

        {isRunning && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.phase}</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Tables: {progress.tablesProcessed}/{progress.totalTables}</span>
              <span>Items: {progress.itemsProcessed}/{progress.totalItems}</span>
              <span className="text-green-600">Tagged: {progress.itemsTagged}</span>
              <span className="text-amber-600">Skipped: {progress.itemsSkipped}</span>
            </div>
          </div>
        )}

        {!isRunning && display && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              {display.errors.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              <span className="font-medium text-sm">
                {display.phase === 'Complete' ? 'Tagging Complete' : 'Tagging Finished'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold">{display.totalItems}</div>
                <div className="text-xs text-muted-foreground">Total Untagged</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{display.itemsTagged}</div>
                <div className="text-xs text-muted-foreground">Tagged</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{display.itemsSkipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {display.totalItems > 0
                    ? Math.round((display.itemsTagged / display.totalItems) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>

            {/* Per-table breakdown */}
            {Object.keys(display.tableResults).length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Per-table breakdown:</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(display.tableResults).map(([table, result]) => (
                    <Badge
                      key={table}
                      variant={result.tagged > 0 ? 'default' : 'secondary'}
                      className="text-xs font-normal"
                    >
                      {table.replace(/_/g, ' ')}: {result.tagged}/{result.total}
                    </Badge>
                  ))}
                </div>
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
