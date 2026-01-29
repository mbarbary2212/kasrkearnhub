import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ClinicalCase } from '@/types/clinicalCase';
import { useClinicalCases, useDeleteClinicalCase } from '@/hooks/useClinicalCases';
import { ClinicalCaseFormModal } from './ClinicalCaseFormModal';
import { ClinicalCaseBuilderModal } from './ClinicalCaseBuilderModal';
import { ClinicalCaseAIGenerateModal } from './ClinicalCaseAIGenerateModal';
import { BulkSectionAssignment } from '@/components/sections/BulkSectionAssignment';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClinicalCaseAdminListProps {
  moduleId: string;
  chapterId?: string;
}

const levelColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const MIN_STAGES_TO_PUBLISH = 1; // Read cases only need 1 stage

export function ClinicalCaseAdminList({ moduleId, chapterId }: ClinicalCaseAdminListProps) {
  const { data: cases, isLoading } = useClinicalCases(moduleId, true);
  const deleteCase = useDeleteClinicalCase();

  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<ClinicalCase | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClinicalCase | null>(null);
  
  // Multi-select state for bulk section assignment
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

  // Filter by chapter if provided
  const filteredCases = (cases || []).filter(c => {
    if (chapterId) return c.chapter_id === chapterId;
    return true;
  });
  
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredCases.map(c => c.id)));
  }, [filteredCases]);

  const handleCreateCase = () => {
    setEditingCase(null);
    setCaseFormOpen(true);
  };

  const handleEditCase = (clinicalCase: ClinicalCase) => {
    setEditingCase(clinicalCase);
    setCaseFormOpen(true);
  };

  const handleOpenBuilder = (caseId: string) => {
    setSelectedCaseId(caseId);
    setBuilderOpen(true);
  };

  const handleCaseCreated = (caseId: string) => {
    // Auto-open builder after case creation
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

  // Helper to get status badge
  const getStatusBadge = (clinicalCase: ClinicalCase) => {
    const stageCount = clinicalCase.stage_count || 0;
    const minStages = clinicalCase.case_mode === 'read_case' ? 1 : MIN_STAGES_TO_PUBLISH;
    if (stageCount === 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertCircle className="w-3 h-3" />
                INCOMPLETE
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>No stages added. Build the case to add stages.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (stageCount < minStages && !clinicalCase.is_published) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                {stageCount} stage{stageCount !== 1 ? 's' : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add at least {minStages} stages before publishing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (!clinicalCase.is_published) {
      return <Badge variant="secondary" className="text-xs">DRAFT</Badge>;
    }
    
    return null;
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
      {/* Header with Add Buttons */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-select controls */}
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
            selectedIds={Array.from(selectedIds)}
            contentTable="virtual_patient_cases"
            onComplete={clearSelection}
          />
          
          <Button size="sm" variant="outline" onClick={() => setAiGenerateOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1" />
            Generate with AI
          </Button>
          <Button size="sm" onClick={handleCreateCase}>
            <Plus className="w-4 h-4 mr-1" />
            Add Case
          </Button>
        </div>
      </div>

      {/* Cases Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Virtual Patient Cases</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first virtual patient case, or let AI generate one for you.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setAiGenerateOpen(true)}>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate with AI
            </Button>
            <Button onClick={handleCreateCase}>
              <Plus className="w-4 h-4 mr-1" />
              Create Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCases.map((clinicalCase) => {
            const stageCount = clinicalCase.stage_count || 0;
            const isIncomplete = stageCount === 0;
            
            return (
              <Card 
                key={clinicalCase.id} 
                className={cn(
                  !clinicalCase.is_published && "opacity-90",
                  isIncomplete && "border-destructive/50 border-dashed"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {clinicalCase.is_published ? (
                          <Eye className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <Badge variant="outline" className={cn("text-xs", levelColors[clinicalCase.level])}>
                          {clinicalCase.level}
                        </Badge>
                        {getStatusBadge(clinicalCase)}
                      </div>
                      <CardTitle className="text-base line-clamp-1">{clinicalCase.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {clinicalCase.intro_text}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className={cn(
                      "flex items-center gap-1",
                      isIncomplete && "text-destructive"
                    )}>
                      <Layers className="w-4 h-4" />
                      <span>{stageCount} stage{stageCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{clinicalCase.estimated_minutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={isIncomplete ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenBuilder(clinicalCase.id)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      {isIncomplete ? 'Build Stages' : 'Edit Stages'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditCase(clinicalCase)}
                    >
                      <Edit2 className="w-4 h-4" />
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

      {/* Case Form Modal */}
      <ClinicalCaseFormModal
        open={caseFormOpen}
        onOpenChange={setCaseFormOpen}
        moduleId={moduleId}
        chapterId={chapterId}
        clinicalCase={editingCase}
        onSuccess={handleCaseCreated}
      />

      {/* Case Builder Modal */}
      {selectedCaseId && (
        <ClinicalCaseBuilderModal
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          caseId={selectedCaseId}
          moduleId={moduleId}
        />
      )}

      {/* AI Generate Modal */}
      <ClinicalCaseAIGenerateModal
        open={aiGenerateOpen}
        onOpenChange={setAiGenerateOpen}
        moduleId={moduleId}
        chapterId={chapterId}
        onCaseCreated={handleCaseCreated}
      />

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
