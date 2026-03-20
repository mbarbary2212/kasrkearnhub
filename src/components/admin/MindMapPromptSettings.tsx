import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Network,
  Plus,
  Pencil,
  Trash2,
  Star,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  useMindMapPrompts,
  useUpsertMindMapPrompt,
  useDeleteMindMapPrompt,
  useSetDefaultPrompt,
  MindMapPrompt,
} from '@/hooks/useMindMapPrompts';

const TYPE_LABELS: Record<string, string> = {
  full: 'Full Chapter/Topic',
  section: 'Section',
  ultra: 'Ultra High-Yield',
};

const TYPE_COLORS: Record<string, string> = {
  full: 'bg-primary/10 text-primary',
  section: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ultra: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

interface PromptFormState {
  id?: string;
  name: string;
  prompt_type: 'full' | 'section' | 'ultra';
  system_prompt: string;
  is_default: boolean;
}

const emptyForm: PromptFormState = {
  name: '',
  prompt_type: 'full',
  system_prompt: '',
  is_default: false,
};

export function MindMapPromptSettings() {
  const { data: prompts, isLoading } = useMindMapPrompts();
  const upsert = useUpsertMindMapPrompt();
  const remove = useDeleteMindMapPrompt();
  const setDefault = useSetDefaultPrompt();

  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MindMapPrompt | null>(null);
  const [form, setForm] = useState<PromptFormState>(emptyForm);

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: MindMapPrompt) => {
    setForm({
      id: p.id,
      name: p.name,
      prompt_type: p.prompt_type,
      system_prompt: p.system_prompt,
      is_default: p.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.system_prompt.trim()) return;
    upsert.mutate(form, { onSuccess: () => setDialogOpen(false) });
  };

  const grouped = prompts?.reduce<Record<string, MindMapPrompt[]>>((acc, p) => {
    (acc[p.prompt_type] = acc[p.prompt_type] || []).push(p);
    return acc;
  }, {}) || {};

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Network className="w-5 h-5" />
              Mind Map Prompt Presets
            </CardTitle>
            <CardDescription>
              Configure AI prompts used for generating Markmap mind maps from chapter/topic PDFs
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                New Prompt
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !prompts?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No prompts configured. Create one to start generating mind maps.
              </p>
            ) : (
              <div className="space-y-6">
                {(['full', 'section', 'ultra'] as const).map((type) => {
                  const items = grouped[type];
                  if (!items?.length) return null;
                  return (
                    <div key={type} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {TYPE_LABELS[type]}
                      </h4>
                      <div className="space-y-2">
                        {items.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{p.name}</span>
                                <Badge variant="outline" className={TYPE_COLORS[p.prompt_type]}>
                                  {TYPE_LABELS[p.prompt_type]}
                                </Badge>
                                {p.is_default && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Star className="w-3 h-3" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {p.system_prompt.slice(0, 150)}…
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!p.is_default && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Set as default"
                                  onClick={() =>
                                    setDefault.mutate({ id: p.id, prompt_type: p.prompt_type })
                                  }
                                >
                                  <Star className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => openEdit(p)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(p)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Prompt' : 'New Prompt Preset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Surgery Full Map"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.prompt_type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, prompt_type: v as PromptFormState['prompt_type'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Chapter/Topic</SelectItem>
                    <SelectItem value="section">Section</SelectItem>
                    <SelectItem value="ultra">Ultra High-Yield</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                rows={14}
                className="font-mono text-xs"
                placeholder="Enter the system prompt for Gemini…"
              />
              <p className="text-xs text-muted-foreground">
                This prompt is sent to the AI model when generating mind maps. Include instructions
                about format, style, and Markmap frontmatter requirements.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={upsert.isPending || !form.name.trim() || !form.system_prompt.trim()}
            >
              {upsert.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {form.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete prompt preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) remove.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
