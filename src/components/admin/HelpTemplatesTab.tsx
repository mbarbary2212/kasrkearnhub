import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  BookOpen, 
  FileSpreadsheet,
  Loader2,
  Plus,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminHelpFile {
  id: string;
  category: 'guide' | 'template';
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  template_type: string | null;
  display_order: number;
  created_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'mcq', label: 'MCQs' },
  { value: 'matching', label: 'Matching Questions' },
  { value: 'essay', label: 'Short Answer / Essay' },
  { value: 'case_scenario', label: 'Case Scenarios' },
  { value: 'osce', label: 'OSCE' },
  { value: 'flashcard', label: 'Flashcards' },
];

export function HelpTemplatesTab() {
  const { user, isPlatformAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: 'guide' as 'guide' | 'template',
    title: '',
    description: '',
    template_type: '',
    file: null as File | null,
  });

  // Fetch help files
  const { data: helpFiles, isLoading } = useQuery({
    queryKey: ['admin-help-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_help_files')
        .select('*')
        .order('category')
        .order('display_order');
      
      if (error) throw error;
      return data as AdminHelpFile[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (file: AdminHelpFile) => {
      // Delete from storage first
      const path = file.file_url.split('/admin-templates/')[1];
      if (path) {
        await supabase.storage.from('admin-templates').remove([path]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('admin_help_files')
        .delete()
        .eq('id', file.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-help-files'] });
      toast.success('File deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete file');
    },
  });

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast.error('Please fill in required fields');
      return;
    }

    if (uploadForm.category === 'template' && !uploadForm.template_type) {
      toast.error('Please select a template type');
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${uploadForm.category}/${Date.now()}_${uploadForm.file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('admin-templates')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('admin-templates')
        .getPublicUrl(fileName);

      // Get current max display_order
      const existingFiles = helpFiles?.filter(f => f.category === uploadForm.category) || [];
      const maxOrder = existingFiles.length > 0 
        ? Math.max(...existingFiles.map(f => f.display_order)) + 1 
        : 0;

      // Insert record
      const { error: insertError } = await supabase
        .from('admin_help_files')
        .insert({
          category: uploadForm.category,
          title: uploadForm.title,
          description: uploadForm.description || null,
          file_url: publicUrl,
          file_name: uploadForm.file.name,
          template_type: uploadForm.category === 'template' ? uploadForm.template_type : null,
          display_order: maxOrder,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['admin-help-files'] });
      toast.success('File uploaded successfully');
      setUploadDialogOpen(false);
      setUploadForm({
        category: 'guide',
        title: '',
        description: '',
        template_type: '',
        file: null,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (file: AdminHelpFile) => {
    window.open(file.file_url, '_blank');
  };

  const guides = helpFiles?.filter(f => f.category === 'guide') || [];
  const templates = helpFiles?.filter(f => f.category === 'template') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button (Platform Admin only) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Help & Templates
          </h2>
          <p className="text-sm text-muted-foreground">
            Download guides and templates for content preparation.
          </p>
        </div>
        {isPlatformAdmin && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        )}
      </div>

      {/* Guides Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Guides
          </CardTitle>
          <CardDescription>
            Documentation and guides for preparing content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guides.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No guides uploaded yet.
              {isPlatformAdmin && ' Click "Upload File" to add one.'}
            </p>
          ) : (
            <div className="space-y-3">
              {guides.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{file.title}</p>
                      {file.description && (
                        <p className="text-sm text-muted-foreground">{file.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{file.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {isPlatformAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this file?')) {
                            deleteMutation.mutate(file);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Excel Templates
          </CardTitle>
          <CardDescription>
            Downloadable templates for bulk content upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No templates uploaded yet.
              {isPlatformAdmin && ' Click "Upload File" to add one.'}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((file) => {
                const templateType = TEMPLATE_TYPES.find(t => t.value === file.template_type);
                return (
                  <div key={file.id} className="flex flex-col p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      {isPlatformAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this template?')) {
                              deleteMutation.mutate(file);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{file.title}</p>
                      {templateType && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-secondary rounded mt-1">
                          {templateType.label}
                        </span>
                      )}
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-2">{file.description}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Add a new guide or template for admins to download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(value: 'guide' | 'template') => 
                  setUploadForm(prev => ({ ...prev, category: value, template_type: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guide">Guide (PDF/Document)</SelectItem>
                  <SelectItem value="template">Excel Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uploadForm.category === 'template' && (
              <div className="space-y-2">
                <Label>Template Type *</Label>
                <Select
                  value={uploadForm.template_type}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, template_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Admin CSV Preparation Guide"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the file..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>File *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept={uploadForm.category === 'template' ? '.xlsx,.xls,.csv' : '.pdf,.doc,.docx'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm(prev => ({ ...prev, file }));
                    }
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  {uploadForm.file ? (
                    <p className="text-sm font-medium">{uploadForm.file.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click to select a file
                      <br />
                      <span className="text-xs">
                        {uploadForm.category === 'template' 
                          ? 'Accepts: .xlsx, .xls, .csv' 
                          : 'Accepts: .pdf, .doc, .docx'}
                      </span>
                    </p>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
