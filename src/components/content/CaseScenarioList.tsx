import { useState, useMemo, useCallback } from 'react';
import { Stethoscope, Star, Edit2, Trash2, Printer, ExternalLink, Filter, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CaseScenario, useDeleteCaseScenario, useRestoreCaseScenario } from '@/hooks/useCaseScenarios';
import { CaseScenarioDetailModal } from './CaseScenarioDetailModal';
import { CaseScenarioFormModal } from './CaseScenarioFormModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CaseScenarioListProps {
  cases: CaseScenario[];
  deletedCases?: CaseScenario[];
  moduleId?: string;
  chapterId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
}

export default function CaseScenarioList({
  cases,
  deletedCases = [],
  moduleId,
  chapterId,
  canEdit = false,
  canDelete = false,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: CaseScenarioListProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingCase, setEditingCase] = useState<CaseScenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCase, setDeletingCase] = useState<CaseScenario | null>(null);
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  const deleteCase = useDeleteCaseScenario();
  const restoreCase = useRestoreCaseScenario();

  const toggleMark = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const filteredCases = useMemo(() => {
    if (showMarkedOnly) {
      return cases.filter(caseItem => markedIds.has(caseItem.id));
    }
    return cases;
  }, [cases, showMarkedOnly, markedIds]);

  const handleOpen = (filteredIndex: number) => {
    const caseItem = filteredCases[filteredIndex];
    const actualIndex = cases.findIndex(c => c.id === caseItem.id);
    setSelectedIndex(actualIndex >= 0 ? actualIndex : 0);
    setDetailModalOpen(true);
  };

  const handleEdit = (caseItem: CaseScenario, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(caseItem);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (caseItem: CaseScenario, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCase(caseItem);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCase || !chapterId) return;

    try {
      await deleteCase.mutateAsync({ id: deletingCase.id, chapterId });
      toast.success('Case scenario deleted');
      setDeleteDialogOpen(false);
      setDeletingCase(null);
    } catch (error) {
      toast.error('Failed to delete case scenario');
    }
  };

  const handlePrint = (caseItem: CaseScenario, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const questions = caseItem.case_questions.split('|').map(q => q.trim()).filter(Boolean);
    const questionsHtml = questions.length > 1 
      ? `<ol>${questions.map(q => `<li>${q}</li>`).join('')}</ol>`
      : `<p>${caseItem.case_questions}</p>`;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${caseItem.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 24px; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .section { margin-bottom: 24px; }
          .section-label { font-weight: bold; color: #666; margin-bottom: 8px; }
          .section-content { white-space: pre-wrap; }
          ol { margin: 0; padding-left: 20px; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <h1>${caseItem.title}</h1>
        <div class="section">
          <div class="section-label">Case History:</div>
          <div class="section-content">${caseItem.case_history}</div>
        </div>
        <div class="section">
          <div class="section-label">Questions:</div>
          ${questionsHtml}
        </div>
        <div class="section">
          <div class="section-label">Model Answer:</div>
          <div class="section-content">${caseItem.model_answer}</div>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Check if there's no content to show at all
  const hasNoContent = cases.length === 0 && (!showDeleted || deletedCases.length === 0);

  const handleRestore = async (caseItem: CaseScenario, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chapterId) return;
    try {
      await restoreCase.mutateAsync({ id: caseItem.id, chapterId });
      toast.success('Case scenario restored');
    } catch (error) {
      toast.error('Failed to restore case scenario');
    }
  };

  // Combine active and deleted cases when showing deleted
  const displayCases = showDeleted ? [...cases, ...deletedCases] : cases;

  // If no content and no admin toggle, show simple empty state
  if (hasNoContent && !showDeletedToggle) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No case scenarios available yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Filter Bar - always visible when there's a toggle or content */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-3 w-3" />
                Filters
                {showMarkedOnly && (
                  <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={showMarkedOnly}
                onCheckedChange={setShowMarkedOnly}
              >
                <Star className="h-3 w-3 mr-2 text-amber-500" />
                Marked for review ({markedIds.size})
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separate Show Deleted button - only visible to admins */}
          {showDeletedToggle && (
            <Button
              variant={showDeleted ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "gap-2",
                showDeleted && "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
              )}
              onClick={() => onShowDeletedChange?.(!showDeleted)}
            >
              <Trash2 className="h-3 w-3" />
              Show deleted ({deletedCases.length})
            </Button>
          )}
        </div>
      </div>

      {displayCases.length === 0 && filteredCases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {showMarkedOnly 
              ? 'No marked cases. Click the star icon on any case to mark it for review.' 
              : 'No case scenarios available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(showMarkedOnly ? filteredCases : displayCases).map((caseItem, index) => {
            const isDeleted = caseItem.is_deleted;
            return (
              <Card 
                key={caseItem.id} 
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer",
                  isDeleted && "opacity-60 border-destructive/30 bg-destructive/5"
                )}
                onClick={() => !isDeleted && handleOpen(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Mark for Review star */}
                        {!isDeleted && (
                          <button
                            onClick={(e) => toggleMark(caseItem.id, e)}
                            className={cn(
                              'p-1 rounded-full transition-colors hover:bg-muted shrink-0',
                              markedIds.has(caseItem.id) ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                            )}
                            title={markedIds.has(caseItem.id) ? 'Remove from review' : 'Mark for review'}
                          >
                            <Star className={cn('h-4 w-4', markedIds.has(caseItem.id) && 'fill-current')} />
                          </button>
                        )}
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs mr-1">Deleted</Badge>
                        )}
                        <h3 className={cn("font-medium truncate", isDeleted && "line-through")}>{caseItem.title}</h3>
                        {caseItem.rating && !isDeleted && (
                          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {caseItem.rating}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 ml-7">
                        {caseItem.case_history}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleRestore(caseItem, e)}
                          className="h-8 gap-2 text-emerald-600 hover:text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpen(index);
                            }}
                            title="Open"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          {(canEdit || canDelete) && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handlePrint(caseItem, e)}
                                title="Print"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => handleEdit(caseItem, e)}
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => handleDeleteClick(caseItem, e)}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal with single-focus behavior */}
      <CaseScenarioDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        cases={showMarkedOnly ? filteredCases : cases}
        initialIndex={showMarkedOnly ? 0 : selectedIndex}
        markedIds={markedIds}
        onToggleMark={toggleMark}
      />

      {/* Edit Modal */}
      {editingCase && moduleId && chapterId && (
        <CaseScenarioFormModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setEditingCase(null);
          }}
          moduleId={moduleId}
          chapterId={chapterId}
          existingCase={editingCase}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCase?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCase.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCase.isPending}
            >
              {deleteCase.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
