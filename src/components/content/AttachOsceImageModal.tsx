import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadOsceImage, useUpdateOsceQuestion } from '@/hooks/useOsceQuestions';
import { toast } from 'sonner';

interface AttachOsceImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  moduleId: string;
  chapterId?: string | null;
}

export function AttachOsceImageModal({
  open,
  onOpenChange,
  questionId,
  moduleId,
  chapterId,
}: AttachOsceImageModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const updateQuestion = useUpdateOsceQuestion();

  const resetState = () => {
    setImageFile(null);
    setImagePreview('');
    setUploading(false);
  };

  const handleFileSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageFile) return;

    setUploading(true);
    try {
      const imageUrl = await uploadOsceImage(imageFile, moduleId, chapterId);
      
      await updateQuestion.mutateAsync({
        id: questionId,
        image_url: imageUrl,
      });

      toast.success('Image attached successfully');
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      console.error('Failed to attach image:', error);
      toast.error(error.message || 'Failed to attach image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Image to OSCE Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview('');
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <DragDropZone
              id="attach-osce-image"
              onFileSelect={handleFileSelect}
              accept="image/*"
              acceptedTypes={['.jpg', '.jpeg', '.png', '.webp']}
              maxSizeMB={10}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!imageFile || uploading}
            >
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ImageIcon className="w-4 h-4 mr-2" />
              Attach Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
