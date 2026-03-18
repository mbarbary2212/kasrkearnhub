import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Network, Trash2, Save, Loader2, Eye, EyeOff, FileText, RefreshCw, X } from 'lucide-react';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAppMindMapSetting, useUpsertStudySetting } from '@/hooks/useStudyResources';
import { useQueryClient } from '@tanstack/react-query';

interface MindMapSetting {
  format: 'markdown' | 'file';
  markdown_text?: string;
  fileUrl?: string;
  fileType?: 'html' | 'svg' | 'png' | 'pdf';
}

function MindMapVersionEditor({ audience, label }: { audience: 'student' | 'admin'; label: string }) {
  const { data: setting, isLoading } = useAppMindMapSetting(audience);
  const upsertSetting = useUpsertStudySetting();
  const queryClient = useQueryClient();
  const settingKey = audience === 'student' ? 'app_mindmap_student' : 'app_mindmap_admin';

  const [isFileMode, setIsFileMode] = useState(false);
  const [markdownText, setMarkdownText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState<string>('html');
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (setting) {
      setIsFileMode(setting.format === 'file');
      setMarkdownText(setting.markdown_text || '');
      setFileUrl(setting.fileUrl || '');
      setFileType(setting.fileType || 'html');
    }
  }, [setting]);

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['html', 'htm', 'svg', 'png', 'jpg', 'jpeg', 'pdf'];
    if (!ext || !allowedExts.includes(ext)) {
      toast.error('Unsupported file type. Use HTML, SVG, PNG, or PDF.');
      return;
    }

    setUploading(true);
    try {
      const storagePath = `home-mindmap/${audience}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('study-resources')
        .upload(storagePath, file, { upsert: true, contentType: file.type || undefined });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('study-resources')
        .getPublicUrl(storagePath);

      const resolvedType = ext === 'htm' ? 'html' : ['jpg', 'jpeg'].includes(ext) ? 'png' : ext;
      setFileUrl(urlData.publicUrl);
      setFileType(resolvedType);
      setDirty(true);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const payload: MindMapSetting = isFileMode
      ? { format: 'file', fileUrl, fileType: fileType as any }
      : { format: 'markdown', markdown_text: markdownText };

    try {
      await upsertSetting.mutateAsync({ key: settingKey, value: JSON.stringify(payload) });
      queryClient.invalidateQueries({ queryKey: ['study-settings', settingKey] });
      setDirty(false);
      toast.success(`${label} mind map setting saved`);
    } catch (error) {
      toast.error('Failed to save setting');
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('study_settings').delete().eq('key', settingKey);
      queryClient.invalidateQueries({ queryKey: ['study-settings', settingKey] });
      setMarkdownText('');
      setFileUrl('');
      setIsFileMode(false);
      setDirty(false);
      toast.success(`${label} mind map reset to default`);
    } catch {
      toast.error('Failed to delete setting');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading {label.toLowerCase()} setting…
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{label} Version</Label>
        <Badge variant={setting ? 'default' : 'secondary'}>
          {setting ? (setting.format === 'file' ? 'File' : 'Markdown') : 'Default (fallback)'}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor={`mode-${audience}`} className="text-sm text-muted-foreground">Markdown</Label>
        <Switch
          id={`mode-${audience}`}
          checked={isFileMode}
          onCheckedChange={(v) => { setIsFileMode(v); setDirty(true); }}
        />
        <Label className="text-sm text-muted-foreground">File Upload</Label>
      </div>

      {isFileMode ? (
        <div className="space-y-3">
          {fileUrl ? (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{fileUrl.split('/').pop()}</span>
              <Badge variant="outline" className="text-xs">{fileType}</Badge>
              <input
                ref={replaceInputRef}
                type="file"
                accept=".html,.htm,.svg,.png,.jpg,.jpeg,.pdf"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }}
              />
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={() => replaceInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Replace
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => { setFileUrl(''); setDirty(true); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <DragDropZone
              id={`mindmap-upload-${audience}`}
              accept=".html,.htm,.svg,.png,.jpg,.jpeg,.pdf"
              acceptedTypes={['.html', '.htm', '.svg', '.png', '.jpg', '.jpeg', '.pdf']}
              maxSizeMB={50}
              onFileSelect={uploadFile}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Markdown Content</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
          {showPreview ? (
            <div className="prose prose-sm dark:prose-invert max-w-none p-3 border rounded-md min-h-[120px] bg-muted/30">
              {markdownText ? (
                <ReactMarkdownLazy>{markdownText}</ReactMarkdownLazy>
              ) : (
                <p className="text-muted-foreground italic">Empty — will use default fallback</p>
              )}
            </div>
          ) : (
            <Textarea
              value={markdownText}
              onChange={(e) => { setMarkdownText(e.target.value); setDirty(true); }}
              placeholder="# App Structure&#10;&#10;## Section..."
              className="min-h-[160px] font-mono text-xs"
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" className="gap-2" onClick={handleSave} disabled={upsertSetting.isPending || (!dirty && !!setting)}>
          {upsertSetting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </Button>
        {setting && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
            Reset to Default
          </Button>
        )}
      </div>
    </div>
  );
}

// Lazy wrapper to avoid importing react-markdown in admin page bundle if not needed
function ReactMarkdownLazy({ children }: { children: string }) {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    import('@/components/ui/SafeMarkdown').then((mod) => setComp(() => mod.SafeMarkdown));
  }, []);
  if (!Comp) return <p className="text-muted-foreground">Loading preview…</p>;
  return <Comp>{children}</Comp>;
}

export function HomeMindMapSettings() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Network className="w-5 h-5" />
              App Mind Map
            </CardTitle>
            <CardDescription>
              Configure the mind map view on the Home page.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <MindMapVersionEditor audience="student" label="Student" />
            <MindMapVersionEditor audience="admin" label="Admin" />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
