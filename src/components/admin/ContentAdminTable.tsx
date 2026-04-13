import { useState, useCallback, useMemo, useEffect } from 'react';
import { Pencil, Trash2, Download, Check, X, ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBulkDeleteContent, useBulkUpdateSection, type ContentTableName } from '@/hooks/useContentBulkOperations';
import { exportToCsv, type ExportColumn } from '@/lib/csvExport';
import type { Section } from '@/hooks/useSections';
import { BulkSectionAssignment, AutoTagSectionsButton } from '@/components/sections';
import { MoveToChapterModal } from '@/components/admin/MoveToChapterModal';
export interface ColumnConfig<T> {
  key: keyof T | 'actions' | 'select' | 'section';
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface ContentAdminTableProps<T extends { id: string; section_id?: string | null }> {
  data: T[];
  columns: ColumnConfig<T>[];
  contentTable: ContentTableName;
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  sections?: Section[];
  csvExportConfig?: {
    filename: string;
    columns: ExportColumn<T>[];
  };
  emptyMessage?: string;
}

export function ContentAdminTable<T extends { id: string; section_id?: string | null }>({
  data,
  columns,
  contentTable,
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
  sections = [],
  csvExportConfig,
  emptyMessage = 'No items found',
}: ContentAdminTableProps<T>) {
  const PAGE_SIZE = 30;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const bulkDelete = useBulkDeleteContent(contentTable);
  const bulkUpdateSection = useBulkUpdateSection(contentTable);

  // Filter data by search query across all string fields and rendered columns
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data;
    return data.filter(item => {
      // Search all string/number values in the item
      for (const key of Object.keys(item)) {
        const val = (item as any)[key];
        if (typeof val === 'string' && val.toLowerCase().includes(q)) return true;
        if (typeof val === 'number' && String(val).includes(q)) return true;
      }
      // Also check section name
      if (item.section_id) {
        const sectionName = sections.find(s => s.id === item.section_id)?.name;
        if (sectionName && sectionName.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [data, searchQuery, sections]);

  // Reset page when data or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredData, currentPage]
  );

  const allSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedData.forEach(item => next.add(item.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedData.forEach(item => next.delete(item.id));
        return next;
      });
    }
  }, [paginatedData]);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync({
        ids: Array.from(selectedIds),
        chapterId,
        topicId,
      });
      toast.success(`Deleted ${selectedIds.size} items`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to delete items');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const handleSectionChange = async (itemId: string, sectionId: string | null) => {
    try {
      await bulkUpdateSection.mutateAsync({
        ids: [itemId],
        sectionId,
      });
      toast.success('Section updated');
    } catch (error) {
      toast.error('Failed to update section');
    }
  };

  const handleExportCsv = () => {
    if (!csvExportConfig) return;
    const exportData = searchQuery.trim() ? filteredData : data;
    exportToCsv(exportData, csvExportConfig.columns, csvExportConfig.filename, sections);
    toast.success('CSV exported');
  };

  const getSectionName = useCallback((sectionId: string | null | undefined) => {
    if (!sectionId) return null;
    return sections.find(s => s.id === sectionId)?.name || null;
  }, [sections]);

  // Render column cell content
  const renderCell = (item: T, column: ColumnConfig<T>) => {
    if (column.key === 'select') {
      return (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onCheckedChange={(checked) => toggleOne(item.id, !!checked)}
          aria-label="Select row"
        />
      );
    }

    if (column.key === 'section') {
      if (sections.length === 0) {
        const sectionName = getSectionName(item.section_id);
        return sectionName ? (
          <Badge variant="outline" className="text-xs">{sectionName}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      }

      return (
        <Select
          value={item.section_id || 'unassigned'}
          onValueChange={(v) => handleSectionChange(item.id, v === 'unassigned' ? null : v)}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
            {sections.map(section => (
              <SelectItem key={section.id} value={section.id} className="text-xs">
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (column.key === 'actions') {
      return (
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      );
    }

    if (column.render) {
      return column.render(item);
    }

    const value = item[column.key as keyof T];
    if (typeof value === 'boolean') {
      return value ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground" />;
    }
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }
    return String(value);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-48 pl-8 text-xs"
            />
          </div>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="h-7"
              >
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="h-7 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              {sections.length > 0 && chapterId && (
                <BulkSectionAssignment
                  chapterId={chapterId}
                  topicId={topicId}
                  selectedIds={Array.from(selectedIds)}
                  contentTable={contentTable}
                  onComplete={clearSelection}
                />
              )}
              <AutoTagSectionsButton chapterId={chapterId} topicId={topicId} />
              {chapterId && moduleId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMoveOpen(true)}
                  className="h-7 gap-1"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Move / Copy
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {csvExportConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-7 gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, idx) => (
                <TableHead 
                  key={idx} 
                  className={column.className}
                >
                  {column.key === 'select' ? (
                    <Checkbox
                      checked={someSelected ? 'indeterminate' : allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => (
              <TableRow key={item.id}>
                {columns.map((column, idx) => (
                  <TableCell key={idx} className={column.className}>
                    {renderCell(item, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)} of {filteredData.length}{searchQuery.trim() && filteredData.length !== data.length ? ` (filtered from ${data.length})` : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected items. You can restore them later from the deleted items view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Chapter Modal */}
      {chapterId && moduleId && (
        <MoveToChapterModal
          open={moveOpen}
          onOpenChange={setMoveOpen}
          moduleId={moduleId}
          currentChapterId={chapterId}
          contentTable={contentTable}
          itemIds={Array.from(selectedIds)}
          onComplete={clearSelection}
        />
      )}
    </div>
  );
}
