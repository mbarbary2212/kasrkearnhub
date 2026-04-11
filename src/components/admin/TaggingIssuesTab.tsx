import { useState, useMemo } from 'react';
import { useTaggingIssues, IssueType, TaggingIssue } from '@/hooks/useTaggingIssues';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Download, RefreshCw, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const ISSUE_LABELS: Record<IssueType, string> = {
  no_chapter: 'No Chapter',
  no_section: 'No Section',
  no_sections_defined: 'No Sections Defined',
};

const ISSUE_COLORS: Record<IssueType, string> = {
  no_chapter: 'destructive',
  no_section: 'secondary',
  no_sections_defined: 'outline',
};

export function TaggingIssuesTab() {
  const {
    issues, allFiltered, total, totalAll, isLoading, refetch,
    filters, setFilters, page, setPage, totalPages, PAGE_SIZE,
    tableNames, moduleIds,
    assignChapter, assignSection, bulkAssignChapter, bulkAssignSection,
  } = useTaggingIssues();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkChapterId, setBulkChapterId] = useState('');
  const [bulkSectionId, setBulkSectionId] = useState('');

  // Fetch modules for labels
  const { data: modules = [] } = useQuery({
    queryKey: ['modules-list'],
    queryFn: async () => {
      const { data } = await supabase.from('modules').select('id, name').order('name');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch all chapters
  const { data: chapters = [] } = useQuery({
    queryKey: ['all-chapters'],
    queryFn: async () => {
      const { data } = await supabase.from('module_chapters').select('id, title, module_id').order('title');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch all sections
  const { data: sections = [] } = useQuery({
    queryKey: ['all-sections'],
    queryFn: async () => {
      const { data } = await supabase.from('sections').select('id, title, chapter_id').order('order_index');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const moduleLookup = useMemo(() => Object.fromEntries(modules.map(m => [m.id, m.name])), [modules]);
  const chapterLookup = useMemo(() => Object.fromEntries(chapters.map(c => [c.id, c.title])), [chapters]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(issues.map(i => `${i.tableName}:${i.id}`)));
    }
  };

  const handleAssignChapter = async (issue: TaggingIssue, chapterId: string) => {
    try {
      await assignChapter.mutateAsync({ tableName: issue.tableName, id: issue.id, chapterId });
      toast.success('Chapter assigned');
    } catch {
      toast.error('Failed to assign chapter');
    }
  };

  const handleAssignSection = async (issue: TaggingIssue, sectionId: string) => {
    try {
      await assignSection.mutateAsync({ tableName: issue.tableName, id: issue.id, sectionId });
      toast.success('Section assigned');
    } catch {
      toast.error('Failed to assign section');
    }
  };

  const handleBulkChapter = async () => {
    if (!bulkChapterId || selected.size === 0) return;
    const items = issues
      .filter(i => selected.has(`${i.tableName}:${i.id}`))
      .map(i => ({ tableName: i.tableName, id: i.id, chapterId: bulkChapterId }));
    try {
      await bulkAssignChapter.mutateAsync(items);
      toast.success(`Assigned chapter to ${items.length} items`);
      setSelected(new Set());
      setBulkChapterId('');
    } catch {
      toast.error('Bulk assign failed');
    }
  };

  const handleBulkSection = async () => {
    if (!bulkSectionId || selected.size === 0) return;
    const items = issues
      .filter(i => selected.has(`${i.tableName}:${i.id}`))
      .map(i => ({ tableName: i.tableName, id: i.id, sectionId: bulkSectionId }));
    try {
      await bulkAssignSection.mutateAsync(items);
      toast.success(`Assigned section to ${items.length} items`);
      setSelected(new Set());
      setBulkSectionId('');
    } catch {
      toast.error('Bulk assign failed');
    }
  };

  const exportCsv = () => {
    const rows = [['Content Preview', 'Table', 'Module', 'Chapter', 'Section', 'Issue Type'].join(',')];
    allFiltered.forEach(i => {
      rows.push([
        `"${(i.contentPreview || '').replace(/"/g, '""')}"`,
        i.tableName,
        moduleLookup[i.moduleId || ''] || '',
        chapterLookup[i.chapterId || ''] || '',
        i.sectionId || '',
        i.issueType,
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tagging-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const noChapterCount = useMemo(() => allFiltered.filter(i => i.issueType === 'no_chapter').length, [allFiltered]);
  const noSectionCount = useMemo(() => allFiltered.filter(i => i.issueType === 'no_section').length, [allFiltered]);
  const noSectionsDefinedCount = useMemo(() => allFiltered.filter(i => i.issueType === 'no_sections_defined').length, [allFiltered]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Issues</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totalAll}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-destructive">No Chapter</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{noChapterCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Section</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{noSectionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-orange-600">Chapters w/o Sections</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{noSectionsDefinedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.issueType} onValueChange={v => { setFilters(f => ({ ...f, issueType: v as any })); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Issue type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All issues</SelectItem>
            <SelectItem value="no_chapter">No Chapter</SelectItem>
            <SelectItem value="no_section">No Section</SelectItem>
            <SelectItem value="no_sections_defined">No Sections Defined</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.tableName} onValueChange={v => { setFilters(f => ({ ...f, tableName: v })); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tables</SelectItem>
            {tableNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.moduleId} onValueChange={v => { setFilters(f => ({ ...f, moduleId: v })); setPage(0); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {moduleIds.map(id => <SelectItem key={id} value={id}>{moduleLookup[id] || id.slice(0, 8)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search content..."
          value={filters.search}
          onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(0); }}
          className="w-[200px]"
        />

        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>

        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select value={bulkChapterId} onValueChange={setBulkChapterId}>
            <SelectTrigger className="w-[200px] h-8"><SelectValue placeholder="Pick chapter..." /></SelectTrigger>
            <SelectContent>
              {chapters.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkChapter} disabled={!bulkChapterId || bulkAssignChapter.isPending}>
            {bulkAssignChapter.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
            Assign Chapter
          </Button>

          <Select value={bulkSectionId} onValueChange={setBulkSectionId}>
            <SelectTrigger className="w-[200px] h-8"><SelectValue placeholder="Pick section..." /></SelectTrigger>
            <SelectContent>
              {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkSection} disabled={!bulkSectionId || bulkAssignSection.isPending}>
            {bulkAssignSection.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
            Assign Section
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Scanning content tables...</span>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={issues.length > 0 && selected.size === issues.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead className="w-[140px]">Table</TableHead>
                  <TableHead className="w-[140px]">Module</TableHead>
                  <TableHead className="w-[140px]">Issue</TableHead>
                  <TableHead className="w-[220px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {total === 0 ? 'No tagging issues found 🎉' : 'No results matching filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map(issue => (
                    <TaggingIssueRow
                      key={`${issue.tableName}:${issue.id}`}
                      issue={issue}
                      selected={selected.has(`${issue.tableName}:${issue.id}`)}
                      onToggle={() => toggleSelect(`${issue.tableName}:${issue.id}`)}
                      moduleName={moduleLookup[issue.moduleId || '']}
                      chapters={chapters.filter(c => !issue.moduleId || c.module_id === issue.moduleId)}
                      sections={sections.filter(s => s.chapter_id === issue.chapterId)}
                      onAssignChapter={(chId) => handleAssignChapter(issue, chId)}
                      onAssignSection={(sId) => handleAssignSection(issue, sId)}
                      isPending={assignChapter.isPending || assignSection.isPending}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TaggingIssueRow({
  issue, selected, onToggle, moduleName, chapters, sections,
  onAssignChapter, onAssignSection, isPending,
}: {
  issue: TaggingIssue;
  selected: boolean;
  onToggle: () => void;
  moduleName?: string;
  chapters: { id: string; title: string }[];
  sections: { id: string; title: string }[];
  onAssignChapter: (chapterId: string) => void;
  onAssignSection: (sectionId: string) => void;
  isPending: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell className="max-w-[300px] truncate text-sm">
        {issue.contentPreview || <span className="text-muted-foreground italic">No preview</span>}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs font-mono">{issue.tableName}</Badge>
      </TableCell>
      <TableCell className="text-sm truncate">{moduleName || '—'}</TableCell>
      <TableCell>
        <Badge variant={ISSUE_COLORS[issue.issueType] as any}>
          {issue.issueType === 'no_sections_defined' && <AlertTriangle className="w-3 h-3 mr-1" />}
          {ISSUE_LABELS[issue.issueType]}
        </Badge>
      </TableCell>
      <TableCell>
        {issue.issueType === 'no_chapter' && (
          <Select onValueChange={onAssignChapter} disabled={isPending}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue placeholder="Assign chapter..." />
            </SelectTrigger>
            <SelectContent>
              {chapters.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {issue.issueType === 'no_section' && (
          sections.length > 0 ? (
            <Select onValueChange={onAssignSection} disabled={isPending}>
              <SelectTrigger className="h-8 w-[190px] text-xs">
                <SelectValue placeholder="Assign section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">No sections for this chapter</span>
          )
        )}
        {issue.issueType === 'no_sections_defined' && (
          <span className="text-xs text-orange-600">Define sections in blueprint</span>
        )}
      </TableCell>
    </TableRow>
  );
}
