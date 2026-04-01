import { useState, useMemo } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  TrendingUp,
  Clock,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronRight,
  List,
  Layers,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
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
import { useModuleBooks } from "@/hooks/useModuleBooks";
import { useModuleChapters } from "@/hooks/useChapters";
import { McqAnalyticsDetailModal } from "./McqAnalyticsDetailModal";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQualitySignals, useModuleQualitySummary } from "@/hooks/useContentQualitySignals";
import { QualitySignalBadges } from "./QualitySignalBadges";

interface Module {
  id: string;
  name: string;
  year_id?: string;
}

export interface McqAnalyticsDashboardProps {
  modules: Module[];
  moduleAdminModuleIds?: string[];
  questionFormat?: 'mcq' | 'sba';
}

type FilterType = 'all' | 'flagged' | 'critical' | 'needs-data';
type ViewMode = 'flat' | 'grouped';

export function McqAnalyticsDashboard({ modules, moduleAdminModuleIds, questionFormat = 'mcq' }: McqAnalyticsDashboardProps) {
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedBookLabel, setSelectedBookLabel] = useState<string>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [selectedMcq, setSelectedMcq] = useState<McqWithAnalytics | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  
  // Filter and sort modules by code number (e.g., 101, 205, 310)
  const accessibleModules = useMemo(() => {
    const filtered = (isSuperAdmin || isPlatformAdmin)
      ? modules
      : modules.filter(m => moduleAdminModuleIds?.includes(m.id));
    return filtered.sort((a, b) => {
      const numA = parseInt(a.name?.match(/\d+/)?.[0] || '999');
      const numB = parseInt(b.name?.match(/\d+/)?.[0] || '999');
      return numA - numB;
    });
  }, [modules, moduleAdminModuleIds, isSuperAdmin, isPlatformAdmin]);

  // Fetch books and chapters for the selected module
  const { data: books } = useModuleBooks(selectedModuleId || undefined);
  const { data: chapters } = useModuleChapters(selectedModuleId || undefined);
  
  // Filter chapters by selected book
  const filteredChapters = useMemo(() => {
    if (!chapters) return [];
    if (selectedBookLabel === 'all') return chapters;
    return chapters.filter(c => c.book_label === selectedBookLabel);
  }, [chapters, selectedBookLabel]);

  const { data: analytics, isLoading } = useModuleMcqAnalytics(selectedModuleId || '');
  const { data: summary, isLoading: summaryLoading } = useModuleAnalyticsSummary(selectedModuleId || '');
  const calculateMutation = useCalculateMcqAnalytics();
  const materialType = questionFormat === 'sba' ? 'sba' : 'mcq';
  const { data: qualitySummary } = useModuleQualitySummary(selectedModuleId || undefined, materialType);

  // Get material IDs for quality signals
  const materialIds = useMemo(() => (analytics || []).map(a => a.mcq_id), [analytics]);
  const { data: qualitySignals } = useQualitySignals(materialType, materialIds);

  // Reset book/chapter when module changes
  const handleModuleChange = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedBookLabel('all');
    setSelectedChapterId('all');
    setExpandedChapters(new Set());
  };

  // Reset chapter when book changes
  const handleBookChange = (bookLabel: string) => {
    setSelectedBookLabel(bookLabel);
    setSelectedChapterId('all');
  };

  const handleRecalculate = async () => {
    if (!selectedModuleId) {
      toast.error("Please select a module first");
      return;
    }
    try {
      const result = await calculateMutation.mutateAsync({ moduleId: selectedModuleId });
      toast.success(`Analyzed ${result.processed} MCQs, ${result.flagged} flagged`);
    } catch (error) {
      toast.error("Failed to calculate analytics");
    }
  };

  // Filter analytics by book, chapter, and filter type
  const filteredAnalytics = useMemo(() => {
    let result = analytics || [];
    
    // Filter by book (chapters in that book)
    if (selectedBookLabel !== 'all') {
      const chapterIdsInBook = filteredChapters.map(c => c.id);
      result = result.filter(a => a.chapter_id && chapterIdsInBook.includes(a.chapter_id));
    }
    
    // Filter by specific chapter
    if (selectedChapterId !== 'all') {
      result = result.filter(a => a.chapter_id === selectedChapterId);
    }
    
    // Apply status filter
    switch (filter) {
      case 'flagged': 
        result = result.filter(a => a.is_flagged);
        break;
      case 'critical': 
        result = result.filter(a => a.flag_severity === 'critical' || a.flag_severity === 'high');
        break;
      case 'needs-data': 
        result = result.filter(a => a.total_attempts < 10);
        break;
    }
    
    return result;
  }, [analytics, selectedBookLabel, selectedChapterId, filteredChapters, filter]);

  // Group analytics by chapter for grouped view
  const groupedAnalytics = useMemo(() => {
    const groups: Record<string, { chapter: McqWithAnalytics['chapter']; items: McqWithAnalytics[] }> = {};
    
    filteredAnalytics.forEach(item => {
      const chapterId = item.chapter_id || 'uncategorized';
      if (!groups[chapterId]) {
        groups[chapterId] = {
          chapter: item.chapter,
          items: []
        };
      }
      groups[chapterId].items.push(item);
    });
    
    // Sort by chapter number
    return Object.entries(groups).sort((a, b) => {
      const aNum = a[1].chapter?.chapter_number ?? 999;
      const bNum = b[1].chapter?.chapter_number ?? 999;
      return aNum - bNum;
    });
  }, [filteredAnalytics]);

  const toggleChapterExpand = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const truncateStem = (stem: string, maxLength = 80) => {
    if (stem.length <= maxLength) return stem;
    return stem.slice(0, maxLength) + "...";
  };

  const renderQuestionRow = (item: McqWithAnalytics, showChapter = true) => {
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
            {showChapter && item.chapter && (
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
        <TableCell className="text-center">
          <QualitySignalBadges signals={qualitySignals?.[item.mcq_id]} />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">MCQ Analytics</h2>
          <p className="text-muted-foreground">Psychometric analysis of MCQ performance</p>
        </div>
        <Button
          onClick={handleRecalculate}
          disabled={calculateMutation.isPending || !selectedModuleId}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
          {calculateMutation.isPending ? "Calculating..." : "Recalculate"}
        </Button>
      </div>

      {/* Hierarchical Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Module Select */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Module:</span>
              <Select value={selectedModuleId} onValueChange={handleModuleChange}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Book/Department Select - only show if module is selected and has books */}
            {selectedModuleId && books && books.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Book:</span>
                <Select value={selectedBookLabel} onValueChange={handleBookChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Books" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    {books.map((b) => (
                      <SelectItem key={b.id} value={b.book_label}>
                        {b.book_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Chapter Select */}
            {selectedModuleId && filteredChapters.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Chapter:</span>
                <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All Chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chapters</SelectItem>
                    {filteredChapters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Ch. {c.chapter_number}: {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedModuleId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a module to view MCQ analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
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

          {/* Filter, View Toggle, and Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Question Analysis</CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'flat' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 rounded-r-none"
                      onClick={() => setViewMode('flat')}
                    >
                      <List className="h-4 w-4 mr-1" />
                      Flat
                    </Button>
                    <Button
                      variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 rounded-l-none"
                      onClick={() => setViewMode('grouped')}
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      Grouped
                    </Button>
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                      <SelectTrigger className="w-[160px]">
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
                    ? "No analytics data yet. Click 'Recalculate' to generate."
                    : "No questions match this filter."}
                </div>
              ) : viewMode === 'flat' ? (
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
                      {filteredAnalytics.map((item) => renderQuestionRow(item, true))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Grouped View */
                <div className="space-y-2">
                  {groupedAnalytics.map(([chapterId, group]) => {
                    const isExpanded = expandedChapters.has(chapterId);
                    const flaggedCount = group.items.filter(i => i.is_flagged).length;
                    
                    return (
                      <Collapsible
                        key={chapterId}
                        open={isExpanded}
                        onOpenChange={() => toggleChapterExpand(chapterId)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium">
                                {group.chapter 
                                  ? `Ch. ${group.chapter.chapter_number}: ${group.chapter.title}`
                                  : "Uncategorized"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {group.items.length} questions
                              </span>
                              {flaggedCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {flaggedCount} flagged
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 overflow-x-auto">
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
                                {group.items.map((item) => renderQuestionRow(item, false))}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
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
        </>
      )}
    </div>
  );
}
