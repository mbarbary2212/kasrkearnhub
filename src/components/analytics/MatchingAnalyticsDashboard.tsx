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
  GitCompare,
  BarChart3,
  Users,
  CheckCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useMatchingAttemptsSummary,
  useMatchingQuestionStats,
  type MatchingQuestionStats,
} from "@/hooks/useMatchingAnalytics";
import { useModuleBooks } from "@/hooks/useModuleBooks";
import { useModuleChapters } from "@/hooks/useChapters";
import { useAuthContext } from "@/contexts/AuthContext";

interface Module {
  id: string;
  name: string;
  year_id?: string;
}

export interface MatchingAnalyticsDashboardProps {
  modules: Module[];
  moduleAdminModuleIds?: string[];
}

export function MatchingAnalyticsDashboard({ modules, moduleAdminModuleIds }: MatchingAnalyticsDashboardProps) {
  const { isSuperAdmin, isPlatformAdmin } = useAuthContext();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedBookLabel, setSelectedBookLabel] = useState<string>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<MatchingQuestionStats | null>(null);
  
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

  const { data: summary, isLoading: summaryLoading } = useMatchingAttemptsSummary(selectedModuleId || undefined);
  const { data: questionStats, isLoading: statsLoading } = useMatchingQuestionStats(selectedModuleId || undefined);

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

  // Check if module has no Matching questions
  const hasNoQuestions = !statsLoading && (!questionStats || questionStats.length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold">Matching Analytics</h3>
        <p className="text-muted-foreground text-sm">Column matching question completion analysis</p>
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
            <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a module to view Matching analytics</p>
          </CardContent>
        </Card>
      ) : hasNoQuestions ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No Matching questions in this module</p>
            <p className="text-sm mt-2">Add Matching questions to see analytics here</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Questions
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
                  Total Completions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{summary?.totalCompletions || 0}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  With Completions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">
                      {summary?.questionsWithCompletions || 0}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  No Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">
                      {summary?.questionsNoCompletions || 0}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Question Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Analysis</CardTitle>
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
                      <TableHead>Instruction</TableHead>
                      <TableHead className="text-center w-32">Completions</TableHead>
                      <TableHead className="text-center w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No questions match the current filters
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
                                {truncateText(q.instruction)}
                              </p>
                              {q.chapter && (
                                <p className="text-xs text-muted-foreground">
                                  Ch. {q.chapter.chapter_number}: {q.chapter.title}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={q.total_completions === 0 ? 'text-muted-foreground' : ''}>
                              {q.total_completions}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {q.total_completions === 0 ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                No data
                              </Badge>
                            ) : q.total_completions >= 5 ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Low Activity
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-6">
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

              {/* Instruction */}
              <div>
                <h4 className="font-medium mb-2">Instruction</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedQuestion.instruction}
                </p>
              </div>

              {/* Chapter */}
              {selectedQuestion.chapter && (
                <div>
                  <h4 className="font-medium mb-2">Chapter</h4>
                  <p className="text-sm text-muted-foreground">
                    Ch. {selectedQuestion.chapter.chapter_number}: {selectedQuestion.chapter.title}
                    {selectedQuestion.chapter.book_label && (
                      <span className="ml-2 text-xs">({selectedQuestion.chapter.book_label})</span>
                    )}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Completions</p>
                <p className="text-2xl font-bold">{selectedQuestion.total_completions}</p>
              </div>

              {selectedQuestion.total_completions === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No completions yet - more data needed for detailed analysis
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Note: Matching questions currently track completions only. More detailed analytics 
                (like pair-level accuracy) can be added when attempt tracking is enabled.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
