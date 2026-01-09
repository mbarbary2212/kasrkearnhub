import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import type { AnalysisResult, MappingSuggestion, AnalysisIssue } from '@/hooks/useBulkUploadAnalyzer';

interface BulkUploadAnalyzerProps {
  isAnalyzing: boolean;
  analysis: AnalysisResult | null;
  onAnalyze: () => void;
  disabled?: boolean;
}

function getConfidenceBadge(confidence: MappingSuggestion['confidence']) {
  switch (confidence) {
    case 'high':
      return <Badge variant="default" className="bg-green-500">High</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="bg-yellow-500 text-black">Medium</Badge>;
    case 'low':
      return <Badge variant="outline">Low</Badge>;
  }
}

function getIssueBadge(issue: AnalysisIssue) {
  if (issue.severity === 'error') {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
}

export function BulkUploadAnalyzer({ isAnalyzing, analysis, onAnalyze, disabled }: BulkUploadAnalyzerProps) {
  if (isAnalyzing) {
    return (
      <Alert className="bg-primary/5 border-primary/20">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI is analyzing your file structure...
        </AlertDescription>
      </Alert>
    );
  }

  if (!analysis) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onAnalyze}
        disabled={disabled}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Analyze with AI
      </Button>
    );
  }

  const statusIcon = {
    ready: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    needs_mapping: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    needs_fixes: <XCircle className="h-5 w-5 text-destructive" />,
  }[analysis.overallStatus];

  const statusText = {
    ready: 'Ready to Import',
    needs_mapping: 'Needs Column Mapping',
    needs_fixes: 'Issues Found',
  }[analysis.overallStatus];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Analysis
          <span className="ml-auto flex items-center gap-1 text-sm font-normal">
            {statusIcon}
            {statusText}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>

        {/* Mapping Suggestions */}
        {analysis.mappingSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Column Mappings</h4>
            <div className="space-y-1">
              {analysis.mappingSuggestions.map((mapping, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                  <code className="text-xs bg-background px-1 rounded">{mapping.sourceColumn}</code>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <code className="text-xs bg-background px-1 rounded">{mapping.targetColumn}</code>
                  {getConfidenceBadge(mapping.confidence)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        {analysis.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Issues</h4>
            <div className="space-y-1">
              {analysis.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {getIssueBadge(issue)}
                  <span className={issue.severity === 'error' ? 'text-destructive' : 'text-yellow-600'}>
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
