import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Activity,
  Image,
  BarChart3,
  Users,
  Target,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useOsceAttemptsSummary,
  useOsceQuestionStats,
  type OsceQuestionStats,
} from "@/hooks/useOsceAnalytics";
import { useModuleBooks } from "@/hooks/useModuleBooks";
import { useModuleChapters } from "@/hooks/useChapters";
import { useAuthContext } from "@/contexts/AuthContext";

interface Module {
  id: string;
  name: string;
  year_id?: string;
}

export interface OsceAnalyticsDashboardProps {
  modules: Module[];
  moduleAdminModuleIds?: string[];
}

export function OsceAnalyticsDashboard({ modules, moduleAdminModuleIds }: OsceAnalyticsDashboardProps) {
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedBookLabel, setSelectedBookLabel] = useState<string>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<OsceQuestionStats | null>(null);
  
  // Filter and sort modules alphabetically
  const accessibleModules = useMemo(() => {
    const filtered = (isSuperAdmin || isPlatformAdmin)
      ? modules
      : modules.filter(m => moduleAdminModuleIds?.includes(m.id));
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
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

  const { data: summary, isLoading: summaryLoading } = useOsceAttemptsSummary(selectedModuleId || undefined);
  const { data: questionStats, isLoading: statsLoading } = useOsceQuestionStats(selectedModuleId || undefined);

  // Reset filters when module changes
  const handleModuleChange = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedBookLabel('all');
    setSelectedChapterId('all');
  };

  const handleBookChange = (bookLabel: string) => {
    setSelectedBookLabel(bookLabel);
    setSelectedChapterId('all');
  };

  // Filter stats by book and chapter
  const filteredStats = useMemo(() => {
    let result = questionStats || [];
    
    if (selectedBookLabel !== 'all') {
      const chapterIdsInBook = filteredChapters.map(c => c.id);
      result = result.filter(q => q.chapter_id && chapterIdsInBook.includes(q.chapter_id));
    }
    
    if (selectedChapterId !== 'all') {
      result = result.filter(q => q.chapter_id === selectedChapterId);
    }
    
    return result;
  }, [questionStats, selectedBookLabel, selectedChapterId, filteredChapters]);

  const truncateText = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Question ID copied to clipboard");
  };

  // Check if module has no OSCE questions
  const hasNoQuestions = !statsLoading && (!questionStats || questionStats.length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold">OSCE Analytics</h3>
        <p className="text-muted-foreground text-sm">Station-based question performance analysis</p>
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

            {/* Book Select */}
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
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a module to view OSCE analytics</p>
          </CardContent>
        </Card>
      ) : hasNoQuestions ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No OSCE questions in this module</p>
            <p className="text-sm mt-2">Add OSCE questions to see analytics here</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Stations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{summary?.totalQuestions || 0}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{summary?.totalAttempts || 0}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Score (0-5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">
                      {summary?.avgScore?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  With Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">
                      {summary?.questionsWithAttempts || 0}
                      <span className="text-sm text-muted-foreground font-normal ml-1">
                        / {summary?.totalQuestions || 0}
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Question Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Station Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station History</TableHead>
                      <TableHead className="text-center w-24">Attempts</TableHead>
                      <TableHead className="text-center w-28">Avg Score</TableHead>
                      <TableHead className="text-center w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No stations match the current filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStats.map((q) => (
                        <TableRow 
                          key={q.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedQuestion(q)}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">
                                {truncateText(q.history_text)}
                              </p>
                              {q.chapter && (
                                <p className="text-xs text-muted-foreground">
                                  Ch. {q.chapter.chapter_number}: {q.chapter.title}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={q.total_attempts < 5 ? 'text-muted-foreground' : ''}>
                              {q.total_attempts}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              q.avg_score >= 4 ? 'text-green-600' :
                              q.avg_score >= 2.5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {q.avg_score.toFixed(1)} / 5
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {q.total_attempts === 0 ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                No data
                              </Badge>
                            ) : q.avg_score >= 4 ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Good
                              </Badge>
                            ) : q.avg_score < 2.5 ? (
                              <Badge variant="destructive">
                                Needs Review
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Average
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Station Details</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {selectedQuestion && (
            <div className="space-y-6 pb-4">
              {/* Question ID */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Question ID:</span>
                <code className="text-sm font-mono">{selectedQuestion.id.slice(0, 8)}...</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleCopyId(selectedQuestion.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* History */}
              <div>
                <h4 className="font-medium mb-2">Patient History</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedQuestion.history_text}
                </p>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                  <p className="text-2xl font-bold">{selectedQuestion.total_attempts}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{selectedQuestion.avg_score.toFixed(2)} / 5</p>
                </div>
              </div>

              {/* Score Distribution */}
              {selectedQuestion.total_attempts > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Score Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedQuestion.score_distribution).map(([score, count]) => {
                      const percentage = selectedQuestion.total_attempts > 0 
                        ? (count / selectedQuestion.total_attempts) * 100 
                        : 0;
                      return (
                        <div key={score} className="flex items-center gap-3">
                          <span className="text-sm w-8">{score}/5</span>
                          <Progress value={percentage} className="flex-1 h-3" />
                          <span className="text-sm text-muted-foreground w-12">
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Statement Analysis */}
              {selectedQuestion.total_attempts > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Statement Analysis</h4>
                  <div className="space-y-3">
                    {selectedQuestion.statement_stats.map((stat, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <p className="text-sm flex-1">{stat.statement}</p>
                          <Badge variant={stat.correct_answer ? "default" : "secondary"} className="shrink-0">
                            {stat.correct_answer ? "True" : "False"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {stat.correct_count} correct
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            {stat.incorrect_count} incorrect
                          </span>
                          <span className="text-muted-foreground">
                            {stat.accuracy.toFixed(0)}% accuracy
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
