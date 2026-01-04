import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { useCreateOsceQuestion, useUpdateOsceQuestion, uploadOsceImage, OsceQuestion } from '@/hooks/useOsceQuestions';
import { useAuthContext } from '@/contexts/AuthContext';

interface OsceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  chapterId?: string;
  editingQuestion?: OsceQuestion | null;
}

export function OsceFormModal({
  open,
  onOpenChange,
  moduleId,
  chapterId,
  editingQuestion,
}: OsceFormModalProps) {
  const auth = useAuthContext();
  const createQuestion = useCreateOsceQuestion();
  const updateQuestion = useUpdateOsceQuestion();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [historyText, setHistoryText] = useState('');
  const [statements, setStatements] = useState<string[]>(['', '', '', '', '']);
  const [answers, setAnswers] = useState<boolean[]>([true, true, true, true, true]);
  const [explanations, setExplanations] = useState<string[]>(['', '', '', '', '']);
  const [uploading, setUploading] = useState(false);

  const isEditing = !!editingQuestion;

  useEffect(() => {
    if (editingQuestion) {
      setImagePreview(editingQuestion.image_url);
      setHistoryText(editingQuestion.history_text);
      setStatements([
        editingQuestion.statement_1,
        editingQuestion.statement_2,
        editingQuestion.statement_3,
        editingQuestion.statement_4,
        editingQuestion.statement_5,
      ]);
      setAnswers([
        editingQuestion.answer_1,
        editingQuestion.answer_2,
        editingQuestion.answer_3,
        editingQuestion.answer_4,
        editingQuestion.answer_5,
      ]);
      setExplanations([
        editingQuestion.explanation_1 || '',
        editingQuestion.explanation_2 || '',
        editingQuestion.explanation_3 || '',
        editingQuestion.explanation_4 || '',
        editingQuestion.explanation_5 || '',
      ]);
    } else {
      resetForm();
    }
  }, [editingQuestion, open]);

  const resetForm = () => {
    setImageFile(null);
    setImagePreview('');
    setHistoryText('');
    setStatements(['', '', '', '', '']);
    setAnswers([true, true, true, true, true]);
    setExplanations(['', '', '', '', '']);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateStatement = (index: number, value: string) => {
    const newStatements = [...statements];
    newStatements[index] = value;
    setStatements(newStatements);
  };

  const updateAnswer = (index: number, value: boolean) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const updateExplanation = (index: number, value: string) => {
    const newExplanations = [...explanations];
    newExplanations[index] = value;
    setExplanations(newExplanations);
  };

  const handleSubmit = async () => {
    // Validation
    if (!imagePreview && !imageFile) {
      return;
    }
    if (!historyText.trim()) {
      return;
    }
    if (statements.some(s => !s.trim())) {
      return;
    }

    setUploading(true);
    try {
      let imageUrl = imagePreview;
      
      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadOsceImage(imageFile, moduleId, chapterId);
      }

      const questionData = {
        module_id: moduleId,
        chapter_id: chapterId || null,
        image_url: imageUrl,
        history_text: historyText.trim(),
        statement_1: statements[0].trim(),
        statement_2: statements[1].trim(),
        statement_3: statements[2].trim(),
        statement_4: statements[3].trim(),
        statement_5: statements[4].trim(),
        answer_1: answers[0],
        answer_2: answers[1],
        answer_3: answers[2],
        answer_4: answers[3],
        answer_5: answers[4],
        explanation_1: explanations[0].trim() || null,
        explanation_2: explanations[1].trim() || null,
        explanation_3: explanations[2].trim() || null,
        explanation_4: explanations[3].trim() || null,
        explanation_5: explanations[4].trim() || null,
        updated_by: auth.user?.id || null,
      };

      if (isEditing && editingQuestion) {
        await updateQuestion.mutateAsync({ id: editingQuestion.id, ...questionData });
      } else {
        await createQuestion.mutateAsync({
          ...questionData,
          created_by: auth.user?.id || null,
        });
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save OSCE question:', error);
    } finally {
      setUploading(false);
    }
  };

  const isValid = (imagePreview || imageFile) && 
    historyText.trim() && 
    statements.every(s => s.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} OSCE Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Image Upload */}
          <div>
            <Label>Clinical Image *</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="OSCE clinical image"
                    className="w-full max-h-48 object-contain rounded-lg border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* History Text */}
          <div>
            <Label>Clinical History *</Label>
            <Textarea
              value={historyText}
              onChange={(e) => setHistoryText(e.target.value)}
              placeholder="Enter the clinical history/scenario..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Statements */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Statements (5 required)</Label>
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm w-6">{index + 1}.</span>
                  <Input
                    value={statements[index]}
                    onChange={(e) => updateStatement(index, e.target.value)}
                    placeholder={`Statement ${index + 1}`}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {answers[index] ? 'True' : 'False'}
                    </span>
                    <Switch
                      checked={answers[index]}
                      onCheckedChange={(checked) => updateAnswer(index, checked)}
                    />
                  </div>
                </div>
                <Input
                  value={explanations[index]}
                  onChange={(e) => updateExplanation(index, e.target.value)}
                  placeholder="Explanation (optional)"
                  className="ml-6 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
