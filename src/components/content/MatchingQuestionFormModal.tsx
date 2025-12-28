import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  useCreateMatchingQuestion,
  useUpdateMatchingQuestion,
  type MatchingQuestion,
  type MatchItem,
} from '@/hooks/useMatchingQuestions';

interface MatchingQuestionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string | null;
  topicId?: string | null;
  question?: MatchingQuestion | null;
}

export function MatchingQuestionFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  topicId,
  question,
}: MatchingQuestionFormModalProps) {
  const { isAdmin, isSuperAdmin } = useAuthContext();
  const createMutation = useCreateMatchingQuestion();
  const updateMutation = useUpdateMatchingQuestion();

  const [instruction, setInstruction] = useState('Match the items in Column A with the correct items in Column B');
  const [columnAItems, setColumnAItems] = useState<MatchItem[]>([
    { id: 'a1', text: '' },
    { id: 'a2', text: '' },
  ]);
  const [columnBItems, setColumnBItems] = useState<MatchItem[]>([
    { id: 'b1', text: '' },
    { id: 'b2', text: '' },
  ]);
  const [correctMatches, setCorrectMatches] = useState<Record<string, string>>({});
  const [explanation, setExplanation] = useState('');
  const [showExplanation, setShowExplanation] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

  useEffect(() => {
    if (question) {
      setInstruction(question.instruction);
      setColumnAItems(question.column_a_items);
      setColumnBItems(question.column_b_items);
      setCorrectMatches(question.correct_matches);
      setExplanation(question.explanation || '');
      setShowExplanation(question.show_explanation);
      setDifficulty(question.difficulty);
    } else {
      // Reset form
      setInstruction('Match the items in Column A with the correct items in Column B');
      setColumnAItems([
        { id: 'a1', text: '' },
        { id: 'a2', text: '' },
      ]);
      setColumnBItems([
        { id: 'b1', text: '' },
        { id: 'b2', text: '' },
      ]);
      setCorrectMatches({});
      setExplanation('');
      setShowExplanation(true);
      setDifficulty(null);
    }
  }, [question, open]);

  const addItemA = () => {
    const newId = `a${Date.now()}`;
    setColumnAItems([...columnAItems, { id: newId, text: '' }]);
  };

  const addItemB = () => {
    const newId = `b${Date.now()}`;
    setColumnBItems([...columnBItems, { id: newId, text: '' }]);
  };

  const removeItemA = (id: string) => {
    setColumnAItems(columnAItems.filter(item => item.id !== id));
    const newMatches = { ...correctMatches };
    delete newMatches[id];
    setCorrectMatches(newMatches);
  };

  const removeItemB = (id: string) => {
    setColumnBItems(columnBItems.filter(item => item.id !== id));
    // Remove any matches pointing to this B item
    const newMatches: Record<string, string> = {};
    Object.entries(correctMatches).forEach(([aId, bId]) => {
      if (bId !== id) newMatches[aId] = bId;
    });
    setCorrectMatches(newMatches);
  };

  const updateItemA = (id: string, text: string) => {
    setColumnAItems(columnAItems.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  const updateItemB = (id: string, text: string) => {
    setColumnBItems(columnBItems.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  const updateMatch = (aId: string, bId: string) => {
    setCorrectMatches({ ...correctMatches, [aId]: bId });
  };

  const handleSubmit = async () => {
    const data = {
      instruction,
      column_a_items: columnAItems.filter(item => item.text.trim()),
      column_b_items: columnBItems.filter(item => item.text.trim()),
      correct_matches: correctMatches,
      explanation: explanation || null,
      show_explanation: showExplanation,
      difficulty,
      topic_id: topicId,
    };

    if (question) {
      await updateMutation.mutateAsync({
        id: question.id,
        data,
        moduleId,
        chapterId,
        topicId,
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        module_id: moduleId,
        chapter_id: chapterId,
      });
    }

    onOpenChange(false);
  };

  const isValid = 
    instruction.trim() &&
    columnAItems.filter(i => i.text.trim()).length >= 2 &&
    columnBItems.filter(i => i.text.trim()).length >= 2 &&
    Object.keys(correctMatches).length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit Matching Question' : 'Add Matching Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Instruction */}
          <div className="space-y-2">
            <Label>Instruction / Question</Label>
            <Textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="Match the items in Column A with the correct items in Column B"
              rows={2}
            />
          </div>

          {/* Columns */}
          <div className="grid grid-cols-2 gap-6">
            {/* Column A */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Column A Items</Label>
                <Button variant="ghost" size="sm" onClick={addItemA}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {columnAItems.map((item, index) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-sm text-muted-foreground pt-2 w-6">{index + 1}.</span>
                  <Input
                    value={item.text}
                    onChange={e => updateItemA(item.id, e.target.value)}
                    placeholder={`Item ${index + 1}`}
                    className="flex-1"
                  />
                  {columnAItems.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemA(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Column B */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Column B Items</Label>
                <Button variant="ghost" size="sm" onClick={addItemB}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {columnBItems.map((item, index) => (
                <div key={item.id} className="flex gap-2">
                  <span className="text-sm text-muted-foreground pt-2 w-6">{String.fromCharCode(65 + index)}.</span>
                  <Input
                    value={item.text}
                    onChange={e => updateItemB(item.id, e.target.value)}
                    placeholder={`Item ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  {columnBItems.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemB(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Correct Matches */}
          <div className="space-y-3">
            <Label>Correct Matches</Label>
            <p className="text-sm text-muted-foreground">
              Select which Column B item matches each Column A item
            </p>
            <div className="grid gap-2">
              {columnAItems.filter(i => i.text.trim()).map(aItem => (
                <div key={aItem.id} className="flex items-center gap-3">
                  <span className="text-sm min-w-[120px] truncate">{aItem.text}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={correctMatches[aItem.id] || ''}
                    onValueChange={value => updateMatch(aItem.id, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select match" />
                    </SelectTrigger>
                    <SelectContent>
                      {columnBItems.filter(i => i.text.trim()).map(bItem => (
                        <SelectItem key={bItem.id} value={bItem.id}>
                          {bItem.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Explanation (optional)</Label>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-normal text-muted-foreground">Show to students</Label>
                <Switch
                  checked={showExplanation}
                  onCheckedChange={setShowExplanation}
                />
              </div>
            </div>
            <Textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Optional explanation shown after submission"
              rows={2}
            />
          </div>

          {/* Difficulty (admin only) */}
          {(isAdmin || isSuperAdmin) && (
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty || 'none'}
                onValueChange={v => setDifficulty(v === 'none' ? null : v as 'easy' | 'medium' | 'hard')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending || updateMutation.isPending}
          >
            {question ? 'Update' : 'Add'} Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
