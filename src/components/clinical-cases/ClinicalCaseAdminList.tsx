import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import { 
  Trash2, 
  User,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Download,
  Play,
  ClipboardList,
  Upload,
  HelpCircle,
} from 'lucide-react';
import { ClinicalCase } from '@/types/clinicalCase';
import { useClinicalCases, useDeleteClinicalCase } from '@/hooks/useClinicalCases';
import { useNavigate } from 'react-router-dom';
import { StructuredCaseCreator } from './StructuredCaseCreator';
import { BulkSectionAssignment } from '@/components/sections/BulkSectionAssignment';
import { useCreateVirtualPatientCase } from '@/hooks/useVirtualPatient';
import { SectionType } from '@/types/structuredCase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClinicalCaseAdminListProps {
  moduleId: string;
  chapterId?: string;
  topicId?: string;
}

const levelColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function ClinicalCaseAdminList({ moduleId, chapterId, topicId }: ClinicalCaseAdminListProps) {
  const containerId = chapterId || topicId;
  const { data: cases, isLoading } = useClinicalCases(moduleId, true);
  const deleteCase = useDeleteClinicalCase();
  const navigate = useNavigate();

  const [structuredCaseOpen, setStructuredCaseOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ClinicalCase | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

  const filteredCases = (cases || [])
    .filter(c => {
      if (chapterId) return c.chapter_id === chapterId;
      if (topicId) return c.topic_id === topicId;
      return true;
    })
    .sort((a, b) => (LEVEL_ORDER[a.level] ?? 1) - (LEVEL_ORDER[b.level] ?? 1));

  const handleDownloadCases = () => {
    if (filteredCases.length === 0) {
      toast.error('No cases to download');
      return;
    }
    const headers = ['title', 'intro_text', 'level', 'estimated_minutes', 'is_published'];
    const rows = filteredCases.map(c => 
      headers.map(h => {
        const val = (c as any)[h];
        const str = val == null ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cases_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Downloaded ${filteredCases.length} cases`);
  };
  
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredCases.map(c => c.id)));
  }, [filteredCases]);

  const handleDeleteCase = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCase.mutateAsync(deleteConfirm.id);
      toast.success('Case deleted');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete case:', error);
      toast.error('Failed to delete case');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedIds.size > 0 && selectedIds.size === filteredCases.length}
              onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
                Clear
              </Button>
            )}
          </div>
          
          <BulkSectionAssignment
            chapterId={chapterId}
            topicId={topicId}
            selectedIds={Array.from(selectedIds)}
            contentTable="virtual_patient_cases"
            onComplete={clearSelection}
          />
          
          <Button size="sm" variant="outline" onClick={handleDownloadCases}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          <Button size="sm" onClick={() => setStructuredCaseOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1" />
            Create Case
          </Button>
        </div>
      </div>

      {/* Cases Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Interactive Cases</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first structured interactive case.
          </p>
          <Button onClick={() => setStructuredCaseOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1" />
            Create Case
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCases.map((clinicalCase) => {
            const activeSections = (clinicalCase as any).active_sections;
            const sectionCount = Array.isArray(activeSections) ? activeSections.length : 0;

            return (
              <Card key={clinicalCase.id} className={cn(!clinicalCase.is_published && "opacity-90")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Checkbox
                          checked={selectedIds.has(clinicalCase.id)}
                          onCheckedChange={(checked) => toggleSelection(clinicalCase.id, !!checked)}
                          aria-label={`Select ${clinicalCase.title}`}
                        />
                        {clinicalCase.is_published ? (
                          <Eye className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <Badge variant="outline" className={cn("text-xs", levelColors[clinicalCase.level])}>
                          {clinicalCase.level}
                        </Badge>
                        {!clinicalCase.is_published && (
                          <Badge variant="secondary" className="text-xs">DRAFT</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base line-clamp-1">{clinicalCase.title}</CardTitle>
                    </div>
                  </div>
                  <div className="h-10 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
                    <p className="text-sm text-muted-foreground">
                      {clinicalCase.intro_text}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      <span>{sectionCount > 0 ? `${sectionCount} sections` : 'No sections'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{clinicalCase.estimated_minutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/virtual-patient/${clinicalCase.id}`)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start Case
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/structured-case/${clinicalCase.id}/edit`)}
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteConfirm(clinicalCase)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Structured Case Creator */}
      <StructuredCaseCreator
        open={structuredCaseOpen}
        onOpenChange={setStructuredCaseOpen}
        moduleId={moduleId}
        chapterId={chapterId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deleteConfirm?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCase} className="bg-destructive text-destructive-foreground">
              {deleteCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
