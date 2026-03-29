import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAssessments,
  useAssessmentComponents,
  useModuleChapters,
  useChapterEligibility,
  useUpsertChapterEligibility,
  type ChapterEligibility,
} from '@/hooks/useAssessmentBlueprint';

const COMPONENT_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  short_answer_recall: 'Short Answer (Recall)',
  short_answer_case: 'Short Answer (Case)',
  osce: 'OSCE',
  long_case: 'Long Case',
  short_case: 'Short Case',
  paraclinical: 'Paraclinical',
};

const CROSS_MODULE_SOURCE = '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10';

type EligibilityField = 'allow_mcq' | 'allow_recall' | 'allow_case';

const ELIGIBILITY_COLUMNS: { key: EligibilityField; label: string }[] = [
  { key: 'allow_mcq', label: 'Allowed in MCQ' },
  { key: 'allow_recall', label: 'Allowed in Recall' },
  { key: 'allow_case', label: 'Allowed in Case' },
];

interface Props {
  moduleId: string;
  canManage: boolean;
}

export function ChapterWeightsTab({ moduleId, canManage }: Props) {
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(moduleId);
  const { data: allAssessments, isLoading: assessmentsLoading } = useAssessments(moduleId, '');

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const { data: components } = useAssessmentComponents(selectedAssessmentId || undefined);
  const { data: eligibility } = useChapterEligibility(selectedAssessmentId || undefined);
  const upsertEligibility = useUpsertChapterEligibility();

  const ownChapters = chapters?.filter(c => c.module_id === moduleId) ?? [];
  const crossChapters = chapters?.filter(c => c.module_id === CROSS_MODULE_SOURCE) ?? [];
  const allChapters = [...crossChapters, ...ownChapters];

  const getRow = useCallback((chapterId: string): ChapterEligibility | undefined => {
    return eligibility?.find(e => e.chapter_id === chapterId);
  }, [eligibility]);

  const handleToggle = (chapterId: string, field: 'included_in_exam' | EligibilityField, checked: boolean) => {
    const existing = getRow(chapterId);
    const base = {
      assessment_id: selectedAssessmentId,
      chapter_id: chapterId,
      included_in_exam: existing?.included_in_exam ?? false,
      allow_mcq: existing?.allow_mcq ?? false,
      allow_recall: existing?.allow_recall ?? false,
      allow_case: existing?.allow_case ?? false,
    };
    base[field] = checked;

    // If turning off included_in_exam, clear all component flags
    if (field === 'included_in_exam' && !checked) {
      base.allow_mcq = false;
      base.allow_recall = false;
      base.allow_case = false;
    }
    // If turning on any component flag, auto-include
    if (field !== 'included_in_exam' && checked) {
      base.included_in_exam = true;
    }

    upsertEligibility.mutate(base);
  };

  if (chaptersLoading || assessmentsLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium block mb-1">Assessment</label>
          <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select an assessment" /></SelectTrigger>
            <SelectContent>
              {allAssessments?.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name} ({COMPONENT_LABELS[a.assessment_type] || a.assessment_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p>Chapters marked here are possible sources for questions — the exam will select from these chapters, not necessarily include all.</p>
          <p className="text-xs italic">Eligibility ≠ guaranteed appearance. Use <strong>Included</strong> to add a chapter to the pool, then toggle <strong>MCQ</strong>, <strong>Recall</strong>, or <strong>Case</strong> to define allowed question types.</p>
        </div>
      </div>

      {selectedAssessmentId && (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Chapter (Question Pool)</TableHead>
                <TableHead className="text-center min-w-[100px]">In Pool</TableHead>
                {ELIGIBILITY_COLUMNS.map(col => (
                  <TableHead key={col.key} className="text-center min-w-[90px]">{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossChapters.length > 0 && (
                <TableRow>
                  <TableCell colSpan={2 + ELIGIBILITY_COLUMNS.length} className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">
                    From SUR-423 (General Surgery Book)
                  </TableCell>
                </TableRow>
              )}
              {crossChapters.map(ch => (
                <ChapterEligibilityRow
                  key={ch.id}
                  chapter={ch}
                  row={getRow(ch.id)}
                  onToggle={handleToggle}
                  canManage={canManage}
                />
              ))}
              {crossChapters.length > 0 && ownChapters.length > 0 && (
                <TableRow>
                  <TableCell colSpan={2 + ELIGIBILITY_COLUMNS.length} className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2">
                    SUR-523 Chapters
                  </TableCell>
                </TableRow>
              )}
              {ownChapters.map(ch => (
                <ChapterEligibilityRow
                  key={ch.id}
                  chapter={ch}
                  row={getRow(ch.id)}
                  onToggle={handleToggle}
                  canManage={canManage}
                />
              ))}
              {/* Summary row */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Eligible</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{allChapters.filter(ch => getRow(ch.id)?.included_in_exam).length} / {allChapters.length}</Badge>
                </TableCell>
                {ELIGIBILITY_COLUMNS.map(col => {
                  const count = allChapters.filter(ch => getRow(ch.id)?.[col.key]).length;
                  return (
                    <TableCell key={col.key} className="text-center">
                      <Badge variant={count > 0 ? 'default' : 'secondary'}>{count}</Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {!selectedAssessmentId && (
        <p className="text-muted-foreground text-sm py-4">Select an assessment above to manage chapter eligibility.</p>
      )}
    </div>
  );
}

function ChapterEligibilityRow({ chapter, row, onToggle, canManage }: {
  chapter: { id: string; title: string };
  row: ChapterEligibility | undefined;
  onToggle: (chapterId: string, field: 'included_in_exam' | EligibilityField, checked: boolean) => void;
  canManage: boolean;
}) {
  const included = row?.included_in_exam ?? false;

  return (
    <TableRow className={!included ? 'opacity-60' : ''}>
      <TableCell className="font-medium">{chapter.title}</TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={included}
          onCheckedChange={(v) => onToggle(chapter.id, 'included_in_exam', !!v)}
          disabled={!canManage}
        />
      </TableCell>
      {ELIGIBILITY_COLUMNS.map(col => (
        <TableCell key={col.key} className="text-center">
          <Checkbox
            checked={row?.[col.key] ?? false}
            onCheckedChange={(v) => onToggle(chapter.id, col.key, !!v)}
            disabled={!canManage || !included}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}
