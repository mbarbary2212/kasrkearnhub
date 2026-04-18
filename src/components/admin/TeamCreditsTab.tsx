import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllTeamCredits, type TeamCredit } from '@/hooks/useTeamCredits';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Upload, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface FormState {
  id?: string;
  name: string;
  role: string;
  email: string;
  photo_url: string;
  display_order: number;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: '',
  role: '',
  email: '',
  photo_url: '',
  display_order: 0,
  is_active: true,
};

function initials(name: string) {
  return (name || '?')
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function TeamCreditsTab() {
  const { user, isSuperAdmin } = useAuthContext();
  const qc = useQueryClient();
  const { data: team = [], isLoading } = useAllTeamCredits();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['team-credits'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = {
        name: data.name.trim(),
        role: data.role.trim(),
        email: data.email.trim() || null,
        photo_url: data.photo_url.trim() || null,
        display_order: data.display_order,
        is_active: data.is_active,
        updated_by: user?.id ?? null,
      };
      if (data.id) {
        const { error } = await supabase
          .from('team_credits')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('team_credits')
          .insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Saved');
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_credits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('team_credits')
        .update({ is_active, updated_by: user?.id ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEdit = (m: TeamCredit) => {
    setForm({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email ?? '',
      photo_url: m.photo_url ?? '',
      display_order: m.display_order,
      is_active: m.is_active,
    });
    setOpen(true);
  };

  const handleAdd = () => {
    const nextOrder = (team[team.length - 1]?.display_order ?? 0) + 10;
    setForm({ ...EMPTY, display_order: nextOrder });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `team-credits/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setForm((prev) => ({ ...prev, photo_url: data.publicUrl }));
      toast.success('Photo uploaded');
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Only super admins can manage team credits.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            Team Credits
          </CardTitle>
          <CardDescription>
            Manage the "KALM Hub Team" list shown in the sidebar credit popover.
          </CardDescription>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add member
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {team.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {m.photo_url ? <AvatarImage src={m.photo_url} alt={m.name} /> : null}
                  <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                    {initials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    {!m.is_active && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5">
                        hidden
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.role}
                    {m.email ? ` · ${m.email}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={m.is_active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: m.id, is_active: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Remove ${m.name} from credits?`)) deleteMutation.mutate(m.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {team.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No team members yet. Add the first one!
              </p>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit member' : 'Add member'}</DialogTitle>
            <DialogDescription>
              These details appear in the sidebar credits popover.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                {form.photo_url ? <AvatarImage src={form.photo_url} alt={form.name} /> : null}
                <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                  {initials(form.name || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  type="button"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload photo
                </Button>
                {form.photo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, photo_url: '' })}
                    type="button"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Full Name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role / Contribution</Label>
              <Input
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. UI Design"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="order">Display order</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: parseInt(e.target.value || '0', 10) })
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center justify-between w-full rounded-md border border-border px-3 py-2">
                  <Label htmlFor="active" className="text-sm">
                    Visible
                  </Label>
                  <Switch
                    id="active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name.trim() || !form.role.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
