import { useState, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Folder, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useBulkCreateStudyResources, useChapterStudyResourceFolders } from '@/hooks/useStudyResources';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MindMapBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  moduleId: string;
}

interface UploadItem {
  file: File;
  title: string;
  folder: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

function generateTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')  // Remove extension
    .replace(/[_-]/g, ' ')     // Replace underscores/hyphens with spaces
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function MindMapBulkUploadModal({
  open,
  onOpenChange,
  chapterId,
  moduleId,
}: MindMapBulkUploadModalProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [globalFolder, setGlobalFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const { data: existingFolders = [] } = useChapterStudyResourceFolders(chapterId, 'mind_map');
  const bulkCreate = useBulkCreateStudyResources();

  const handleFilesSelected = useCallback((files: File[]) => {
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      toast.error('Please select PDF files only');
      return;
    }

    const newItems: UploadItem[] = pdfFiles.map(file => ({
      file,
      title: generateTitleFromFilename(file.name),
      folder: globalFolder,
      status: 'pending',
    }));

    setItems(prev => [...prev, ...newItems]);
  }, [globalFolder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFilesSelected(files);
    e.target.value = ''; // Reset to allow selecting same files
  }, [handleFilesSelected]);

  const updateItemTitle = (index: number, title: string) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, title } : item
    ));
  };

  const updateItemFolder = (index: number, folder: string) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, folder } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const applyGlobalFolder = () => {
    const folderToApply = newFolderName || globalFolder;
    if (!folderToApply) return;
    
    setItems(prev => prev.map(item => ({
      ...item,
      folder: folderToApply,
    })));
    
    if (newFolderName) {
      setGlobalFolder(newFolderName);
      setNewFolderName('');
    }
    
    toast.success(`Applied folder "${folderToApply}" to all items`);
  };

  const handleUploadAll = async () => {
    if (items.length === 0) return;

    setUploading(true);
    setProgress({ current: 0, total: items.length });

    const uploadedItems: UploadItem[] = [...items];
    const successfulResources: { title: string; url: string; folder: string | null }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      uploadedItems[i] = { ...item, status: 'uploading' };
      setItems([...uploadedItems]);

      try {
        // Upload file to storage
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${moduleId}/${chapterId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('study-resources')
          .upload(filePath, item.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('study-resources')
          .getPublicUrl(filePath);

        uploadedItems[i] = { ...item, status: 'success', url: publicUrl };
        successfulResources.push({
          title: item.title,
          url: publicUrl,
          folder: item.folder || null,
        });
      } catch (error) {
        uploadedItems[i] = { 
          ...item, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        };
      }

      setItems([...uploadedItems]);
      setProgress({ current: i + 1, total: items.length });
    }

    // Create study resources for successful uploads
    if (successfulResources.length > 0) {
      try {
        await bulkCreate.mutateAsync(
          successfulResources.map(r => ({
            module_id: moduleId,
            chapter_id: chapterId,
            resource_type: 'mind_map' as const,
            title: r.title,
            content: { imageUrl: r.url, description: '' },
            folder: r.folder,
          }))
        );
        
        const successCount = successfulResources.length;
        const errorCount = items.length - successCount;
        
        if (errorCount === 0) {
          toast.success(`Successfully uploaded ${successCount} mind map${successCount > 1 ? 's' : ''}`);
          onOpenChange(false);
          setItems([]);
        } else {
          toast.warning(`Uploaded ${successCount}, failed ${errorCount}`);
        }
      } catch (error) {
        toast.error('Failed to save mind map records');
      }
    }

    setUploading(false);
  };

  const handleClose = () => {
    if (!uploading) {
      setItems([]);
      setGlobalFolder('');
      setNewFolderName('');
      onOpenChange(false);
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Mind Map PDFs
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Drop zone */}
          {!uploading && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg transition-all cursor-pointer",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drop PDF files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="bulk-pdf-input"
                />
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <label htmlFor="bulk-pdf-input" className="cursor-pointer">
                    Choose Files
                  </label>
                </Button>
              </div>
            </div>
          )}

          {/* Global folder assignment */}
          {items.length > 0 && !uploading && (
            <div className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Apply folder to all</Label>
                <Select value={globalFolder} onValueChange={setGlobalFolder}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No folder</SelectItem>
                    {existingFolders.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Or create new</Label>
                <Input
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  className="h-8"
                />
              </div>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={applyGlobalFolder}
                disabled={!globalFolder && !newFolderName}
              >
                Apply
              </Button>
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}

          {/* Items list */}
          {items.length > 0 && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-4">
                {items.map((item, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      item.status === 'success' && 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
                      item.status === 'error' && 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
                      item.status === 'uploading' && 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
                      item.status === 'pending' && 'bg-card border-border'
                    )}
                  >
                    <div className="flex-shrink-0">
                      {item.status === 'success' && <Check className="w-4 h-4 text-green-600" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                      {item.status === 'pending' && <FileText className="w-4 h-4 text-muted-foreground" />}
                      {item.status === 'uploading' && (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      {item.status === 'pending' && !uploading ? (
                        <Input
                          value={item.title}
                          onChange={e => updateItemTitle(index, e.target.value)}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{item.title}</p>
                      )}
                      
                      {item.folder && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Folder className="w-3 h-3" />
                          {item.folder}
                        </div>
                      )}
                      
                      {item.error && (
                        <p className="text-xs text-red-600">{item.error}</p>
                      )}
                    </div>

                    {item.status === 'pending' && !uploading && (
                      <div className="flex items-center gap-1">
                        <Select 
                          value={item.folder} 
                          onValueChange={v => updateItemFolder(index, v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue placeholder="Folder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {[...existingFolders, ...(newFolderName && !existingFolders.includes(newFolderName) ? [newFolderName] : [])].map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeItem(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {pendingCount > 0 && `${pendingCount} pending`}
                {successCount > 0 && ` • ${successCount} uploaded`}
                {errorCount > 0 && ` • ${errorCount} failed`}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Cancel'}
                </Button>
                <Button 
                  onClick={handleUploadAll}
                  disabled={uploading || pendingCount === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {pendingCount} PDF{pendingCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
