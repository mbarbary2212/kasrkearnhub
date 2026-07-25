import { useState, useCallback, useMemo } from 'react';
import { Upload, X, Check, AlertCircle, FileText, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useBulkCreateStudyResources, useChapterStudyResources, useTopicStudyResources } from '@/hooks/useStudyResources';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type BulkVisualResourceType = 'mind_map' | 'infographic';

const TYPE_CONFIG: Record<BulkVisualResourceType, {
  label: string;
  accept: string;
  acceptedTypes: string[];
  dropLabel: string;
}> = {
  mind_map: {
    label: 'Mind Map PDFs',
    accept: '.pdf',
    acceptedTypes: ['application/pdf'],
    dropLabel: 'Drop PDF files here',
  },
  infographic: {
    label: 'Infographics',
    accept: '.pdf,.png,.jpg,.jpeg,.webp,.svg',
    acceptedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    dropLabel: 'Drop image or PDF files here',
  },
};

interface MindMapBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  /** Chapter ID - for chapter-based modules. Mutually exclusive with topicId. */
  chapterId?: string;
  /** Topic ID - for topic-based modules. Mutually exclusive with chapterId. */
  topicId?: string;
  /** Resource type to create. Defaults to mind_map. */
  resourceType?: BulkVisualResourceType;
}

interface UploadItem {
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
  isDuplicate?: boolean;
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
  moduleId,
  chapterId,
  topicId,
  resourceType = 'mind_map',
}: MindMapBulkUploadModalProps) {
  const config = TYPE_CONFIG[resourceType];
  const containerId = chapterId || topicId || 'general';
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const bulkCreate = useBulkCreateStudyResources();

  // Fetch existing resources for duplicate detection
  const { data: chapterResources } = useChapterStudyResources(chapterId);
  const { data: topicResources } = useTopicStudyResources(topicId);
  const existingResources = useMemo(
    () => (chapterResources || topicResources || []).filter(
      r => (r.resource_type === 'mind_map' || r.resource_type === 'infographic' || r.resource_type === 'algorithm') && !r.is_deleted
    ),
    [chapterResources, topicResources]
  );

  const checkDuplicate = useCallback((title: string): boolean => {
    const normalized = title.trim().toLowerCase();
    return existingResources.some(r => r.title.trim().toLowerCase() === normalized);
  }, [existingResources]);

  const handleFilesSelected = useCallback((files: File[]) => {
    const validFiles = files.filter(f => {
      const ext = f.name.toLowerCase().split('.').pop();
      const validExts = resourceType === 'infographic' 
        ? ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'svg']
        : ['pdf'];
      return validExts.includes(ext || '');
    });
    
    if (validFiles.length === 0) {
      toast.error(
        resourceType === 'infographic'
          ? 'Please select image or PDF files'
          : 'Please select PDF files only'
      );
      return;
    }

    const newItems: UploadItem[] = validFiles.map(file => {
      const title = generateTitleFromFilename(file.name);
      return {
        file,
        title,
        status: 'pending' as const,
        isDuplicate: checkDuplicate(title),
      };
    });

    setItems(prev => [...prev, ...newItems]);
  }, [checkDuplicate, resourceType]);

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

  const updateItemTitle = (index: number, newTitle: string) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, title: newTitle, isDuplicate: checkDuplicate(newTitle) } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (items.length === 0) return;

    setUploading(true);
    setProgress({ current: 0, total: items.length });

    const uploadedItems: UploadItem[] = [...items];
    const successfulResources: { title: string; url: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      uploadedItems[i] = { ...item, status: 'uploading' };
      setItems([...uploadedItems]);

      try {
        // Upload file to storage
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${moduleId}/${containerId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('study-resources')
          .upload(filePath, item.file, { contentType: item.file.type || undefined });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('study-resources')
          .getPublicUrl(filePath);

        uploadedItems[i] = { ...item, status: 'success', url: publicUrl };
        successfulResources.push({
          title: item.title,
          url: publicUrl,
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
            chapter_id: chapterId || null,
            topic_id: topicId || null,
            resource_type: resourceType,
            title: r.title,
            content: resourceType === 'infographic' ? { fileUrl: r.url, description: '' } : { imageUrl: r.url, description: '' },
            folder: null,
          }))
        );
        
        const successCount = successfulResources.length;
        const errorCount = items.length - successCount;
        
        if (errorCount === 0) {
          toast.success(`Successfully uploaded ${successCount} ${config.label.toLowerCase()}`);
          onOpenChange(false);
          setItems([]);
        } else {
          toast.warning(`Uploaded ${successCount}, failed ${errorCount}`);
        }
      } catch (error) {
        toast.error('Failed to save resource records');
      }
    }

    setUploading(false);
  };

  const handleClose = () => {
    if (!uploading) {
      setItems([]);
      onOpenChange(false);
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const duplicateCount = items.filter(i => i.status === 'pending' && i.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload {config.label}
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
                <p className="text-sm font-medium">{config.dropLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <input
                  type="file"
                  accept={config.accept}
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
                          className={cn("h-7 text-sm", item.isDuplicate && "border-yellow-400")}
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{item.title}</p>
                      )}
                      
                      {item.isDuplicate && item.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">Possible duplicate</span>
                        </div>
                      )}
                      
                      {item.error && (
                        <p className="text-xs text-red-600">{item.error}</p>
                      )}
                    </div>

                    {item.status === 'pending' && !uploading && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => removeItem(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {pendingCount > 0 && `${pendingCount} pending`}
                  {successCount > 0 && ` • ${successCount} uploaded`}
                  {errorCount > 0 && ` • ${errorCount} failed`}
                </span>
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-400 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
                  </Badge>
                )}
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
                  Upload {pendingCount} {resourceType === 'infographic'
                    ? `file${pendingCount !== 1 ? 's' : ''}`
                    : `PDF${pendingCount !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
