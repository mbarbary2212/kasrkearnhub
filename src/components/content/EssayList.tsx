import { useState, useMemo, useCallback } from 'react';
import { PenTool, Star, Printer, ExternalLink, Filter, Trash2, RotateCcw, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import ContentItemActions from '@/components/admin/ContentItemActions';
import { EssayDetailModal } from './EssayDetailModal';
import { EssaysAdminTable } from './EssaysAdminTable';
import { AdminViewToggle, ViewMode } from '@/components/admin/AdminViewToggle';
import { BulkSectionAssignment, AutoTagSectionsButton } from '@/components/sections';
import { useBulkDeleteContent } from '@/hooks/useContentBulkOperations';
import { cn } from '@/lib/utils';
import { useContentDelete } from '@/hooks/useContentDelete';
import { toast } from 'sonner';

interface Essay {
  id: string;
  title: string;
  question: string;
  model_answer?: string | null;
  rating?: number | null;
  max_points?: number | null;
  keywords?: string[] | null;
  is_deleted?: boolean;
  chapter_id?: string | null;
  section_id?: string | null;
  difficulty_level?: string | null;
  question_type?: string | null;
  rubric_json?: unknown | null;
}

interface EssayListProps {
  essays: Essay[];
  deletedEssays?: Essay[];
  moduleId?: string;
  chapterId?: string;
  topicId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showFeedback?: boolean;
  showDeletedToggle?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
  onActiveItemChange?: (item: { item_id: string; item_label: string; item_index: number }) => void;
}

export default function EssayList({
  essays,
  deletedEssays = [],
  moduleId,
  chapterId,
  topicId,
  canEdit = false,
  canDelete = false,
  showFeedback = true,
  showDeletedToggle = false,
  showDeleted = false,
  onShowDeletedChange,
}: EssayListProps) {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('cards');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const isAdmin = canEdit || canDelete;
  const { doRestore } = useContentDelete('essays', moduleId || '', chapterId);
  const bulkDelete = useBulkDeleteContent('essays');

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

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const idsToSelect = essays.filter(e => !e.is_deleted).map(e => e.id);
    setSelectedIds(new Set(idsToSelect));
  }, [essays]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync({
        ids: Array.from(selectedIds),
        chapterId,
      });
      toast.success(`Deleted ${selectedIds.size} essays`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to delete essays');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const filteredEssays = useMemo(() => {
    if (showMarkedOnly) {
      return essays.filter(essay => markedIds.has(essay.id));
    }
    return essays;
  }, [essays, showMarkedOnly, markedIds]);

  const handleOpen = (filteredIndex: number) => {
    // Find the actual index in the original array for navigation
    const essay = filteredEssays[filteredIndex];
    const actualIndex = essays.findIndex(e => e.id === essay.id);
    setSelectedIndex(actualIndex >= 0 ? actualIndex : 0);
    setDetailModalOpen(true);
  };

  const handlePrint = (essay: Essay, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${essay.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 24px; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .section { margin-bottom: 24px; }
          .section-label { font-weight: bold; color: #666; margin-bottom: 8px; }
          .section-content { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${essay.title}</h1>
        <div class="section">
          <div class="section-label">Question:</div>
          <div class="section-content">${essay.question}</div>
        </div>
        ${essay.model_answer ? `
        <div class="section">
          <div class="section-label">Answer:</div>
          <div class="section-content">${essay.model_answer}</div>
        </div>
        ` : ''}
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

  // Show empty state if no essays AND no deleted essays (and not showing deleted)
  const hasNoContent = essays.length === 0 && (!showDeleted || deletedEssays.length === 0);

  // Combine active and deleted essays when showing deleted
  const displayEssays = showDeleted ? [...essays, ...deletedEssays] : essays;

  // If no content and no admin toggle, show simple empty state
  if (hasNoContent && !showDeletedToggle) {
    return (
      <div className="text-center py-12">
        <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No short questions available yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Filter Bar - always visible when there's a toggle or content */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-select controls for admin */}
          {isAdmin && (
            <>
              <Checkbox
                checked={selectedIds.size > 0 && selectedIds.size === essays.filter(e => !e.is_deleted).length}
                onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                aria-label="Select all"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
              {selectedIds.size > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 gap-1">
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                  {chapterId && (
                    <BulkSectionAssignment
                      chapterId={chapterId}
                      selectedIds={Array.from(selectedIds)}
                      contentTable="essays"
                      onComplete={clearSelection}
                    />
                  )}
                  <AutoTagSectionsButton chapterId={chapterId} />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="h-7 gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </>
          )}
          
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
              Show deleted ({deletedEssays.length})
            </Button>
          )}
        </div>
        
        {/* Admin view toggle */}
        {isAdmin && (
          <AdminViewToggle viewMode={adminViewMode} onViewModeChange={setAdminViewMode} />
        )}
      </div>

      {/* Admin Table View */}
      {isAdmin && adminViewMode === 'table' ? (
        <EssaysAdminTable
          essays={displayEssays.filter(e => !e.is_deleted)}
          chapterId={chapterId}
          moduleId={moduleId}
        />
      ) : displayEssays.length === 0 && filteredEssays.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {showMarkedOnly 
              ? 'No marked questions. Click the star icon on any question to mark it for review.' 
              : 'No short questions available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(showMarkedOnly ? filteredEssays : displayEssays).map((essay, index) => {
            const isDeleted = essay.is_deleted;
            return (
              <Card 
                key={essay.id} 
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
                        {/* Checkbox for multi-select (admin only) */}
                        {isAdmin && !isDeleted && (
                          <Checkbox
                            checked={selectedIds.has(essay.id)}
                            onCheckedChange={(checked) => toggleSelection(essay.id, !!checked)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${essay.title}`}
                            className="shrink-0"
                          />
                        )}
                        {/* Mark for Review star */}
                        {!isDeleted && (
                          <button
                            onClick={(e) => toggleMark(essay.id, e)}
                            className={cn(
                              'p-1 rounded-full transition-colors hover:bg-muted shrink-0',
                              markedIds.has(essay.id) ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-400'
                            )}
                            title={markedIds.has(essay.id) ? 'Remove from review' : 'Mark for review'}
                          >
                            <Star className={cn('h-4 w-4', markedIds.has(essay.id) && 'fill-current')} />
                          </button>
                        )}
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs mr-1">Deleted</Badge>
                        )}
                        <h3 className={cn("font-medium truncate", isDeleted && "line-through")}>{essay.title}</h3>
                        {essay.rating && !isDeleted && (
                          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {essay.rating}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 ml-7">{essay.question}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            doRestore(essay.id, essay.title);
                          }}
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
                                onClick={(e) => handlePrint(essay, e)}
                                title="Print"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              {moduleId && (
                              <ContentItemActions
                                id={essay.id}
                                title={essay.title}
                                description={essay.question}
                                modelAnswer={essay.model_answer}
                                rating={essay.rating}
                                maxPoints={essay.max_points}
                                keywords={essay.keywords}
                                difficultyLevel={essay.difficulty_level}
                                questionType={essay.question_type}
                                rubricJson={essay.rubric_json}
                                contentType="essay"
                                moduleId={moduleId}
                                chapterId={chapterId}
                                topicId={topicId}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                showFeedback={showFeedback}
                              />
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
      <EssayDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        essays={(showMarkedOnly ? filteredEssays : essays).map(e => ({ ...e, chapter_id: chapterId }))}
        initialIndex={showMarkedOnly ? 0 : selectedIndex}
        markedIds={markedIds}
        onToggleMark={toggleMark}
        isAdmin={canEdit}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} essays?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected essays. You can restore them later from the deleted items view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
