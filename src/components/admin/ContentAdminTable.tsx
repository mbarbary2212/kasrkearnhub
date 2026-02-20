import { useState, useCallback, useMemo } from 'react';
import { Pencil, Trash2, Download, Check, X } from 'lucide-react';
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
import { BulkSectionAssignment } from '@/components/sections';
import { BulkConceptAssignment } from '@/components/content/BulkConceptAssignment';

export interface ColumnConfig<T> {
  key: keyof T | 'actions' | 'select' | 'section' | 'concept';
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface ConceptInfo {
  id: string;
  title: string;
}

interface ContentAdminTableProps<T extends { id: string; section_id?: string | null; concept_id?: string | null }> {
  data: T[];
  columns: ColumnConfig<T>[];
  contentTable: ContentTableName;
  chapterId?: string;
  topicId?: string;
  moduleId?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  sections?: Section[];
  concepts?: ConceptInfo[];
  csvExportConfig?: {
    filename: string;
    columns: ExportColumn<T>[];
  };
  emptyMessage?: string;
}

export function ContentAdminTable<T extends { id: string; section_id?: string | null; concept_id?: string | null }>({
  data,
  columns,
  contentTable,
  chapterId,
  topicId,
  moduleId,
  onEdit,
  onDelete,
  sections = [],
  concepts = [],
  csvExportConfig,
  emptyMessage = 'No items found',
}: ContentAdminTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const bulkDelete = useBulkDeleteContent(contentTable);
  const bulkUpdateSection = useBulkUpdateSection(contentTable);

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [data]);

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
    exportToCsv(data, csvExportConfig.columns, csvExportConfig.filename, sections, concepts);
    toast.success('CSV exported');
  };

  const getSectionName = useCallback((sectionId: string | null | undefined) => {
    if (!sectionId) return null;
    return sections.find(s => s.id === sectionId)?.name || null;
  }, [sections]);

  const getConceptName = useCallback((conceptId: string | null | undefined) => {
    if (!conceptId) return null;
    return concepts.find(c => c.id === conceptId)?.title || null;
  }, [concepts]);

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

    if (column.key === 'concept') {
      const conceptName = getConceptName((item as any).concept_id);
      const isAutoAssigned = (item as any).concept_auto_assigned === true;
      const confidence = (item as any).concept_ai_confidence;
      return conceptName ? (
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">{conceptName}</Badge>
          {isAutoAssigned ? (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1 rounded" title={confidence != null ? `AI confidence: ${Math.round(confidence * 100)}%` : 'AI-assigned'}>
              AI{confidence != null ? ` ${Math.round(confidence * 100)}%` : ''}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-primary/60 bg-primary/5 px-1 rounded">Manual</span>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
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
              {moduleId && (
                <BulkConceptAssignment
                  moduleId={moduleId}
                  chapterId={chapterId}
                  selectedIds={Array.from(selectedIds)}
                  contentTable={contentTable}
                  onComplete={clearSelection}
                />
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
            {data.map((item) => (
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
    </div>
  );
}
