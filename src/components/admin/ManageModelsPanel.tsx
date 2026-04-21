import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, BookMarked } from 'lucide-react';
import {
  useAIModelCatalog,
  useUpsertAIModel,
  useUpdateAIModel,
  useDeleteAIModel,
  type AIProvider,
} from '@/hooks/useAIModelCatalog';

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'lovable', label: 'Lovable AI Gateway' },
  { value: 'gemini', label: 'Google Gemini (Direct)' },
  { value: 'anthropic', label: 'Anthropic Claude (Direct)' },
];

export function ManageModelsPanel() {
  const { data: models, isLoading } = useAIModelCatalog();
  const upsertModel = useUpsertAIModel();
  const updateModel = useUpdateAIModel();
  const deleteModel = useDeleteAIModel();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ provider: AIProvider; model_id: string; label: string; notes: string; sort_order: number }>({
    provider: 'anthropic',
    model_id: '',
    label: '',
    notes: '',
    sort_order: 100,
  });

  const reset = () => setForm({ provider: 'anthropic', model_id: '', label: '', notes: '', sort_order: 100 });

  const submit = async () => {
    if (!form.model_id.trim() || !form.label.trim()) return;
    await upsertModel.mutateAsync({
      provider: form.provider,
      model_id: form.model_id.trim(),
      label: form.label.trim(),
      notes: form.notes.trim() || null,
      sort_order: Number(form.sort_order) || 100,
    });
    reset();
    setOpen(false);
  };

  const grouped = (models ?? []).reduce<Record<AIProvider, typeof models>>((acc, m) => {
    (acc[m.provider] ||= [] as never).push(m);
    return acc;
  }, { lovable: [], gemini: [], anthropic: [] } as Record<AIProvider, typeof models>);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="w-5 h-5" /> Manage AI Models
          </CardTitle>
          <CardDescription>
            Add new models the moment a provider releases them — no code deploy needed.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add model</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a new AI model</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm(f => ({ ...f, provider: v as AIProvider }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Model ID</Label>
                <Input
                  placeholder="e.g. claude-sonnet-4-5-20250929"
                  value={form.model_id}
                  onChange={(e) => setForm(f => ({ ...f, model_id: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Exact model identifier sent to the provider's API.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Display label</Label>
                <Input
                  placeholder="e.g. Claude Sonnet 4.5 (Latest)"
                  value={form.label}
                  onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="e.g. supports PDFs"
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
              <Button onClick={submit} disabled={upsertModel.isPending || !form.model_id || !form.label}>
                Save model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
          </div>
        ) : (
          PROVIDERS.map((p) => {
            const list = grouped[p.value] ?? [];
            return (
              <div key={p.value} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{p.label}</h4>
                  <Badge variant="secondary">{list.length} model{list.length === 1 ? '' : 's'}</Badge>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No models yet.</p>
                ) : (
                  <div className="border rounded-md divide-y">
                    {list.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{m.label}</span>
                            {m.is_default && <Badge variant="default" className="text-[10px]">default</Badge>}
                            {!m.is_active && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                          </div>
                          <code className="text-xs text-muted-foreground break-all">{m.model_id}</code>
                          {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={m.is_active}
                              onCheckedChange={(checked) => updateModel.mutate({ id: m.id, patch: { is_active: checked } })}
                            />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete "${m.label}"?`)) deleteModel.mutate(m.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
