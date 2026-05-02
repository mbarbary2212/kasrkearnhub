import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTTSVoicesAdmin, TTSVoice } from '@/lib/ttsVoices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Check, X, Edit2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export function TTSVoicesCard() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { data: allVoices, isLoading } = useTTSVoicesAdmin();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newLabel, setNewLabel] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tts-voices'] });
    queryClient.invalidateQueries({ queryKey: ['tts-voices-admin'] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tts_voices' as any)
        .insert({
          name: newName.trim(),
          elevenlabs_voice_id: newVoiceId.trim(),
          gender: newGender,
          label: newLabel.trim() || null,
          provider: 'elevenlabs',
          uploaded_by: user?.id,
          display_order: (allVoices?.length ?? 0) + 1,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setNewName('');
      setNewVoiceId('');
      setNewLabel('');
      toast.success('Voice added successfully');
    },
    onError: (e: Error) => toast.error(`Failed to add voice: ${e.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('tts_voices' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success('Voice updated');
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  const startEdit = (voice: TTSVoice) => {
    setEditingId(voice.id);
    setEditName(voice.name);
    setEditLabel(voice.label || '');
  };

  const saveEdit = () => {
    if (editingId !== null && editName.trim()) {
      updateMutation.mutate({
        id: editingId,
        updates: { name: editName.trim(), label: editLabel.trim() || null },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Volume2 className="w-5 h-5" />
              TTS Voices
            </CardTitle>
            <CardDescription>
              Manage ElevenLabs voices available for clinical cases.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Voice
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new voice form */}
        {showAdd && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Voice name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="ElevenLabs Voice ID"
                value={newVoiceId}
                onChange={(e) => setNewVoiceId(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={newGender} onValueChange={(v) => setNewGender(v as 'male' | 'female')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Label (e.g. 'Warm & calm')"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => addMutation.mutate()}
                disabled={!newName.trim() || !newVoiceId.trim() || addMutation.isPending}
              >
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !allVoices?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No voices found. Add one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {allVoices.map((voice) => (
              <div
                key={voice.id}
                className={`flex items-center gap-3 border rounded-lg p-3 transition-opacity ${
                  !voice.is_active ? 'opacity-40' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  {editingId === voice.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        placeholder="Name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-7 text-sm"
                        placeholder="Label"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{voice.name}</span>
                      {voice.label && (
                        <span className="text-xs text-muted-foreground">— {voice.label}</span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => startEdit(voice)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {voice.gender}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {voice.elevenlabs_voice_id}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={voice.is_active}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ id: voice.id, updates: { is_active: checked } })
                  }
                  disabled={updateMutation.isPending}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
