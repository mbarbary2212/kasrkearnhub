import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { CheckCircle2, ChevronDown, ChevronUp, Pencil, Eye, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function normalizeChoices(choices: any): Record<string, string> {
  if (!choices) return {};
  if (Array.isArray(choices)) {
    const result: Record<string, string> = {};
    choices.forEach((c: any) => {
      if (c && typeof c === 'object' && c.key) {
        result[c.key] = c.text || '';
      }
    });
    return result;
  }
  if (typeof choices === 'object') {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(choices)) {
      result[k] = typeof v === 'object' && v !== null
        ? (v as any).text || String(v)
        : String(v);
    }
    return result;
  }
  return {};
}

interface AIContentPreviewCardProps {
  item: any;
  index: number;
  contentType: string;
  onUpdate: (index: number, updatedItem: any) => void;
  onDelete: (index: number) => void;
}

export function AIContentPreviewCard({ 
  item, 
  index, 
  contentType, 
  onUpdate,
  onDelete 
}: AIContentPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<any>(item);

  const typeLabel = contentType.toUpperCase().replace('_', ' ');

  const handleSaveEdit = () => {
    onUpdate(index, editedItem);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedItem(item);
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    setEditedItem((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parentField: string, index: number, field: string, value: any) => {
    setEditedItem((prev: any) => {
      const updated = [...(prev[parentField] || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [parentField]: updated };
    });
  };

  const addNestedItem = (parentField: string, template: any) => {
    setEditedItem((prev: any) => ({
      ...prev,
      [parentField]: [...(prev[parentField] || []), template],
    }));
  };

  const removeNestedItem = (parentField: string, idx: number) => {
    setEditedItem((prev: any) => ({
      ...prev,
      [parentField]: (prev[parentField] || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  // Render collapsed preview based on content type
  const renderCollapsedPreview = () => {
    switch (contentType) {
      case 'mcq':
      case 'sba':
        return (
          <>
            <p className="font-medium text-sm line-clamp-2">{item.stem}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{Object.keys(normalizeChoices(item.choices)).length} choices</Badge>
              <Badge variant="secondary">Answer: {item.correct_key}</Badge>
            </div>
          </>
        );
      case 'virtual_patient':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.intro_text}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{item.level}</Badge>
              <Badge variant="outline">{item.estimated_minutes} min</Badge>
              <Badge variant="secondary">{item.stages?.length || 0} stages</Badge>
            </div>
          </>
        );
      case 'osce':
        return (
          <>
            <p className="text-sm line-clamp-2">{item.history_text}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">5 statements</Badge>
            </div>
          </>
        );
      case 'guided_explanation':
        return (
          <>
            <p className="font-medium text-sm">{item.topic}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.introduction}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{item.guided_questions?.length || 0} questions</Badge>
              <Badge variant="outline">{item.key_takeaways?.length || 0} takeaways</Badge>
            </div>
          </>
        );
      case 'flashcard':
        return (
          <>
            <p className="font-medium text-sm line-clamp-1">{item.front}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.back}</p>
          </>
        );
      case 'case_scenario':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.case_history}</p>
          </>
        );
      case 'matching':
        return (
          <>
            <p className="font-medium text-sm line-clamp-2">{item.instruction}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{item.column_a_items?.length || 0} items</Badge>
            </div>
          </>
        );
      case 'essay':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.question}</p>
          </>
        );
      case 'mind_map':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground">Root: {item.root_node?.label}</p>
          </>
        );
      case 'worked_case':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.presentation}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{item.steps?.length || 0} steps</Badge>
            </div>
          </>
        );
      case 'socratic_tutorial':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-3">{item.content?.substring(0, 200)}...</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Socratic Tutorial</Badge>
              <Badge variant="secondary">{item.content ? `${Math.round(item.content.split(/\s+/).length)} words` : ''}</Badge>
            </div>
          </>
        );
      case 'topic_summary':
        return (
          <>
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-3">{item.content?.substring(0, 200)}...</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Topic Summary</Badge>
              <Badge variant="secondary">{item.content ? `${Math.round(item.content.split(/\s+/).length)} words` : ''}</Badge>
            </div>
          </>
        );
      default:
        return (
          <pre className="text-xs overflow-hidden max-h-20">
            {JSON.stringify(item, null, 2).substring(0, 200)}...
          </pre>
        );
    }
  };

  // Render edit form based on content type
  const renderEditForm = () => {
    switch (contentType) {
      case 'mcq':
      case 'sba':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question Stem</Label>
              <Textarea
                value={editedItem.stem || ''}
                onChange={(e) => updateField('stem', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Choices</Label>
              {Object.entries(normalizeChoices(editedItem.choices)).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <Badge variant={key === editedItem.correct_key ? 'default' : 'outline'}>{key}</Badge>
                  <Input
                    value={String(val)}
                    onChange={(e) => updateField('choices', { ...normalizeChoices(editedItem.choices), [key]: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant={key === editedItem.correct_key ? 'default' : 'outline'}
                    onClick={() => updateField('correct_key', key)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Explanation</Label>
              <Textarea
                value={editedItem.explanation || ''}
                onChange={(e) => updateField('explanation', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 'guided_explanation':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                value={editedItem.topic || ''}
                onChange={(e) => updateField('topic', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Introduction</Label>
              <Textarea
                value={editedItem.introduction || ''}
                onChange={(e) => updateField('introduction', e.target.value)}
                rows={4}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Guided Questions</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addNestedItem('guided_questions', { question: '', hint: '', reveal_answer: '' })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>
              {(editedItem.guided_questions || []).map((q: any, idx: number) => (
                <Card key={idx} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Q{idx + 1}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => removeNestedItem('guided_questions', idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Question</Label>
                    <Textarea
                      value={q.question || ''}
                      onChange={(e) => updateNestedField('guided_questions', idx, 'question', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Hint (optional)</Label>
                    <Input
                      value={q.hint || ''}
                      onChange={(e) => updateNestedField('guided_questions', idx, 'hint', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Reveal Answer</Label>
                    <Textarea
                      value={q.reveal_answer || ''}
                      onChange={(e) => updateNestedField('guided_questions', idx, 'reveal_answer', e.target.value)}
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={editedItem.summary || ''}
                onChange={(e) => updateField('summary', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Key Takeaways</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateField('key_takeaways', [...(editedItem.key_takeaways || []), ''])}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {(editedItem.key_takeaways || []).map((takeaway: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={takeaway}
                    onChange={(e) => {
                      const updated = [...(editedItem.key_takeaways || [])];
                      updated[idx] = e.target.value;
                      updateField('key_takeaways', updated);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const updated = (editedItem.key_takeaways || []).filter((_: any, i: number) => i !== idx);
                      updateField('key_takeaways', updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'osce':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>History/Scenario</Label>
              <Textarea
                value={editedItem.history_text || ''}
                onChange={(e) => updateField('history_text', e.target.value)}
                rows={4}
              />
            </div>
            <Separator />
            <Label>Statements</Label>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Statement {n}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">True</span>
                    <Switch
                      checked={editedItem[`answer_${n}`] === true}
                      onCheckedChange={(checked) => updateField(`answer_${n}`, checked)}
                    />
                  </div>
                </div>
                <Textarea
                  value={editedItem[`statement_${n}`] || ''}
                  onChange={(e) => updateField(`statement_${n}`, e.target.value)}
                  rows={2}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Explanation</Label>
                  <Textarea
                    value={editedItem[`explanation_${n}`] || ''}
                    onChange={(e) => updateField(`explanation_${n}`, e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 'flashcard':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Front</Label>
              <Textarea
                value={editedItem.front || ''}
                onChange={(e) => updateField('front', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Back</Label>
              <Textarea
                value={editedItem.back || ''}
                onChange={(e) => updateField('back', e.target.value)}
                rows={5}
              />
            </div>
          </div>
        );

      case 'case_scenario':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Case History</Label>
              <Textarea
                value={editedItem.case_history || ''}
                onChange={(e) => updateField('case_history', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Questions</Label>
              <Textarea
                value={editedItem.case_questions || ''}
                onChange={(e) => updateField('case_questions', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Model Answer</Label>
              <Textarea
                value={editedItem.model_answer || ''}
                onChange={(e) => updateField('model_answer', e.target.value)}
                rows={4}
              />
            </div>
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={editedItem.question || ''}
                onChange={(e) => updateField('question', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Model Answer</Label>
              <Textarea
                value={editedItem.model_answer || ''}
                onChange={(e) => updateField('model_answer', e.target.value)}
                rows={6}
              />
            </div>
          </div>
        );

      case 'socratic_tutorial':
      case 'topic_summary':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={editedItem.content || ''}
                onChange={(e) => updateField('content', e.target.value)}
                rows={20}
                className="font-mono text-xs"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Raw JSON</Label>
            <Textarea
              value={JSON.stringify(editedItem, null, 2)}
              onChange={(e) => {
                try {
                  setEditedItem(JSON.parse(e.target.value));
                } catch {}
              }}
              rows={15}
              className="font-mono text-xs"
            />
          </div>
        );
    }
  };

  // Render full view based on content type
  const renderFullView = () => {
    switch (contentType) {
      case 'mcq':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Question</Label>
              <p className="font-medium">{item.stem}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Choices</Label>
              {Object.entries(normalizeChoices(item.choices)).map(([key, val]) => (
                <div key={key} className={cn(
                  "flex items-center gap-2 p-2 rounded",
                  key === item.correct_key && "bg-green-50 dark:bg-green-950"
                )}>
                  <Badge variant={key === item.correct_key ? 'default' : 'outline'}>{key}</Badge>
                  <span>{String(val)}</span>
                  {key === item.correct_key && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                </div>
              ))}
            </div>
            {item.explanation && (
              <div>
                <Label className="text-muted-foreground text-xs">Explanation</Label>
                <p className="text-sm">{item.explanation}</p>
              </div>
            )}
          </div>
        );

      case 'guided_explanation':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Topic</Label>
              <p className="font-medium text-lg">{item.topic}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Introduction</Label>
              <p className="text-sm whitespace-pre-wrap">{item.introduction}</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs">Guided Questions</Label>
              {(item.guided_questions || []).map((q: any, idx: number) => (
                <Card key={idx} className="p-3">
                  <p className="font-medium text-sm">Q{idx + 1}: {q.question}</p>
                  {q.hint && <p className="text-xs text-muted-foreground mt-1">💡 Hint: {q.hint}</p>}
                  <p className="text-sm mt-2 text-green-700 dark:text-green-400">→ {q.reveal_answer}</p>
                </Card>
              ))}
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground text-xs">Summary</Label>
              <p className="text-sm whitespace-pre-wrap">{item.summary}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Key Takeaways</Label>
              <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                {(item.key_takeaways || []).map((t: string, idx: number) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'osce':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">History/Scenario</Label>
              <p className="text-sm whitespace-pre-wrap">{item.history_text}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Statements</Label>
              {[1, 2, 3, 4, 5].map((n) => item[`statement_${n}`] && (
                <div key={n} className="p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={item[`answer_${n}`] ? 'default' : 'destructive'}>
                      {item[`answer_${n}`] ? 'T' : 'F'}
                    </Badge>
                    <span className="text-sm">{item[`statement_${n}`]}</span>
                  </div>
                  {item[`explanation_${n}`] && (
                    <p className="text-xs text-muted-foreground mt-1 ml-8">{item[`explanation_${n}`]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <pre className="text-xs whitespace-pre-wrap overflow-auto">
            {JSON.stringify(item, null, 2)}
          </pre>
        );
    }
  };

  return (
    <>
      <Card className="relative">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="shrink-0">{typeLabel} #{index + 1}</Badge>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setIsExpanded(true)}
                title="View full content"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  setEditedItem(item);
                  setIsEditing(true);
                }}
                title="Edit before approve"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(index)}
                title="Remove item"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2">
            {renderCollapsedPreview()}
          </div>
        </CardContent>
      </Card>

      {/* View Full Content Sheet */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Badge variant="secondary">{typeLabel} #{index + 1}</Badge>
              Full Preview
            </SheetTitle>
            <SheetDescription>
              Review the complete generated content
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
            {renderFullView()}
          </ScrollArea>
          <SheetFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsExpanded(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsExpanded(false);
              setEditedItem(item);
              setIsEditing(true);
            }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={isEditing} onOpenChange={setIsEditing}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit {typeLabel} #{index + 1}
            </SheetTitle>
            <SheetDescription>
              Make changes before approving. Click save when done.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
            {renderEditForm()}
          </ScrollArea>
          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
