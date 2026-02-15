import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ExamChapterSelector } from './ExamChapterSelector';
import { ModuleChapter } from '@/hooks/useChapters';

export interface PaperComponents {
  mcq_count: number;
  mcq_points: number;
  essay_count: number;
  essay_points: number;
  // practical
  osce_count?: number;
  osce_points?: number;
  osce_seconds_per_station?: number;
  clinical_case_count?: number;
  clinical_case_points?: number;
  poxa_count?: number;
  poxa_points?: number;
}

export type QuestionOrder = 'essays_first' | 'mcqs_first' | 'mixed';

export interface PaperConfig {
  name: string;
  category: 'written' | 'practical';
  order: number;
  duration_minutes: number;
  instructions: string;
  chapter_ids: string[];
  question_order: QuestionOrder;
  components: PaperComponents;
}

interface ExamPaperConfigProps {
  paper: PaperConfig;
  index: number;
  chapters: ModuleChapter[];
  onChange: (paper: PaperConfig) => void;
  onRemove: () => void;
}

export function ExamPaperConfig({ paper, index, chapters, onChange, onRemove }: ExamPaperConfigProps) {
  const [open, setOpen] = useState(true);
  const c = paper.components;
  const isWritten = paper.category === 'written';

  const update = (partial: Partial<PaperConfig>) => onChange({ ...paper, ...partial });
  const updateComp = (partial: Partial<PaperComponents>) =>
    onChange({ ...paper, components: { ...paper.components, ...partial } });

  const totalMarks = isWritten
    ? (c.mcq_count * c.mcq_points) + (c.essay_count * c.essay_points)
    : ((c.osce_count || 0) * (c.osce_points || 0)) +
      ((c.clinical_case_count || 0) * (c.clinical_case_points || 0)) +
      ((c.poxa_count || 0) * (c.poxa_points || 0));

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-medium text-sm">{paper.name || `Paper ${index + 1}`}</span>
            <span className="text-xs text-muted-foreground">
              ({totalMarks} marks · {paper.duration_minutes} min)
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <Label className="text-xs">Paper Name</Label>
          <Input value={paper.name} onChange={(e) => update({ name: e.target.value })} />
        </div>

        {/* Question Types and Counts */}
        {isWritten ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">MCQ Count</Label>
              <Input type="number" min={0} value={c.mcq_count} onChange={(e) => updateComp({ mcq_count: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points per MCQ</Label>
              <Input type="number" min={0} value={c.mcq_points} onChange={(e) => updateComp({ mcq_points: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Short Essay Count</Label>
              <Input type="number" min={0} value={c.essay_count} onChange={(e) => updateComp({ essay_count: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points per Essay</Label>
              <Input type="number" min={0} value={c.essay_points} onChange={(e) => updateComp({ essay_points: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">OSCE Stations</Label>
              <Input type="number" min={0} value={c.osce_count || 0} onChange={(e) => updateComp({ osce_count: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points per Station</Label>
              <Input type="number" min={0} value={c.osce_points || 0} onChange={(e) => updateComp({ osce_points: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Seconds per Station</Label>
              <Input type="number" min={10} value={c.osce_seconds_per_station || 150} onChange={(e) => updateComp({ osce_seconds_per_station: parseInt(e.target.value) || 150 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Clinical Cases</Label>
              <Input type="number" min={0} value={c.clinical_case_count || 0} onChange={(e) => updateComp({ clinical_case_count: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points per Case</Label>
              <Input type="number" min={0} value={c.clinical_case_points || 0} onChange={(e) => updateComp({ clinical_case_points: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">POXA Stations</Label>
              <Input type="number" min={0} value={c.poxa_count || 0} onChange={(e) => updateComp({ poxa_count: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points per POXA</Label>
              <Input type="number" min={0} value={c.poxa_points || 0} onChange={(e) => updateComp({ poxa_points: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        )}

        {/* Chapter/Book Scope */}
        {chapters.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Chapter Scope</Label>
            <ExamChapterSelector
              chapters={chapters}
              selectedIds={paper.chapter_ids}
              onChange={(ids) => update({ chapter_ids: ids })}
            />
          </div>
        )}

        {/* Question Order */}
        {isWritten && (
          <div className="space-y-1">
            <Label className="text-xs">Question Arrangement</Label>
            <Select value={paper.question_order || 'essays_first'} onValueChange={(v) => update({ question_order: v as PaperConfig['question_order'] })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essays_first">Essays First, then MCQs</SelectItem>
                <SelectItem value="mcqs_first">MCQs First, then Essays</SelectItem>
                <SelectItem value="mixed">Mixed / Interleaved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Duration */}
        <div className="space-y-1">
          <Label className="text-xs">Duration (minutes)</Label>
          <Input type="number" min={1} value={paper.duration_minutes} onChange={(e) => update({ duration_minutes: parseInt(e.target.value) || 60 })} />
        </div>

        {/* Special Instructions */}
        <div className="space-y-1">
          <Label className="text-xs">Special Instructions</Label>
          <Textarea
            value={paper.instructions}
            onChange={(e) => update({ instructions: e.target.value })}
            placeholder="Answer all questions..."
            rows={2}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
