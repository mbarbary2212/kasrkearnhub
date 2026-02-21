import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCreateChapter, useUpdateChapter } from '@/hooks/useChapterManagement';
import { ModuleChapter } from '@/hooks/useChapters';

interface ChapterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  bookLabel: string;
  chapterPrefix?: string;
  editingChapter?: ModuleChapter | null;
  existingChapters?: ModuleChapter[];
}

export function ChapterFormModal({
  open,
  onOpenChange,
  moduleId,
  bookLabel,
  chapterPrefix = 'Ch',
  editingChapter,
  existingChapters = [],
}: ChapterFormModalProps) {
  const [title, setTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();

  const isEditing = !!editingChapter;

  useEffect(() => {
    if (open) {
      if (editingChapter) {
        setTitle(editingChapter.title);
        setChapterNumber(editingChapter.chapter_number);
        setIconUrl(editingChapter.icon_url);
        setIconPreview(editingChapter.icon_url);
      } else {
        setTitle('');
        setIconUrl(null);
        setIconPreview(null);
        const bookChapters = existingChapters.filter(c => c.book_label === bookLabel);
        const maxNumber = bookChapters.reduce((max, c) => Math.max(max, c.chapter_number), 0);
        setChapterNumber(maxNumber + 1);
      }
      setIconFile(null);
    }
  }, [open, editingChapter, existingChapters, bookLabel]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const removeIcon = () => {
    setIconFile(null);
    setIconPreview(null);
    setIconUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadIcon = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${moduleId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('chapter-icons')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('chapter-icons')
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error(`Please enter a ${chapterPrefix.toLowerCase()} title`);
      return;
    }

    if (chapterNumber < 1) {
      toast.error(`${chapterPrefix} number must be at least 1`);
      return;
    }

    try {
      setUploading(true);

      // Upload new icon if selected
      let finalIconUrl = iconUrl;
      if (iconFile) {
        finalIconUrl = await uploadIcon(iconFile);
      }

      if (isEditing) {
        await updateChapter.mutateAsync({
          chapterId: editingChapter!.id,
          moduleId,
          title: title.trim(),
          chapterNumber,
          iconUrl: finalIconUrl,
        });
        toast.success(`${chapterPrefix} updated successfully`);
      } else {
        await createChapter.mutateAsync({
          moduleId,
          bookLabel,
          title: title.trim(),
          chapterNumber,
        });
        toast.success(`${chapterPrefix} created successfully`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? `Failed to update ${chapterPrefix.toLowerCase()}` : `Failed to create ${chapterPrefix.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${chapterPrefix}` : `Add ${chapterPrefix}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="chapterNumber">{chapterPrefix} Number</Label>
              <Input
                id="chapterNumber"
                type="number"
                min={1}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., Introduction to ${bookLabel}`}
                autoFocus
              />
            </div>

            {/* Icon Upload */}
            <div className="grid gap-2">
              <Label>Icon (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              {iconPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={iconPreview}
                    alt="Chapter icon"
                    className="w-14 h-14 rounded-lg object-cover border"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeIcon}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload icon image
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Max 2MB. Shown next to the chapter number.</p>
            </div>

            <div className="text-sm text-muted-foreground">
              Department: <span className="font-medium">{bookLabel}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createChapter.isPending || updateChapter.isPending || uploading}
            >
              {uploading ? 'Uploading...' : isEditing ? 'Save' : `Add ${chapterPrefix}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
