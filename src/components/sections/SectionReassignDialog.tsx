import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Section } from '@/hooks/useSections';

// All content tables that have a section_id column
const CONTENT_TABLES = [
  { table: 'mcqs', label: 'MCQs' },
  { table: 'mcq_sets', label: 'MCQ Sets' },
  { table: 'essays', label: 'Essays' },
  { table: 'osce_questions', label: 'OSCE Questions' },
  { table: 'matching_questions', label: 'Matching Questions' },
  { table: 'true_false_questions', label: 'True/False Questions' },
  { table: 'lectures', label: 'Lectures' },
  { table: 'resources', label: 'Resources' },
  { table: 'study_resources', label: 'Study Resources' },
  { table: 'practicals', label: 'Practicals' },
  { table: 'case_scenarios', label: 'Case Scenarios' },
  { table: 'virtual_patient_cases', label: 'Virtual Patient Cases' },
  { table: 'concepts', label: 'Concepts' },
  { table: 'mind_maps', label: 'Mind Maps' },
  { table: 'interactive_algorithms', label: 'Interactive Algorithms' },
  { table: 'chapter_blueprint_config', label: 'Blueprint Configs' },
] as const;

interface ContentCount {
  table: string;
  label: string;
  count: number;
}

interface SectionReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section | null;
  allSections: Section[];
  mode: 'delete' | 'edit';
  onConfirm: () => void;
}

export function SectionReassignDialog({
  open,
  onOpenChange,
  section,
  allSections,
  mode,
  onConfirm,
}: SectionReassignDialogProps) {
  const [counts, setCounts] = useState<ContentCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string>('unassign');
  const queryClient = useQueryClient();

  const otherSections = allSections.filter((s) => s.id !== section?.id);
  const totalContent = counts.reduce((sum, c) => sum + c.count, 0);

  // Fetch content counts when dialog opens
  useEffect(() => {
    if (!open || !section) {
      setCounts([]);
      setTargetSectionId('unassign');
      return;
    }

    let cancelled = false;
    const fetchCounts = async () => {
      setLoading(true);
      const results: ContentCount[] = [];

      // Also count lecture_sections junction
      const promises = CONTENT_TABLES.map(async ({ table, label }) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('section_id', section.id);
        if (!error && count && count > 0) {
          results.push({ table, label, count });
        }
      });

      // lecture_sections junction
      promises.push(
        (async () => {
          const { count, error } = await supabase
            .from('lecture_sections')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', section.id);
          if (!error && count && count > 0) {
            results.push({ table: 'lecture_sections', label: 'Lecture-Section Links', count });
          }
        })()
      );

      await Promise.all(promises);
      if (!cancelled) {
        setCounts(results.sort((a, b) => b.count - a.count));
        setLoading(false);
      }
    };

    fetchCounts();
    return () => { cancelled = true; };
  }, [open, section?.id]);

  const handleConfirm = async () => {
    if (!section) return;

    if (totalContent > 0 && targetSectionId !== 'unassign') {
      setReassigning(true);
      try {
        // Reassign all content from this section to the target
        for (const { table } of counts) {
          if (table === 'lecture_sections') {
            // For junction table: delete rows that would conflict, then update
            if (targetSectionId !== 'unassign') {
              // Delete lecture_sections that already link to target (avoid dupe)
              const { data: existing } = await supabase
                .from('lecture_sections')
                .select('lecture_id')
                .eq('section_id', section.id);

              if (existing?.length) {
                const lectureIds = existing.map((r) => r.lecture_id);
                // Remove conflicts
                await supabase
                  .from('lecture_sections')
                  .delete()
                  .eq('section_id', section.id)
                  .in('lecture_id', lectureIds);

                // Insert new links (ignore conflicts)
                const inserts = lectureIds.map((lid) => ({
                  lecture_id: lid,
                  section_id: targetSectionId,
                }));
                // Use upsert-like approach: insert and ignore existing
                for (const ins of inserts) {
                  await supabase
                    .from('lecture_sections')
                    .upsert(ins, { onConflict: 'lecture_id,section_id' });
                }
              }
            }
          } else {
            await supabase
              .from(table)
              .update({ section_id: targetSectionId })
              .eq('section_id', section.id);
          }
        }

        toast.success(`Reassigned ${totalContent} items to the selected section`);

        // Invalidate all content queries
        queryClient.invalidateQueries({ predicate: () => true });
      } catch (err) {
        console.error('Reassignment failed:', err);
        toast.error('Failed to reassign content');
        setReassigning(false);
        return;
      }
      setReassigning(false);
    }

    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {totalContent > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {mode === 'delete' ? 'Delete' : 'Edit'} Section: {section?.name}
          </DialogTitle>
          <DialogDescription>
            {loading ? (
              'Checking for tagged content...'
            ) : totalContent === 0 ? (
              mode === 'delete'
                ? 'No content is tagged to this section. It can be safely deleted.'
                : 'No content is tagged to this section.'
            ) : (
              `This section has ${totalContent} tagged item(s). Choose what to do with them.`
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : totalContent > 0 ? (
          <div className="space-y-4">
            {/* Content breakdown */}
            <div className="rounded-md border p-3 bg-muted/30 space-y-1">
              {counts.map((c) => (
                <div key={c.table} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))}
            </div>

            {/* Reassignment target */}
            <div className="space-y-2">
              <Label>Reassign content to:</Label>
              <Select value={targetSectionId} onValueChange={setTargetSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">
                    Leave unassigned (no section)
                  </SelectItem>
                  {otherSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.section_number ? `${s.section_number}. ` : ''}
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reassigning}>
            Cancel
          </Button>
          <Button
            variant={mode === 'delete' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading || reassigning}
          >
            {reassigning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === 'delete'
              ? totalContent > 0
                ? targetSectionId === 'unassign'
                  ? 'Delete & Unassign'
                  : 'Reassign & Delete'
                : 'Delete'
              : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
