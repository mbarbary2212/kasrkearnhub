import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearGroupedModuleOptions } from '@/components/admin/YearGroupedModuleOptions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Copy, 
  Trash2, 
  Sparkles, 
  Calendar, 
  HardDrive,
  ExternalLink,
  X,
  Plus,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { PDFLibraryTableView } from './PDFLibraryTableView';
import { useAdminDocuments, useUploadAdminDocument, useDeleteAdminDocument, getSignedUrl, AdminDocument } from '@/hooks/useAdminDocuments';
import { useModules } from '@/hooks/useModules';
import { useYears } from '@/hooks/useYears';
import { useModuleChapters } from '@/hooks/useChapters';
import { useSyncPdfText } from '@/hooks/useSyncPdfText';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DOC_TYPES = [
  { value: 'book_pdf', label: 'Book PDF' },
  { value: 'chapter_pdf', label: 'Chapter PDF' },
  { value: 'lecture_pdf', label: 'Lecture PDF' },
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState('chapter_pdf');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { data: modules } = useModules();
  const { data: years } = useYears();
  const { data: chapters } = useModuleChapters(selectedModuleId || undefined);
  const uploadMutation = useUploadAdminDocument();

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setDocType('chapter_pdf');
    setSelectedModuleId('');
    setSelectedChapterId('');
    setTags([]);
    setTagInput('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace('.pdf', ''));
    } else {
      toast.error('Only PDF files are allowed');
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === 'application/pdf') {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace('.pdf', ''));
    } else {
      toast.error('Only PDF files are allowed');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      toast.error('Please provide a file and title');
      return;
    }

    await uploadMutation.mutateAsync({
      file,
      title: title.trim(),
      description: description.trim() || undefined,
      doc_type: docType,
      module_id: selectedModuleId || undefined,
      chapter_id: selectedChapterId || undefined,
      tags,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload PDF Document
          </DialogTitle>
          <DialogDescription>
            Upload a PDF to the admin library for AI content generation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a PDF here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    Browse Files
                  </label>
                </Button>
              </>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              rows={2}
            />
          </div>

          {/* Doc type */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Module/Chapter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Module (Optional)</Label>
              <Select value={selectedModuleId} onValueChange={(v) => { setSelectedModuleId(v); setSelectedChapterId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <YearGroupedModuleOptions modules={modules} />
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chapter (Optional)</Label>
              <Select 
                value={selectedChapterId} 
                onValueChange={setSelectedChapterId}
                disabled={!selectedModuleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!file || !title.trim() || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentCardProps {
  doc: AdminDocument;
  onUseAsAISource: (doc: AdminDocument) => void;
}

function DocumentCard({ doc, onUseAsAISource }: DocumentCardProps) {
  const deleteMutation = useDeleteAdminDocument();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handlePreview = async () => {
    const url = await getSignedUrl(doc.storage_path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Failed to generate preview link');
    }
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
    } else {
      toast.error('Failed to generate download link');
    }
  };

  const handleCopyLink = async () => {
    const url = await getSignedUrl(doc.storage_path);
    if (url) {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to generate link');
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(doc.id);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{doc.title}</h4>
            {doc.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {doc.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatFileSize(doc.file_size)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(doc.created_at), 'MMM d, yyyy')}
              </span>
              <Badge variant="outline" className="text-xs">
                {DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type}
              </Badge>
            </div>
            {doc.module && (
              <div className="mt-1">
                <Badge variant="secondary" className="text-xs">
                  {doc.module.name}
                  {doc.chapter && ` / ${doc.chapter.title}`}
                </Badge>
              </div>
            )}
            {doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {doc.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
          <Button size="sm" variant="outline" onClick={handlePreview}>
            <ExternalLink className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            <Copy className="w-3 h-3 mr-1" />
            Copy Link
          </Button>
          <Button 
            size="sm" 
            variant="default"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={() => onUseAsAISource(doc)}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Use as AI Source
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface PDFLibraryTabProps {
  onOpenAIFactory?: (documentId: string, moduleId?: string, chapterId?: string) => void;
  moduleAdminModuleIds?: string[];
}

export function PDFLibraryTab({ onOpenAIFactory, moduleAdminModuleIds }: PDFLibraryTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState<string>(moduleAdminModuleIds?.length ? moduleAdminModuleIds[0] : '');
  const [filterDocType, setFilterDocType] = useState<string>('');
  const [aiFactoryOpen, setAiFactoryOpen] = useState(false);
  const [batchGeneratorOpen, setBatchGeneratorOpen] = useState(false);
  const [selectedDocForAI, setSelectedDocForAI] = useState<AdminDocument | null>(null);
  const { bulkSync, isSyncing: isBulkSyncing, progress: bulkSyncProgress } = useSyncPdfText();

  const { data: documents, isLoading } = useAdminDocuments({
    search: search || undefined,
    module_id: filterModule || undefined,
    doc_type: filterDocType || undefined,
    module_ids: moduleAdminModuleIds,
  });
  const { data: modules } = useModules();
  const { data: years = [] } = useYears();
  
  // Filter modules for module admins
  const availableModules = moduleAdminModuleIds?.length 
    ? modules?.filter(m => moduleAdminModuleIds.includes(m.id))
    : modules;

  const handleUseAsAISource = (doc: AdminDocument) => {
    if (onOpenAIFactory) {
      onOpenAIFactory(doc.id, doc.module_id || undefined, doc.chapter_id || undefined);
    } else {
      // Use built-in AI factory modal
      setSelectedDocForAI(doc);
      setAiFactoryOpen(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                PDF Library
              </CardTitle>
              <CardDescription>
                Manage PDF documents for AI-powered content generation.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!documents?.length) {
                    toast.info('No documents to sync');
                    return;
                  }
                  const docsWithTarget = documents.filter(d => d.chapter_id || d.topic_id);
                  if (!docsWithTarget.length) {
                    toast.info('No documents linked to chapters or topics');
                    return;
                  }
                  bulkSync(docsWithTarget.map(d => ({
                    id: d.id,
                    chapter_id: d.chapter_id,
                    topic_id: d.topic_id,
                  })));
                }}
                disabled={isBulkSyncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isBulkSyncing ? 'animate-spin' : ''}`} />
                {isBulkSyncing ? (bulkSyncProgress || 'Syncing...') : 'Sync All PDFs'}
              </Button>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterModule || 'all'} onValueChange={(v) => setFilterModule(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={moduleAdminModuleIds?.length ? "My Modules" : "All Modules"} />
              </SelectTrigger>
              <SelectContent>
                {!moduleAdminModuleIds?.length && <SelectItem value="all">All Modules</SelectItem>}
                <YearGroupedModuleOptions modules={availableModules} />
              </SelectContent>
            </Select>
            <Select value={filterDocType || 'all'} onValueChange={(v) => setFilterDocType(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DOC_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document List */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : documents?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first PDF to start building your AI content library.
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
              <PDFLibraryTableView
                documents={documents || []}
                years={years}
                modules={(availableModules || []).map(m => ({ id: m.id, name: m.name, slug: m.slug || null, year_id: m.year_id || null }))}
                onUseAsAISource={handleUseAsAISource}
              />
            </ScrollArea>
          )}
        </CardContent>

        <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      </Card>

      {/* Lazy-load AI Content Factory Modal */}
      {aiFactoryOpen && (
        <AIContentFactoryModalLazy
          open={aiFactoryOpen}
          onOpenChange={(open) => {
            setAiFactoryOpen(open);
            if (!open) setSelectedDocForAI(null);
          }}
          documentId={selectedDocForAI?.id}
          prefilledModuleId={selectedDocForAI?.module_id || undefined}
          prefilledChapterId={selectedDocForAI?.chapter_id || undefined}
        />
      )}

      {/* Lazy-load Batch Generator Modal */}
      {batchGeneratorOpen && (
        <AIBatchGeneratorModalLazy
          open={batchGeneratorOpen}
          onOpenChange={setBatchGeneratorOpen}
          documentId={selectedDocForAI?.id}
          prefilledModuleId={selectedDocForAI?.module_id || undefined}
          prefilledChapterId={selectedDocForAI?.chapter_id || undefined}
        />
      )}
    </>
  );
}

// Lazy wrapper for AI Content Factory Modal
function AIContentFactoryModalLazy(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  prefilledModuleId?: string;
  prefilledChapterId?: string;
}) {
  const [Component, setComponent] = useState<React.ComponentType<typeof props> | null>(null);

  useEffect(() => {
    import('./AIContentFactoryModal').then(mod => {
      setComponent(() => mod.AIContentFactoryModal);
    });
  }, []);

  if (!Component) return null;
  return <Component {...props} />;
}

// Lazy wrapper for AI Batch Generator Modal
function AIBatchGeneratorModalLazy(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  prefilledModuleId?: string;
  prefilledChapterId?: string;
}) {
  const [Component, setComponent] = useState<React.ComponentType<typeof props> | null>(null);

  useEffect(() => {
    import('./AIBatchGeneratorModal').then(mod => {
      setComponent(() => mod.AIBatchGeneratorModal);
    });
  }, []);

  if (!Component) return null;
  return <Component {...props} />;
}
