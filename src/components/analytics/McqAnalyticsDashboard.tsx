import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  TrendingUp,
  Clock,
  BarChart3,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import {
  useModuleMcqAnalytics,
  useModuleAnalyticsSummary,
  useCalculateMcqAnalytics,
  getFacilityStatus,
  getDiscriminationStatus,
  getSeverityBadgeColor,
  type McqWithAnalytics,
} from "@/hooks/useMcqAnalytics";
import { McqAnalyticsDetailModal } from "./McqAnalyticsDetailModal";

interface McqAnalyticsDashboardProps {
  moduleId: string;
  moduleName?: string;
}

type FilterType = 'all' | 'flagged' | 'critical' | 'needs-data';

export function McqAnalyticsDashboard({ moduleId, moduleName }: McqAnalyticsDashboardProps) {
  const [selectedMcq, setSelectedMcq] = useState<McqWithAnalytics | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  
  const { data: analytics, isLoading } = useModuleMcqAnalytics(moduleId);
  const { data: summary, isLoading: summaryLoading } = useModuleAnalyticsSummary(moduleId);
  const calculateMutation = useCalculateMcqAnalytics();

  const handleRecalculate = async () => {
    try {
      const result = await calculateMutation.mutateAsync({ moduleId });
      toast.success(`Analyzed ${result.processed} MCQs, ${result.flagged} flagged`);
    } catch (error) {
      toast.error("Failed to calculate analytics");
    }
  };

  const filteredAnalytics = analytics?.filter(a => {
    switch (filter) {
      case 'flagged': return a.is_flagged;
      case 'critical': return a.flag_severity === 'critical' || a.flag_severity === 'high';
      case 'needs-data': return a.total_attempts < 10;
      default: return true;
    }
  }) || [];

  const truncateStem = (stem: string, maxLength = 80) => {
    if (stem.length <= maxLength) return stem;
    return stem.slice(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">MCQ Analytics</h2>
          {moduleName && (
            <p className="text-muted-foreground">{moduleName}</p>
          )}
        </div>
        <Button
          onClick={handleRecalculate}
          disabled={calculateMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
          {calculateMutation.isPending ? "Calculating..." : "Recalculate All"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total MCQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{summary?.totalMcqs || 0}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flagged Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{summary?.flaggedCount || 0}</span>
                {summary?.criticalCount ? (
                  <Badge variant="destructive" className="text-xs">
                    {summary.criticalCount} critical
                  </Badge>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Facility
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {summary?.avgFacility !== null 
                    ? `${Math.round((summary?.avgFacility || 0) * 100)}%` 
                    : "N/A"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${
                  (summary?.healthScore || 0) >= 80 ? 'text-green-500' :
                  (summary?.healthScore || 0) >= 60 ? 'text-yellow-500' : 'text-destructive'
                }`} />
                <span className="text-2xl font-bold">{summary?.healthScore || 0}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Question Analysis</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
                  <SelectItem value="flagged">Flagged Only</SelectItem>
                  <SelectItem value="critical">Critical/High</SelectItem>
                  <SelectItem value="needs-data">Needs More Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAnalytics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {analytics?.length === 0 
                ? "No analytics data yet. Click 'Recalculate All' to generate."
                : "No questions match this filter."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">Question</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead className="text-center">Facility</TableHead>
                    <TableHead className="text-center">Discrimination</TableHead>
                    <TableHead className="text-center">Avg Time</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalytics.map((item) => {
                    const facilityStatus = getFacilityStatus(item.facility_index);
                    const discStatus = getDiscriminationStatus(item.discrimination_index);
                    
                    return (
                      <TableRow 
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedMcq(item)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {truncateStem(item.mcq?.stem || "Unknown question")}
                            </p>
                            {item.chapter && (
                              <p className="text-xs text-muted-foreground">
                                Ch. {item.chapter.chapter_number}: {item.chapter.title}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.total_attempts < 10 ? 'text-muted-foreground' : ''}>
                            {item.total_attempts}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-medium ${facilityStatus.color}`}>
                              {item.facility_index !== null 
                                ? `${Math.round(item.facility_index * 100)}%`
                                : "—"}
                            </span>
                            <span className={`text-xs ${facilityStatus.color}`}>
                              {facilityStatus.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-medium ${discStatus.color}`}>
                              {item.discrimination_index !== null 
                                ? item.discrimination_index.toFixed(2)
                                : "—"}
                            </span>
                            <span className={`text-xs ${discStatus.color}`}>
                              {discStatus.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {item.avg_time_seconds 
                                ? `${item.avg_time_seconds}s`
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_flagged ? (
                            <Badge className={getSeverityBadgeColor(item.flag_severity)}>
                              {item.flag_severity || 'Flagged'}
                            </Badge>
                          ) : item.total_attempts >= 10 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Good
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Needs data
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedMcq && (
        <McqAnalyticsDetailModal
          analytics={selectedMcq}
          open={!!selectedMcq}
          onClose={() => setSelectedMcq(null)}
        />
      )}
    </div>
  );
}
