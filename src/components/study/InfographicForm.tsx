import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InfographicContent } from '@/hooks/useStudyResources';

interface InfographicFormProps {
  content: InfographicContent;
  onChange: (c: InfographicContent) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}

export function InfographicForm({
  content,
  onChange,
  onUpload,
  uploading,
}: InfographicFormProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const isPdf = content.fileUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Infographic (Image or PDF)</Label>
        {content.fileUrl ? (
          <div className="space-y-2">
            {isPdf ? (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">PDF uploaded: {content.fileUrl.split('/').pop()}</p>
                <a
                  href={content.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View PDF
                </a>
              </div>
            ) : (
              <img
                src={content.fileUrl}
                alt="Preview"
                className="max-h-[200px] rounded-lg object-contain bg-muted"
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ ...content, fileUrl: '' })}
            >
              Remove File
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Upload an infographic image or PDF</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="infographic-upload"
            />
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <label htmlFor="infographic-upload" className="cursor-pointer">
                {uploading ? 'Uploading...' : 'Choose File'}
              </label>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Or use external URL</Label>
        <Input
          value={content.fileUrl || ''}
          onChange={(e) => onChange({ ...content, fileUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={content.description || ''}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          placeholder="Brief description of this infographic"
          rows={2}
        />
      </div>
    </div>
  );
}
