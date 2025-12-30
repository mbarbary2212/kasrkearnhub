import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CaseScenario, useCreateCaseScenario, useUpdateCaseScenario } from '@/hooks/useCaseScenarios';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { getPermissionErrorMessage } from '@/lib/permissionErrors';

interface CaseScenarioFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId: string;
  existingCase?: CaseScenario;
}

export function CaseScenarioFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  existingCase,
}: CaseScenarioFormModalProps) {
  const { isModuleAdmin, isTopicAdmin } = useAuthContext();
  const [title, setTitle] = useState('');
  const [caseHistory, setCaseHistory] = useState('');
  const [caseQuestions, setCaseQuestions] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [rating, setRating] = useState<number>(0);

  const createCase = useCreateCaseScenario();
  const updateCase = useUpdateCaseScenario();

  const isEditing = !!existingCase;

  useEffect(() => {
    if (existingCase) {
      setTitle(existingCase.title);
      setCaseHistory(existingCase.case_history);
      setCaseQuestions(existingCase.case_questions);
      setModelAnswer(existingCase.model_answer);
      setRating(existingCase.rating || 0);
    } else {
      setTitle('');
      setCaseHistory('');
      setCaseQuestions('');
      setModelAnswer('');
      setRating(0);
    }
  }, [existingCase, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !caseHistory.trim() || !caseQuestions.trim() || !modelAnswer.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        title: title.trim(),
        case_history: caseHistory.trim(),
        case_questions: caseQuestions.trim(),
        model_answer: modelAnswer.trim(),
        rating: rating > 0 ? rating : null,
        chapter_id: chapterId,
        module_id: moduleId,
      };

      if (isEditing) {
        await updateCase.mutateAsync({ id: existingCase.id, data });
        toast.success('Case scenario updated');
      } else {
        await createCase.mutateAsync(data);
        toast.success('Case scenario created');
      }

      onOpenChange(false);
    } catch (error) {
      const message = getPermissionErrorMessage(error, {
        action: isEditing ? 'edit' : 'add',
        contentType: 'case_scenario',
        isModuleAdmin,
        isTopicAdmin,
      });
      toast.error(message);
    }
  };

  const isPending = createCase.isPending || updateCase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Case Scenario' : 'Add Case Scenario'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Diabetic Ketoacidosis Case"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="case-history">Case History *</Label>
            <Textarea
              id="case-history"
              value={caseHistory}
              onChange={(e) => setCaseHistory(e.target.value)}
              placeholder="Describe the patient presentation, history, symptoms..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="case-questions">
              Questions * <span className="text-muted-foreground text-xs">(separate multiple questions with |)</span>
            </Label>
            <Textarea
              id="case-questions"
              value={caseQuestions}
              onChange={(e) => setCaseQuestions(e.target.value)}
              placeholder="What is the diagnosis? | What investigations would you order? | Outline the management plan."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-answer">Model Answer *</Label>
            <Textarea
              id="model-answer"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              placeholder="Provide the complete model answer..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(rating === value ? 0 : value)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      value <= rating
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
