import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useCreateOsceQuestion, useUpdateOsceQuestion, uploadOsceImage, OsceQuestion } from '@/hooks/useOsceQuestions';
import { useAuthContext } from '@/contexts/AuthContext';

import { SectionSelector } from '@/components/sections';
import { ConceptSelect } from '@/components/content/ConceptSelect';

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
  const [showImageReplace, setShowImageReplace] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [conceptId, setConceptId] = useState<string | null>(null);

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
      setShowImageReplace(false);
      setSectionId((editingQuestion as any).section_id || null);
      setConceptId((editingQuestion as any).concept_id || null);
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
    setShowImageReplace(false);
    setSectionId(null);
    setConceptId(null);
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
      setShowImageReplace(false);
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
    // Validation - image is now optional
    if (!historyText.trim()) {
      return;
    }
    if (statements.some(s => !s.trim())) {
      return;
    }

    setUploading(true);
    try {
      let imageUrl: string | null = imagePreview || null;
      
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
        section_id: sectionId,
        concept_id: conceptId,
        concept_auto_assigned: false,
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

  // Image is now optional - only require history and statements
  const isValid = historyText.trim() && 
    statements.every(s => s.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} OSCE Question</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-6 pr-4 pb-4">
            {/* Image Upload */}
            <div>
              <Label>Clinical Image (optional)</Label>
              <div className="mt-2">
                {imagePreview && !showImageReplace ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="OSCE clinical image"
                      className="w-full max-h-48 object-contain rounded-lg border"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {isEditing && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowImageReplace(true)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Replace
                        </Button>
                      )}
                      {!isEditing && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                          }}
                        >
                          Change
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {showImageReplace && isEditing && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg mb-2">
                        <span className="text-sm text-muted-foreground">Select a new image to replace the current one</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowImageReplace(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {showImageReplace ? 'Click to upload new image' : 'Click to upload image'}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* History Text */}
            <div>
              <Label>Case History / Clinical Scenario *</Label>
              <Textarea
                value={historyText}
                onChange={(e) => setHistoryText(e.target.value)}
                placeholder="Enter the clinical history/scenario..."
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Section Selector */}
            <SectionSelector
              chapterId={chapterId}
              value={sectionId}
              onChange={setSectionId}
            />

            {/* Concept Selector */}
            <ConceptSelect
              moduleId={moduleId}
              chapterId={chapterId}
              sectionId={sectionId}
              value={conceptId}
              onChange={setConceptId}
            />

            {/* Statements */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Statements (5 required)</Label>
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm w-6 pt-2">{index + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={statements[index]}
                        onChange={(e) => updateStatement(index, e.target.value)}
                        placeholder={`Statement ${index + 1}`}
                      />
                      <Input
                        value={explanations[index]}
                        onChange={(e) => updateExplanation(index, e.target.value)}
                        placeholder="Explanation (optional)"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <span className={`text-sm font-medium ${answers[index] ? 'text-green-600' : 'text-red-600'}`}>
                        {answers[index] ? 'True' : 'False'}
                      </span>
                      <Switch
                        checked={answers[index]}
                        onCheckedChange={(checked) => updateAnswer(index, checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit - Fixed at bottom */}
        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || uploading}>
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Update' : 'Add'} Question
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
