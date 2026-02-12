import { useState } from 'react';
import { Network, Image, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MindMapContent } from '@/hooks/useStudyResources';
import { MindMapEditor, MindMapStructuredContent } from './MindMapEditor';
import { MindMapNodeRenderer } from './MindMapNodeRenderer';

interface MindMapFormProps {
  content: MindMapContent;
  onChange: (c: MindMapContent) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}

// Helper to get file URL from content (supports both fileUrl and legacy imageUrl)
function getFileUrl(content: MindMapContent): string | undefined {
  return content.fileUrl || content.imageUrl;
}

// Detect file type from URL
function detectFileType(url: string): MindMapContent['fileType'] {
  const lower = url.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.svg')) return 'svg';
  if (lower.endsWith('.pdf')) return 'pdf';
  return 'png';
}

// Detect if content has structured nodes vs image
function hasNodes(content: MindMapContent): boolean {
  return Array.isArray(content.nodes) && content.nodes.length > 0;
}

function hasImage(content: MindMapContent): boolean {
  return !!getFileUrl(content);
}

export function MindMapForm({
  content,
  onChange,
  onUpload,
  uploading,
}: MindMapFormProps) {
  // Determine initial mode based on content
  const [mode, setMode] = useState<'image' | 'editor'>(() => {
    if (hasNodes(content)) return 'editor';
    return 'image';
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Detect fileType from extension
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let fileType: MindMapContent['fileType'] = 'png';
      if (ext === 'html' || ext === 'htm') fileType = 'html';
      else if (ext === 'svg') fileType = 'svg';
      else if (ext === 'pdf') fileType = 'pdf';
      
      // Store the fileType in content before upload
      onChange({ ...content, fileType });
      onUpload(file);
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'image' | 'editor');
    // Clear incompatible content when switching modes
    if (newMode === 'image' && hasNodes(content)) {
      onChange({ fileUrl: '', description: content.description });
    } else if (newMode === 'editor' && hasImage(content)) {
      onChange({ 
        central_concept: '', 
        nodes: [], 
        description: content.description 
      });
    }
  };

  const fileUrl = getFileUrl(content);
  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf');
  const isHtml = fileUrl?.toLowerCase().endsWith('.html') || fileUrl?.toLowerCase().endsWith('.htm');
  const isSvg = fileUrl?.toLowerCase().endsWith('.svg');

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="image" className="gap-2">
            <Image className="w-4 h-4" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2">
            <Network className="w-4 h-4" />
            Visual Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Mind Map (Image, PDF, SVG, or HTML)</Label>
            {fileUrl ? (
              <div className="space-y-2">
                {isHtml ? (
                  <div className="p-4 border rounded-lg bg-muted/50 flex items-center gap-3">
                    <Globe className="w-8 h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Interactive Mind Map</p>
                      <p className="text-xs text-muted-foreground">HTML file uploaded — click to view when saved</p>
                    </div>
                  </div>
                ) : isPdf ? (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">PDF uploaded: {fileUrl.split('/').pop()}</p>
                    <a 
                      href={fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View PDF
                    </a>
                  </div>
                ) : (
                  <img
                    src={fileUrl}
                    alt="Preview"
                    className="max-h-[200px] rounded-lg object-contain bg-muted"
                  />
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onChange({ ...content, fileUrl: '', imageUrl: '', fileType: undefined })}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <DragDropZone
                id="mindmap-upload"
                accept="image/*,.pdf,.html,.htm,.svg"
                acceptedTypes={['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.html', '.htm']}
                maxSizeMB={50}
                onFileSelect={(file) => {
                  const ext = file.name.split('.').pop()?.toLowerCase() || '';
                  let ft: MindMapContent['fileType'] = 'png';
                  if (ext === 'html' || ext === 'htm') ft = 'html';
                  else if (ext === 'svg') ft = 'svg';
                  else if (ext === 'pdf') ft = 'pdf';
                  onChange({ ...content, fileType: ft });
                  onUpload(file);
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Or use external URL</Label>
            <Input
              value={fileUrl || ''}
              onChange={(e) => {
                const url = e.target.value;
                const ft = url ? detectFileType(url) : undefined;
                onChange({ ...content, fileUrl: url, imageUrl: url, fileType: ft });
              }}
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
