import { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExaminerAvatars } from '@/lib/examinerAvatars';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Users, Check, X, Edit2, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface AvatarRow {
  id: number;
  name: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
}

/** Admin hook: fetch ALL avatars (active + inactive) */
function useExaminerAvatarsAdmin() {
  return useQuery({
    queryKey: ['examiner-avatars-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('examiner_avatars')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as AvatarRow[];
    },
  });
}

/** Fetch usage counts for each avatar */
function useAvatarUsageCounts() {
  return useQuery({
    queryKey: ['examiner-avatar-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_patient_cases')
        .select('avatar_id')
        .not('avatar_id', 'is', null);
      if (error) throw error;

      const counts: Record<number, number> = {};
      (data || []).forEach((row: any) => {
        const id = row.avatar_id as number;
        counts[id] = (counts[id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function ExaminerAvatarsCard() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const { data: allAvatars, isLoading } = useExaminerAvatarsAdmin();
  const { data: usageCounts = {} } = useAvatarUsageCounts();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `examiner-avatars/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      const { error: insertError } = await supabase
        .from('examiner_avatars')
        .insert({
          name: file.name.replace(/\.[^/.]+$/, ''),
          image_url: urlData.publicUrl,
          uploaded_by: user?.id,
          display_order: (allAvatars?.length ?? 0) + 1,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examiner-avatars'] });
      queryClient.invalidateQueries({ queryKey: ['examiner-avatars-admin'] });
      toast.success('Avatar uploaded successfully');
    },
    onError: (e: Error) => toast.error(`Upload failed: ${e.message}`),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { error } = await supabase
        .from('examiner_avatars')
        .update({ name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examiner-avatars'] });
      queryClient.invalidateQueries({ queryKey: ['examiner-avatars-admin'] });
      setEditingId(null);
      toast.success('Avatar renamed');
    },
    onError: (e: Error) => toast.error(`Rename failed: ${e.message}`),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const { error } = await supabase
        .from('examiner_avatars')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examiner-avatars'] });
      queryClient.invalidateQueries({ queryKey: ['examiner-avatars-admin'] });
      toast.success('Avatar status updated');
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PNG, JPEG, and WebP images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 2MB.');
      e.target.value = '';
      return;
    }
    uploadMutation.mutate(file);
    e.target.value = '';
  };

  const startRename = (avatar: AvatarRow) => {
    setEditingId(avatar.id);
    setEditName(avatar.name);
  };

  const saveRename = () => {
    if (editingId !== null && editName.trim()) {
      renameMutation.mutate({ id: editingId, name: editName.trim() });
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <Users className="w-5 h-5" />
                  Examiner Avatars
                </CardTitle>
                <CardDescription>
                  Manage examiner avatars used in structured cases.
                </CardDescription>
              </div>
              {isOpen && (
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Avatar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !allAvatars?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No avatars found. Upload one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`relative border rounded-lg p-3 space-y-2 transition-opacity ${
                  !avatar.is_active ? 'opacity-40' : ''
                }`}
              >
                <div className="aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  <img
                    src={avatar.image_url}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {editingId === avatar.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveRename}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{avatar.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => startRename(avatar)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {usageCounts[avatar.id] ?? 0} cases
                  </Badge>
                  <Switch
                    checked={avatar.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: avatar.id, is_active: checked })
                    }
                    disabled={toggleActiveMutation.isPending}
                  />
                </div>

                {!avatar.is_active && (
                  <Badge variant="outline" className="text-xs w-full justify-center">
                    Inactive
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
