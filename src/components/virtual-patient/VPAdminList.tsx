import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  User,
  Clock,
  Layers,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { VPCase } from '@/types/virtualPatient';
import { useVirtualPatientCases, useDeleteVirtualPatientCase } from '@/hooks/useVirtualPatient';
import { VPCaseFormModal } from './VPCaseFormModal';
import { VPCaseBuilderModal } from './VPCaseBuilderModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VPAdminListProps {
  moduleId: string;
  chapterId?: string;
}

const levelColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function VPAdminList({ moduleId, chapterId }: VPAdminListProps) {
  const { data: cases, isLoading } = useVirtualPatientCases(moduleId, true);
  const deleteCase = useDeleteVirtualPatientCase();

  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<VPCase | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<VPCase | null>(null);

  // Filter by chapter if provided
  const filteredCases = (cases || []).filter(c => {
    if (chapterId) return c.chapter_id === chapterId;
    return true;
  });

  const handleCreateCase = () => {
    setEditingCase(null);
    setCaseFormOpen(true);
  };

  const handleEditCase = (vpCase: VPCase) => {
    setEditingCase(vpCase);
    setCaseFormOpen(true);
  };

  const handleOpenBuilder = (caseId: string) => {
    setSelectedCaseId(caseId);
    setBuilderOpen(true);
  };

  const handleCaseCreated = (caseId: string) => {
    setSelectedCaseId(caseId);
    setBuilderOpen(true);
  };

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
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={handleCreateCase}>
          <Plus className="w-4 h-4 mr-1" />
          Add Case
        </Button>
      </div>

      {/* Cases Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Virtual Patient Cases</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first virtual patient case to get started.
          </p>
          <Button onClick={handleCreateCase}>
            <Plus className="w-4 h-4 mr-1" />
            Create Case
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCases.map((vpCase) => (
            <Card key={vpCase.id} className={cn(!vpCase.is_published && "opacity-75 border-dashed")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {vpCase.is_published ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Badge variant="outline" className={cn("text-xs", levelColors[vpCase.level])}>
                        {vpCase.level}
                      </Badge>
                    </div>
                    <CardTitle className="text-base line-clamp-1">{vpCase.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {vpCase.intro_text}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    <span>{vpCase.stage_count || 0} stages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{vpCase.estimated_minutes} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenBuilder(vpCase.id)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Build Stages
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEditCase(vpCase)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteConfirm(vpCase)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Case Form Modal */}
      <VPCaseFormModal
        open={caseFormOpen}
        onOpenChange={setCaseFormOpen}
        moduleId={moduleId}
        chapterId={chapterId}
        vpCase={editingCase}
        onSuccess={handleCaseCreated}
      />

      {/* Case Builder Modal */}
      {selectedCaseId && (
        <VPCaseBuilderModal
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          caseId={selectedCaseId}
          moduleId={moduleId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Virtual Patient Case?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deleteConfirm?.title}" and all its stages. This action cannot be undone.
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
