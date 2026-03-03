import { useState } from 'react';
import { FileText, Download, Pencil, Trash2, Check, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PdfViewerModal } from '@/components/content/PdfViewerModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SocraticDocumentCardProps {
  doc: {
    id: string;
    title: string;
    description?: string | null;
    file_url?: string | null;
    external_url?: string | null;
  };
  canManage: boolean;
  invalidateKey: string[];
}

export function SocraticDocumentCard({ doc, canManage, invalidateKey }: SocraticDocumentCardProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  const fileUrl = doc.file_url || doc.external_url;
  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf') || fileUrl?.toLowerCase().includes('.pdf?');

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    const { error } = await supabase.from('resources').update({ title: editTitle.trim() }).eq('id', doc.id);
    if (error) {
      toast.error('Failed to update title');
    } else {
      toast.success('Title updated');
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setShowDeleteDialog(false);
    const { error } = await supabase.from('resources').delete().eq('id', doc.id);
    if (error) {
      toast.error('Failed to delete document');
    } else {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    }
    setDeleting(false);
  };

  const handleTitleClick = () => {
    if (isEditing) return;
    if (isPdf && fileUrl) {
      setPdfViewerOpen(true);
    } else if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <FileText className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') { setIsEditing(false); setEditTitle(doc.title); }
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}><Check className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsEditing(false); setEditTitle(doc.title); }}><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <>
              <p
                className="text-sm font-medium truncate cursor-pointer hover:underline"
                onClick={handleTitleClick}
              >
                {doc.title}
              </p>
              {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPdf && fileUrl && !isEditing && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="View PDF" onClick={() => setPdfViewerOpen(true)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
          )}
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Download">
                <Download className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          {canManage && !isEditing && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Rename" onClick={() => setIsEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => setShowDeleteDialog(true)} disabled={deleting}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isPdf && fileUrl && (
        <PdfViewerModal
          open={pdfViewerOpen}
          onOpenChange={setPdfViewerOpen}
          pdfUrl={fileUrl}
          title={doc.title}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{doc.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
