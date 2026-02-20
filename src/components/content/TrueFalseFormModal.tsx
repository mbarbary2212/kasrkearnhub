import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  useCreateTrueFalseQuestion, 
  useUpdateTrueFalseQuestion, 
  type TrueFalseQuestion,
} from '@/hooks/useTrueFalseQuestions';
import { TrueFalseFormSchema } from '@/lib/validators';
import { SectionSelector } from '@/components/sections';
import { ConceptSelect } from '@/components/content/ConceptSelect';

interface TrueFalseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  question?: TrueFalseQuestion;
  isAdmin: boolean;
}

export function TrueFalseFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  topicId,
  question,
  isAdmin,
}: TrueFalseFormModalProps) {
  const isEditing = !!question;

  const [statement, setStatement] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(true);
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [conceptId, setConceptId] = useState<string | null>(null);
  const createMutation = useCreateTrueFalseQuestion();
  const updateMutation = useUpdateTrueFalseQuestion();

  // Initialize form when editing
  useEffect(() => {
    if (question) {
      setStatement(question.statement);
      setCorrectAnswer(question.correct_answer);
      setExplanation(question.explanation || '');
      setDifficulty(question.difficulty || 'medium');
      setSectionId(question.section_id || null);
      setConceptId((question as any).concept_id || null);
    } else {
      // Reset form for new question
      setStatement('');
      setCorrectAnswer(true);
      setExplanation('');
      setDifficulty('medium');
      setSectionId(null);
      setConceptId(null);
    }
  }, [question, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      statement,
      correct_answer: correctAnswer,
      explanation: explanation || null,
      difficulty: isAdmin ? difficulty : null,
      section_id: sectionId,
      concept_id: conceptId,
      concept_auto_assigned: false,
      concept_ai_confidence: null,
    };

    // Validate before submission
    const result = TrueFalseFormSchema.safeParse(formData);
    
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      toast.error(`Validation failed: ${messages.join(', ')}`);
      return;
    }

    if (isEditing && question) {
      updateMutation.mutate(
        { id: question.id, data: formData, moduleId, chapterId, topicId },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(
        { ...formData, module_id: moduleId, chapter_id: chapterId || null, topic_id: topicId || null },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[99999]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit True/False Question' : 'Add True/False Question'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Statement */}
          <div className="space-y-2">
            <Label htmlFor="statement">Statement *</Label>
            <Textarea
              id="statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Enter a statement that is either true or false..."
              required
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Write a clear statement that students will evaluate as True or False.
            </p>
          </div>

          {/* Correct Answer Toggle */}
          <div className="space-y-2">
            <Label>Correct Answer *</Label>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
              <span className={correctAnswer ? 'text-muted-foreground' : 'font-bold text-red-600'}>
                FALSE
              </span>
              <Switch
                checked={correctAnswer}
                onCheckedChange={setCorrectAnswer}
                className="data-[state=checked]:bg-green-600"
              />
              <span className={correctAnswer ? 'font-bold text-green-600' : 'text-muted-foreground'}>
                TRUE
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (optional)</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why this statement is true or false..."
              rows={3}
            />
          </div>

          {/* Difficulty - ONLY visible to admin */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="z-[99999]">
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Section Selector - Admin only */}
          {isAdmin && (
            <SectionSelector
              chapterId={chapterId || undefined}
              topicId={topicId || undefined}
              value={sectionId}
              onChange={setSectionId}
            />
          )}

          {/* Concept Selector - Admin only */}
          {isAdmin && moduleId && (
            <ConceptSelect
              moduleId={moduleId}
              chapterId={chapterId || undefined}
              value={conceptId}
              onChange={setConceptId}
            />
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Question'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
