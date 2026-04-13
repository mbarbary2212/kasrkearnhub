import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';

export type IssueType = 'no_chapter' | 'no_section' | 'no_sections_defined';

export interface TaggingIssue {
  id: string;
  tableName: string;
  contentPreview: string;
  moduleId: string | null;
  chapterId: string | null;
  sectionId: string | null;
  issueType: IssueType;
}

interface ContentTableConfig {
  table: string;
  previewCol: string;
  hasSectionId: boolean;
  hasIsDeleted: boolean;
}

const CONTENT_TABLES: ContentTableConfig[] = [
  { table: 'mcqs', previewCol: 'stem', hasSectionId: true, hasIsDeleted: true },
  { table: 'essays', previewCol: 'title', hasSectionId: true, hasIsDeleted: true },
  { table: 'flashcards', previewCol: 'front', hasSectionId: false, hasIsDeleted: true },
  { table: 'lectures', previewCol: 'title', hasSectionId: true, hasIsDeleted: true },
  { table: 'resources', previewCol: 'title', hasSectionId: true, hasIsDeleted: true },
  { table: 'practicals', previewCol: 'title', hasSectionId: true, hasIsDeleted: true },
  { table: 'osce_questions', previewCol: 'history_text', hasSectionId: true, hasIsDeleted: true },
  { table: 'matching_questions', previewCol: 'instruction', hasSectionId: true, hasIsDeleted: true },
  { table: 'true_false_questions', previewCol: 'statement', hasSectionId: true, hasIsDeleted: true },
  { table: 'case_scenarios', previewCol: 'stem', hasSectionId: true, hasIsDeleted: true },
  { table: 'virtual_patient_cases', previewCol: 'title', hasSectionId: true, hasIsDeleted: true },
  { table: 'concepts', previewCol: 'title', hasSectionId: true, hasIsDeleted: false },
];

async function fetchNoChapterItems(config: ContentTableConfig): Promise<TaggingIssue[]> {
  let query = supabase
    .from(config.table as any)
    .select(`id, ${config.previewCol}, module_id, chapter_id${config.hasSectionId ? ', section_id' : ''}`)
    .is('chapter_id', null)
    .limit(100);

  if (config.hasIsDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  if (error) {
    console.warn(`Error fetching no_chapter from ${config.table}:`, error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    tableName: config.table,
    contentPreview: (row[config.previewCol] || '').substring(0, 120),
    moduleId: row.module_id || null,
    chapterId: null,
    sectionId: config.hasSectionId ? (row.section_id || null) : null,
    issueType: 'no_chapter' as IssueType,
  }));
}

async function fetchNoSectionItems(config: ContentTableConfig): Promise<TaggingIssue[]> {
  if (!config.hasSectionId) return [];

  let query = supabase
    .from(config.table as any)
    .select(`id, ${config.previewCol}, module_id, chapter_id, section_id`)
    .is('section_id', null)
    .not('chapter_id', 'is', null)
    .limit(100);

  if (config.hasIsDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  if (error) {
    console.warn(`Error fetching no_section from ${config.table}:`, error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    tableName: config.table,
    contentPreview: (row[config.previewCol] || '').substring(0, 120),
    moduleId: row.module_id || null,
    chapterId: row.chapter_id || null,
    sectionId: null,
    issueType: 'no_section' as IssueType,
  }));
}

async function fetchChaptersWithNoSections(): Promise<TaggingIssue[]> {
  // Get all chapters
  const { data: chapters, error: chErr } = await supabase
    .from('module_chapters')
    .select('id, title, module_id')
    .limit(500);

  if (chErr || !chapters) return [];

  // Get chapters that have at least one section
  const { data: sectioned, error: secErr } = await supabase
    .from('sections')
    .select('chapter_id')
    .limit(1000);

  if (secErr) return [];

  const sectionedSet = new Set((sectioned || []).map((s: any) => s.chapter_id));

  return chapters
    .filter(ch => !sectionedSet.has(ch.id))
    .map(ch => ({
      id: ch.id,
      tableName: 'module_chapters',
      contentPreview: ch.title || 'Untitled chapter',
      moduleId: ch.module_id || null,
      chapterId: ch.id,
      sectionId: null,
      issueType: 'no_sections_defined' as IssueType,
    }));
}

export interface TaggingIssuesFilters {
  issueType: IssueType | 'all';
  tableName: string;
  moduleId: string;
  search: string;
}

export function useTaggingIssues() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TaggingIssuesFilters>({
    issueType: 'all',
    tableName: 'all',
    moduleId: 'all',
    search: '',
  });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: allIssues = [], isLoading, refetch } = useQuery({
    queryKey: ['tagging-issues'],
    queryFn: async () => {
      const results = await Promise.all([
        ...CONTENT_TABLES.map(fetchNoChapterItems),
        ...CONTENT_TABLES.map(fetchNoSectionItems),
        fetchChaptersWithNoSections(),
      ]);
      return results.flat();
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    let items = allIssues;
    if (filters.issueType !== 'all') items = items.filter(i => i.issueType === filters.issueType);
    if (filters.tableName !== 'all') items = items.filter(i => i.tableName === filters.tableName);
    if (filters.moduleId !== 'all') items = items.filter(i => i.moduleId === filters.moduleId);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      items = items.filter(i => i.contentPreview.toLowerCase().includes(s));
    }
    return items;
  }, [allIssues, filters]);

  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Unique values for filters
  const tableNames = useMemo(() => [...new Set(allIssues.map(i => i.tableName))].sort(), [allIssues]);
  const moduleIds = useMemo(() => [...new Set(allIssues.map(i => i.moduleId).filter(Boolean))] as string[], [allIssues]);

  const assignChapter = useMutation({
    mutationFn: async ({ tableName, id, chapterId }: { tableName: string; id: string; chapterId: string }) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ chapter_id: chapterId } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tagging-issues'] }),
  });

  const assignSection = useMutation({
    mutationFn: async ({ tableName, id, sectionId }: { tableName: string; id: string; sectionId: string }) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ section_id: sectionId } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tagging-issues'] }),
  });

  const bulkAssignChapter = useMutation({
    mutationFn: async (items: { tableName: string; id: string; chapterId: string }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from(item.tableName as any)
          .update({ chapter_id: item.chapterId } as any)
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tagging-issues'] }),
  });

  const bulkAssignSection = useMutation({
    mutationFn: async (items: { tableName: string; id: string; sectionId: string }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from(item.tableName as any)
          .update({ section_id: item.sectionId } as any)
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tagging-issues'] }),
  });

  return {
    issues: paged,
    allFiltered: filtered,
    total: filtered.length,
    totalAll: allIssues.length,
    isLoading,
    refetch,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    tableNames,
    moduleIds,
    assignChapter,
    assignSection,
    bulkAssignChapter,
    bulkAssignSection,
  };
}
