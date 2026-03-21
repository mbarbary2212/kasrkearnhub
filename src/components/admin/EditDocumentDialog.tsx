import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YearGroupedModuleOptions } from '@/components/admin/YearGroupedModuleOptions';
import { AdminDocument, useUpdateAdminDocument } from '@/hooks/useAdminDocuments';
import { useModules } from '@/hooks/useModules';
import { useModuleChapters } from '@/hooks/useChapters';
import { useYears } from '@/hooks/useYears';
import { FileText, Pencil, Plus, X } from 'lucide-react';

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
  const { data: modules } = useModules();
  const { data: years } = useYears();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState('chapter_pdf');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const { data: chapters } = useModuleChapters(selectedModuleId || undefined);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setDescription(document.description || '');
      setDocType(document.doc_type || 'chapter_pdf');
      setSelectedModuleId(document.module_id || '');
      setSelectedChapterId(document.chapter_id || '');
      setTags(document.tags || []);
      setTagInput('');
    }
  }, [document]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!document || !title.trim()) return;

    updateMutation.mutate(
      {
        id: document.id,
        title: title.trim(),
        description: description.trim() || null,
        doc_type: docType,
        module_id: selectedModuleId || null,
        chapter_id: selectedChapterId || null,
        tags: tags.length > 0 ? tags : undefined,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Document
          </DialogTitle>
          <DialogDescription>
            Update document details and classification.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {/* File info (read-only) */}
          {document && (
            <div className="border-2 border-dashed rounded-lg p-4 text-center border-muted-foreground/25">
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">{document.file_name}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              rows={2}
            />
          </div>

          {/* Doc type */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Module/Chapter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={selectedModuleId} onValueChange={(v) => { setSelectedModuleId(v); setSelectedChapterId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <YearGroupedModuleOptions modules={modules} />
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select
                value={selectedChapterId}
                onValueChange={setSelectedChapterId}
                disabled={!selectedModuleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
