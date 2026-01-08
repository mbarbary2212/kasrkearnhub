import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MindMapContent } from '@/hooks/useStudyResources';

interface MindMapFormProps {
  content: MindMapContent;
  onChange: (c: MindMapContent) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}

export function MindMapForm({
  content,
  onChange,
  onUpload,
  uploading,
}: MindMapFormProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const isPdf = content.imageUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Mind Map (Image or PDF)</Label>
        {content.imageUrl ? (
          <div className="space-y-2">
            {isPdf ? (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">PDF uploaded: {content.imageUrl.split('/').pop()}</p>
                <a 
                  href={content.imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View PDF
                </a>
              </div>
            ) : (
              <img
                src={content.imageUrl}
                alt="Preview"
                className="max-h-[200px] rounded-lg object-contain bg-muted"
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ ...content, imageUrl: '' })}
            >
              Remove File
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Upload a mind map image or PDF</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="mindmap-upload"
            />
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <label htmlFor="mindmap-upload" className="cursor-pointer">
                {uploading ? 'Uploading...' : 'Choose File'}
              </label>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Or use external URL</Label>
        <Input
          value={content.imageUrl}
          onChange={(e) => onChange({ ...content, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={content.description || ''}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          placeholder="Brief description of this mind map"
          rows={2}
        />
      </div>
    </div>
  );
}
