import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, BookMarked, Pencil, Replace as ReplaceIcon, ChevronRight, Info } from 'lucide-react';
import {
  useAIModelCatalog,
  useUpsertAIModel,
  useUpdateAIModel,
  useDeleteAIModel,
  useReplaceAIModel,
  type AIModelCatalogEntry,
  type AIProvider,
} from '@/hooks/useAIModelCatalog';

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'lovable', label: 'Lovable AI Gateway' },
  { value: 'gemini', label: 'Google Gemini (Direct)' },
  { value: 'anthropic', label: 'Anthropic Claude (Direct)' },
  { value: 'groq', label: 'Groq (Llama / Mixtral)' },
];

type FormState = {
  provider: AIProvider;
  model_id: string;
  label: string;
  notes: string;
  sort_order: number;
};

const EMPTY_FORM: FormState = {
  provider: 'anthropic',
  model_id: '',
  label: '',
  notes: '',
  sort_order: 100,
};

export function ManageModelsPanel() {
  const { data: models, isLoading } = useAIModelCatalog();
  const upsertModel = useUpsertAIModel();
  const updateModel = useUpdateAIModel();
  const deleteModel = useDeleteAIModel();
  const replaceModel = useReplaceAIModel();

  // Add / Edit dialog (shared)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Replace dialog
  const [replaceState, setReplaceState] = useState<{ source: AIModelCatalogEntry | null; targetId: string }>({
    source: null,
    targetId: '',
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (m: AIModelCatalogEntry) => {
    setEditingId(m.id);
    setForm({
      provider: m.provider,
      model_id: m.model_id,
      label: m.label,
      notes: m.notes ?? '',
      sort_order: m.sort_order,
    });
    setOpen(true);
  };

  const submitForm = async () => {
    if (!form.model_id.trim() || !form.label.trim()) return;
    if (editingId) {
      await updateModel.mutateAsync({
        id: editingId,
        patch: {
          label: form.label.trim(),
          notes: form.notes.trim() || null,
          sort_order: Number(form.sort_order) || 100,
        },
      });
    } else {
      await upsertModel.mutateAsync({
        provider: form.provider,
        model_id: form.model_id.trim(),
        label: form.label.trim(),
        notes: form.notes.trim() || null,
        sort_order: Number(form.sort_order) || 100,
      });
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setOpen(false);
  };

  const grouped = (models ?? []).reduce<Record<AIProvider, AIModelCatalogEntry[]>>(
    (acc, m) => {
      (acc[m.provider] ||= []).push(m);
      return acc;
    },
    { lovable: [], gemini: [], anthropic: [], groq: [] }
  );

  const replacementCandidates = (replaceState.source
    ? grouped[replaceState.source.provider].filter(
        (m) => m.id !== replaceState.source!.id && m.is_active
      )
    : []);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5" /> Manage AI Models
          </CardTitle>
          <CardDescription>
            Add, edit, replace or retire models as providers update them — no code deploy needed.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add model</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 p-3 text-sm text-blue-800 dark:text-blue-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">This panel manages available models, not the active model.</p>
            <p className="mt-0.5 text-blue-700 dark:text-blue-400">
              Toggling Active/Inactive controls which models appear in dropdowns. To switch which model KalmHub actually uses for a feature, use the <strong>Replace…</strong> button — that writes to the live settings.
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
          </div>
        ) : (
          PROVIDERS.map((p) => {
            const all = grouped[p.value] ?? [];
            const active = all.filter((m) => m.is_active);
            const inactive = all.filter((m) => !m.is_active);
            return (
              <div key={p.value} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{p.label}</h4>
                  <Badge variant="secondary">
                    {active.length} active
                  </Badge>
                  {inactive.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {inactive.length} inactive
                    </Badge>
                  )}
                </div>

                {active.length === 0 && inactive.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No models yet.</p>
                ) : (
                  <>
                    {active.length > 0 && (
                      <div className="border rounded-md divide-y">
                        {active.map((m) => (
                          <ModelRow
                            key={m.id}
                            model={m}
                            onToggleActive={(checked) =>
                              updateModel.mutate({ id: m.id, patch: { is_active: checked } })
                            }
                            onEdit={() => openEdit(m)}
                            onReplace={() => setReplaceState({ source: m, targetId: '' })}
                            onDelete={() => {
                              if (confirm(`Delete "${m.label}"?`)) deleteModel.mutate(m.id);
                            }}
                            canReplace={active.length > 1}
                          />
                        ))}
                      </div>
                    )}

                    {inactive.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                          >
                            <ChevronRight className="w-3 h-3 transition-transform group-data-[state=open]:rotate-90" />
                            Inactive ({inactive.length})
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="border rounded-md divide-y bg-muted/30">
                            {inactive.map((m) => (
                              <ModelRow
                                key={m.id}
                                model={m}
                                onToggleActive={(checked) =>
                                  updateModel.mutate({ id: m.id, patch: { is_active: checked } })
                                }
                                onEdit={() => openEdit(m)}
                                onReplace={() => setReplaceState({ source: m, targetId: '' })}
                                onDelete={() => {
                                  if (confirm(`Delete "${m.label}"?`)) deleteModel.mutate(m.id);
                                }}
                                canReplace={false}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit model' : 'Add a new AI model'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(v) => setForm((f) => ({ ...f, provider: v as AIProvider }))}
                disabled={!!editingId}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  Provider can't be changed after creation.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Model ID</Label>
              <Input
                placeholder="e.g. claude-sonnet-4-5-20250929"
                value={form.model_id}
                onChange={(e) => setForm((f) => ({ ...f, model_id: e.target.value }))}
                disabled={!!editingId}
              />
              <p className="text-xs text-muted-foreground">
                {editingId
                  ? "Model ID is locked. To switch identifiers, use Replace."
                  : "Exact model identifier sent to the provider's API."}
              </p>
            </div>
            <div className="space-y-1">
              <Label>Display label</Label>
              <Input
                placeholder="e.g. Claude Sonnet 4.5 (Latest)"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g. supports PDFs"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditingId(null); setForm(EMPTY_FORM); }}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={upsertModel.isPending || updateModel.isPending || !form.model_id || !form.label}>
              {editingId ? 'Save changes' : 'Save model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace dialog */}
      <Dialog
        open={!!replaceState.source}
        onOpenChange={(o) => !o && setReplaceState({ source: null, targetId: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace model</DialogTitle>
            <DialogDescription>
              {replaceState.source && (
                <>
                  Replace <strong>{replaceState.source.label}</strong> with another model.
                  Every saved AI setting that points at <code className="text-xs">{replaceState.source.model_id}</code> will be migrated automatically. The old model will be deactivated (kept for audit).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Replacement</Label>
              <Select
                value={replaceState.targetId}
                onValueChange={(v) => setReplaceState((s) => ({ ...s, targetId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={replacementCandidates.length === 0 ? 'No active alternatives' : 'Pick a replacement…'} />
                </SelectTrigger>
                <SelectContent>
                  {replacementCandidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {replacementCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add another active model from this provider first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceState({ source: null, targetId: '' })}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const target = replacementCandidates.find((m) => m.id === replaceState.targetId);
                if (!replaceState.source || !target) return;
                await replaceModel.mutateAsync({ oldModel: replaceState.source, newModel: target });
                setReplaceState({ source: null, targetId: '' });
              }}
              disabled={replaceModel.isPending || !replaceState.targetId}
            >
              Replace & migrate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ModelRow({
  model: m,
  onToggleActive,
  onEdit,
  onReplace,
  onDelete,
  canReplace,
}: {
  model: AIModelCatalogEntry;
  onToggleActive: (checked: boolean) => void;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
  canReplace: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{m.label}</span>
          {!m.is_active && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
        </div>
        <code className="text-xs text-muted-foreground break-all">{m.model_id}</code>
        {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {canReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ReplaceIcon className="w-3 h-3" /> Replace…
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Switch checked={m.is_active} onCheckedChange={onToggleActive} />
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
