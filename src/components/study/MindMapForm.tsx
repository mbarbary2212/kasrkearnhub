import { useState } from 'react';
import { Upload, Network, Image, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MindMapContent, MindMapNode } from '@/hooks/useStudyResources';
import { MindMapEditor, MindMapStructuredContent } from './MindMapEditor';
import { MindMapNodeRenderer } from './MindMapNodeRenderer';

interface MindMapFormProps {
  content: MindMapContent;
  onChange: (c: MindMapContent) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  folder?: string;
  onFolderChange?: (folder: string) => void;
  existingFolders?: string[];
}

// Detect if content has structured nodes vs image
function hasNodes(content: MindMapContent): boolean {
  return Array.isArray(content.nodes) && content.nodes.length > 0;
}

function hasImage(content: MindMapContent): boolean {
  return !!content.imageUrl;
}

export function MindMapForm({
  content,
  onChange,
  onUpload,
  uploading,
  folder = '',
  onFolderChange,
  existingFolders = [],
}: MindMapFormProps) {
  // Determine initial mode based on content
  const [mode, setMode] = useState<'image' | 'editor'>(() => {
    if (hasNodes(content)) return 'editor';
    return 'image';
  });
  const [newFolderMode, setNewFolderMode] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'image' | 'editor');
    // Clear incompatible content when switching modes
    if (newMode === 'image' && hasNodes(content)) {
      onChange({ imageUrl: '', description: content.description });
    } else if (newMode === 'editor' && hasImage(content)) {
      onChange({ 
        central_concept: '', 
        nodes: [], 
        description: content.description 
      });
    }
  };

  const isPdf = content.imageUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      {/* Folder field */}
      {onFolderChange && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Folder (optional)
          </Label>
          {!newFolderMode ? (
            <div className="flex gap-2">
              <Select value={folder} onValueChange={onFolderChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select folder or leave empty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No folder</SelectItem>
                  {existingFolders.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setNewFolderMode(true)}
              >
                New
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={folder}
                onChange={e => onFolderChange(e.target.value)}
                placeholder="Enter new folder name"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setNewFolderMode(false)}
              >
                Select
              </Button>
            </div>
          )}
        </div>
      )}

      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image" className="gap-2">
            <Image className="w-4 h-4" />
            Upload Image
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2">
            <Network className="w-4 h-4" />
            Visual Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-4 mt-4">
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
              value={content.imageUrl || ''}
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
        </TabsContent>

        <TabsContent value="editor" className="space-y-4 mt-4">
          <MindMapEditor
            content={content as MindMapStructuredContent}
            onChange={(c) => onChange(c as MindMapContent)}
          />
          
          {/* Live preview */}
          {(content.central_concept || (content.nodes?.length || 0) > 0) && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg bg-muted/30 overflow-hidden max-h-[300px] overflow-y-auto">
                <MindMapNodeRenderer
                  centralConcept={content.central_concept || 'Mind Map'}
                  nodes={content.nodes || []}
                  connections={content.connections}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}