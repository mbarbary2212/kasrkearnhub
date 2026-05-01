import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText, ExternalLink, Download, Sparkles, Trash2, RefreshCw, Pencil, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AdminDocument, useDeleteAdminDocument, getSignedUrl } from '@/hooks/useAdminDocuments';
import { useSyncPdfText } from '@/hooks/useSyncPdfText';
import { EditDocumentDialog } from './EditDocumentDialog';
import { toast } from 'sonner';
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
import { format } from 'date-fns';

interface Year {
  id: string;
  name: string;
  number: number;
}

interface Module {
  id: string;
  name: string;
  slug: string | null;
  year_id: string | null;
}

const DOC_TYPES: Record<string, string> = {
  book_pdf: 'Book PDF',
  chapter_pdf: 'Chapter PDF',
  lecture_pdf: 'Lecture PDF',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PDFLibraryTableViewProps {
  documents: AdminDocument[];
  years: Year[];
  modules: Module[];
  onUseAsAISource: (doc: AdminDocument) => void;
}

interface GroupedData {
  yearId: string;
  yearName: string;
  yearNumber: number;
  modules: {
    moduleId: string;
    moduleName: string;
    moduleSlug: string | null;
    docs: AdminDocument[];
  }[];
}

function DocumentActions({ doc, onUseAsAISource, onEdit }: { doc: AdminDocument; onUseAsAISource: (doc: AdminDocument) => void; onEdit: (doc: AdminDocument) => void }) {
  const deleteMutation = useDeleteAdminDocument();
  const { syncPdfText, isSyncing } = useSyncPdfText();

  const handlePreview = async () => {
    const url = await getSignedUrl(doc.storage_path);
    if (url) window.open(url, '_blank');
    else toast.error('Failed to generate preview link');
  };

  const handleDownload = async () => {
    const url = await getSignedUrl(doc.storage_path, true);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else toast.error('Failed to generate download link');
  };

  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  const handleSync = async () => {
    if (!doc.chapter_id && !doc.topic_id) {
      toast.info('This document is not linked to a chapter or topic');
      return;
    }
    setShowSyncConfirm(true);
  };

  const confirmSync = async () => {
    setShowSyncConfirm(false);
    const params = doc.chapter_id ? { chapter_id: doc.chapter_id } : { topic_id: doc.topic_id! };
    await syncPdfText(params);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(doc.id);
    }
  };

  const targetName = doc.chapter?.title || doc.topic_id || 'Unknown';

  return (
    <div className="flex items-center gap-1">
      <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Confirm PDF Sync
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to sync the following PDF to a chapter:</p>
                <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[70px]">PDF:</span>
                    <span className="text-foreground font-semibold">{doc.title}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[70px]">Target:</span>
                    <span className="text-foreground font-semibold">{targetName}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Please confirm the chapter name matches the PDF content before syncing.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSync} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm & Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(doc)} title="Edit">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePreview} title="Preview">
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} title="Download">
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handleSync}
        disabled={isSyncing || (!doc.chapter_id && !doc.topic_id)}
        title={doc.chapter_id || doc.topic_id ? 'Sync PDF Text' : 'No chapter/topic linked'}
      >
        <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUseAsAISource(doc)} title="Use as AI Source">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function PDFLibraryTableView({ documents, years, modules, onUseAsAISource }: PDFLibraryTableViewProps) {
  const [openYears, setOpenYears] = useState<Set<string>>(new Set(years.map(y => y.id).concat(['unlinked'])));
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [editingDoc, setEditingDoc] = useState<AdminDocument | null>(null);

  const grouped = useMemo((): { yearGroups: GroupedData[]; unlinked: AdminDocument[] } => {
    const yearMap = new Map<string, Year>();
    years.forEach(y => yearMap.set(y.id, y));

    const moduleMap = new Map<string, Module>();
    modules.forEach(m => moduleMap.set(m.id, m));

    // Group docs by year -> module
    const groups = new Map<string, Map<string, AdminDocument[]>>();
    const unlinked: AdminDocument[] = [];

    for (const doc of documents) {
      const moduleId = doc.module_id;
      if (!moduleId) {
        unlinked.push(doc);
        continue;
      }

      const mod = doc.module as { id: string; name: string; slug: string; year_id?: string | null } | null;
      const yearId = mod?.year_id || 'unknown';

      if (!groups.has(yearId)) groups.set(yearId, new Map());
      const yearGroup = groups.get(yearId)!;
      if (!yearGroup.has(moduleId)) yearGroup.set(moduleId, []);
      yearGroup.get(moduleId)!.push(doc);
    }

    // Sort and structure
    const yearGroups: GroupedData[] = [];

    for (const [yearId, moduleGroups] of groups) {
      const year = yearMap.get(yearId);
      const moduleEntries = Array.from(moduleGroups.entries())
        .map(([modId, docs]) => {
          const mod = moduleMap.get(modId);
          return {
            moduleId: modId,
            moduleName: mod?.name || 'Unknown Module',
            moduleSlug: mod?.slug || null,
            docs: docs.sort((a, b) => a.title.localeCompare(b.title)),
          };
        })
        .sort((a, b) => a.moduleName.localeCompare(b.moduleName));

      yearGroups.push({
        yearId,
        yearName: year?.name || 'Unknown Year',
        yearNumber: year?.number || 99,
        modules: moduleEntries,
      });
    }

    yearGroups.sort((a, b) => a.yearNumber - b.yearNumber);
    unlinked.sort((a, b) => a.title.localeCompare(b.title));

    return { yearGroups, unlinked };
  }, [documents, years, modules]);

  const toggleYear = (yearId: string) => {
    setOpenYears(prev => {
      const next = new Set(prev);
      if (next.has(yearId)) next.delete(yearId);
      else next.add(yearId);
      return next;
    });
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const renderDocsTable = (docs: AdminDocument[]) => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 text-xs">Title</TableHead>
          <TableHead className="h-8 text-xs w-40">Chapter</TableHead>
          <TableHead className="h-8 text-xs w-28">Type</TableHead>
          <TableHead className="h-8 text-xs w-20">Size</TableHead>
          <TableHead className="h-8 text-xs w-28">Date</TableHead>
          <TableHead className="h-8 text-xs w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map(doc => (
          <TableRow key={doc.id} className="group">
            <TableCell className="py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate max-w-[300px]" title={doc.title}>
                  {doc.title}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-2 text-sm text-muted-foreground truncate max-w-[160px]" title={doc.chapter?.title || ''}>
              {doc.chapter?.title || '—'}
            </TableCell>
            <TableCell className="py-2">
              <Badge variant="outline" className="text-xs font-normal">
                {DOC_TYPES[doc.doc_type] || doc.doc_type}
              </Badge>
            </TableCell>
            <TableCell className="py-2 text-sm text-muted-foreground">
              {formatFileSize(doc.file_size)}
            </TableCell>
            <TableCell className="py-2 text-sm text-muted-foreground">
              {format(new Date(doc.created_at), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="py-2">
              <DocumentActions doc={doc} onUseAsAISource={onUseAsAISource} onEdit={setEditingDoc} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (documents.length === 0) return null;

  return (
    <div className="space-y-1">
      {grouped.yearGroups.map(yearGroup => {
        const totalDocs = yearGroup.modules.reduce((sum, m) => sum + m.docs.length, 0);
        const isYearOpen = openYears.has(yearGroup.yearId);

        return (
          <Collapsible key={yearGroup.yearId} open={isYearOpen} onOpenChange={() => toggleYear(yearGroup.yearId)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
              {isYearOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {isYearOpen ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
              <span className="font-semibold text-sm">{yearGroup.yearName}</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {totalDocs} {totalDocs === 1 ? 'doc' : 'docs'}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 border-l pl-2 space-y-1 mt-1">
                {yearGroup.modules.map(mod => {
                  const isModOpen = openModules.has(mod.moduleId);
                  return (
                    <Collapsible key={mod.moduleId} open={isModOpen} onOpenChange={() => toggleModule(mod.moduleId)}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left">
                        {isModOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        {isModOpen ? <FolderOpen className="h-3.5 w-3.5 text-accent-foreground" /> : <Folder className="h-3.5 w-3.5 text-accent-foreground" />}
                        <span className="text-sm font-medium">
                          {mod.moduleSlug ? `${mod.moduleSlug.toUpperCase()}: ` : ''}{mod.moduleName}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {mod.docs.length}
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-6 mt-1 mb-2 border rounded-md overflow-hidden">
                          {renderDocsTable(mod.docs)}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {grouped.unlinked.length > 0 && (
        <Collapsible open={openYears.has('unlinked')} onOpenChange={() => toggleYear('unlinked')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
            {openYears.has('unlinked') ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {openYears.has('unlinked') ? <FolderOpen className="h-4 w-4 text-muted-foreground" /> : <Folder className="h-4 w-4 text-muted-foreground" />}
            <span className="font-semibold text-sm text-muted-foreground">Unlinked Documents</span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {grouped.unlinked.length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-1 mb-2 border rounded-md overflow-hidden">
              {renderDocsTable(grouped.unlinked)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      <EditDocumentDialog
        document={editingDoc}
        open={!!editingDoc}
        onOpenChange={(open) => { if (!open) setEditingDoc(null); }}
      />
    </div>
  );
}
