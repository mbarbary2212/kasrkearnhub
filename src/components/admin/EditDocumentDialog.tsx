import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminDocument, useUpdateAdminDocument } from '@/hooks/useAdminDocuments';
import { useModules } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useModuleChapters';

const DOC_TYPES = [
  { value: 'book_pdf', label: 'Book PDF' },
  { value: 'chapter_pdf', label: 'Chapter PDF' },
  { value: 'lecture_pdf', label: 'Lecture PDF' },
];

interface EditDocumentDialogProps {
  document: AdminDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDocumentDialog({ document, open, onOpenChange }: EditDocumentDialogProps) {
  const updateMutation = useUpdateAdminDocument();
  const { data: modules = [] } = useModules();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState('');
  const [moduleId, setModuleId] = useState<string>('');
  const [chapterId, setChapterId] = useState<string>('');
  const [tags, setTags] = useState('');

  const { data: chapters = [] } = useModuleChapters(moduleId || undefined);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setDescription(document.description || '');
      setDocType(document.doc_type || '');
      setModuleId(document.module_id || '');
      setChapterId(document.chapter_id || '');
      setTags((document.tags || []).join(', '));
    }
  }, [document]);

  const handleSave = () => {
    if (!document) return;
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    updateMutation.mutate(
      {
        id: document.id,
        title,
        description: description || null,
        doc_type: docType || undefined,
        module_id: moduleId || null,
        chapter_id: chapterId || null,
        tags: tagArray.length > 0 ? tagArray : undefined,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-2">
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Module</Label>
            <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setChapterId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {moduleId && chapters.length > 0 && (
            <div className="grid gap-2">
              <Label>Chapter</Label>
              <Select value={chapterId} onValueChange={setChapterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input id="edit-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. anatomy, surgery" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending || !title.trim()}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
