import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentQualitySection } from "./ContentQualitySection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Copy,
  ExternalLink,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import {
  type McqWithAnalytics,
  getFacilityStatus,
  getDiscriminationStatus,
  getSeverityBadgeColor,
} from "@/hooks/useMcqAnalytics";

interface McqAnalyticsDetailModalProps {
  analytics: McqWithAnalytics;
  open: boolean;
  onClose: () => void;
}

export function McqAnalyticsDetailModal({ 
  analytics, 
  open, 
  onClose 
}: McqAnalyticsDetailModalProps) {
  const mcq = analytics.mcq;
  const facilityStatus = getFacilityStatus(analytics.facility_index);
  const discStatus = getDiscriminationStatus(analytics.discrimination_index);

  // Short question ID for display (first 8 chars of UUID)
  const shortId = analytics.mcq_id.slice(0, 8).toUpperCase();

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(analytics.mcq_id);
      toast.success("Question ID copied to clipboard");
    } catch {
      toast.error("Failed to copy ID");
    }
  };

  // Calculate max selections for bar scaling
  const maxSelections = Math.max(
    ...Object.values(analytics.distractor_analysis || {}),
    1
  );

  // Get suggestions based on issues
  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    if (analytics.facility_index !== null) {
      if (analytics.facility_index === 0) {
        suggestions.push("Verify the answer key is correct - no students answered correctly.");
      } else if (analytics.facility_index < 0.2) {
        suggestions.push("Consider simplifying the question or providing better instruction on this topic.");
      } else if (analytics.facility_index > 0.85) {
        suggestions.push("This question may be too easy. Consider adding more challenging distractors.");
      }
    }
    
    if (analytics.discrimination_index !== null && analytics.discrimination_index < 0) {
      suggestions.push("Low-performing students do better on this question - check if the question is misleading.");
    }
    
    // Check for unused distractors
    const unusedOptions = Object.entries(analytics.distractor_analysis || {})
      .filter(([key, count]) => count === 0 && key !== mcq?.correct_key)
      .map(([key]) => key);
    
    if (unusedOptions.length > 0) {
      suggestions.push(`Options ${unusedOptions.join(', ')} are never selected - make them more plausible.`);
    }
    
    // Check for popular wrong answers
    const correctCount = analytics.distractor_analysis?.[mcq?.correct_key || ''] || 0;
    const morePopularWrong = Object.entries(analytics.distractor_analysis || {})
      .filter(([key, count]) => key !== mcq?.correct_key && count > correctCount)
      .map(([key]) => key);
    
    if (morePopularWrong.length > 0) {
      suggestions.push(`Options ${morePopularWrong.join(', ')} are selected more than the correct answer - investigate why.`);
    }
    
    if (suggestions.length === 0 && analytics.total_attempts >= 10) {
      suggestions.push("This question is performing well. No immediate action needed.");
    }
    
    if (analytics.total_attempts < 10) {
      suggestions.push("Not enough attempts for reliable analysis. Wait for more student responses.");
    }
    
    return suggestions;
  };

  const suggestions = getSuggestions();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Question Analytics
              {analytics.is_flagged && (
                <Badge className={getSeverityBadgeColor(analytics.flag_severity)}>
                  {analytics.flag_severity}
                </Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question ID Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                <Hash className="h-3 w-3 mr-1" />
                {shortId}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={handleCopyId}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Full ID
              </Button>
            </div>
          </div>

          {/* Question Display */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{mcq?.stem || "Question not available"}</p>
              {analytics.chapter && (
                <p className="text-sm text-muted-foreground mt-2">
                  Chapter {analytics.chapter.chapter_number}: {analytics.chapter.title}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Total Attempts</span>
                </div>
                <span className="text-2xl font-bold">{analytics.total_attempts}</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Facility Index</span>
                </div>
                <span className={`text-2xl font-bold ${facilityStatus.color}`}>
                  {analytics.facility_index !== null 
                    ? `${Math.round(analytics.facility_index * 100)}%`
                    : "—"}
                </span>
                <p className={`text-xs ${facilityStatus.color}`}>{facilityStatus.label}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs">Discrimination</span>
                </div>
                <span className={`text-2xl font-bold ${discStatus.color}`}>
                  {analytics.discrimination_index !== null 
                    ? analytics.discrimination_index.toFixed(2)
                    : "—"}
                </span>
                <p className={`text-xs ${discStatus.color}`}>{discStatus.label}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Avg Time</span>
                </div>
                <span className="text-2xl font-bold">
                  {analytics.avg_time_seconds ? `${analytics.avg_time_seconds}s` : "—"}
                </span>
                {analytics.min_time_seconds && analytics.max_time_seconds && (
                  <p className="text-xs text-muted-foreground">
                    Range: {analytics.min_time_seconds}s - {analytics.max_time_seconds}s
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Answer Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Answer Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mcq?.choices?.map((choice) => {
                const count = analytics.distractor_analysis?.[choice.key] || 0;
                const percentage = analytics.total_attempts > 0 
                  ? (count / analytics.total_attempts) * 100 
                  : 0;
                const isCorrect = choice.key === mcq.correct_key;
                
                return (
                  <div key={choice.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isCorrect ? 'text-green-600' : ''}`}>
                          {choice.key}.
                        </span>
                        <span className={`truncate max-w-[300px] ${isCorrect ? 'text-green-600 font-medium' : ''}`}>
                          {choice.text}
                        </span>
                        {isCorrect && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <Progress 
                      value={(count / maxSelections) * 100} 
                      className={`h-2 ${isCorrect ? '[&>div]:bg-green-500' : '[&>div]:bg-primary'}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Flag Reasons */}
          {analytics.flag_reasons && analytics.flag_reasons.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  Issues Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-orange-700">
                  {analytics.flag_reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                <Lightbulb className="h-4 w-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                {suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Separator />

          <p className="text-xs text-muted-foreground text-center">
            Last calculated: {new Date(analytics.last_calculated_at).toLocaleString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
