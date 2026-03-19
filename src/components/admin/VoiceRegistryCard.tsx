import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTTSVoicesAdmin, TTSVoice } from '@/lib/ttsVoices';
import { useGeminiVoicesAdmin, GeminiVoice } from '@/lib/geminiVoices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Check, X, Edit2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

type VoiceProvider = 'elevenlabs' | 'gemini';

interface VoiceFormState {
  showAdd: boolean;
  newName: string;
  newVoiceId: string;
  newGender: 'male' | 'female';
  newLabel: string;
  editingId: number | null;
  editName: string;
  editLabel: string;
}

const initialFormState: VoiceFormState = {
  showAdd: false,
  newName: '',
  newVoiceId: '',
  newGender: 'male',
  newLabel: '',
  editingId: null,
  editName: '',
  editLabel: '',
};

function VoiceList({
  provider,
  voices,
  isLoading,
}: {
  provider: VoiceProvider;
  voices: (TTSVoice | GeminiVoice)[] | undefined;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [form, setForm] = useState<VoiceFormState>(initialFormState);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tts-voices'] });
    queryClient.invalidateQueries({ queryKey: ['tts-voices-admin'] });
    queryClient.invalidateQueries({ queryKey: ['gemini-voices'] });
    queryClient.invalidateQueries({ queryKey: ['gemini-voices-admin'] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        name: form.newName.trim(),
        gender: form.newGender,
        label: form.newLabel.trim() || null,
        uploaded_by: user?.id,
        display_order: (voices?.length ?? 0) + 1,
      };
      if (provider === 'elevenlabs') {
        payload.elevenlabs_voice_id = form.newVoiceId.trim();
      } else {
        payload.elevenlabs_voice_id = null;
        payload.provider = 'gemini';
      }
      const { error } = await supabase
        .from('tts_voices' as any)
        .insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm(initialFormState);
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
      setForm((f) => ({ ...f, editingId: null }));
      toast.success('Voice updated');
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  const startEdit = (voice: TTSVoice | GeminiVoice) => {
    setForm((f) => ({ ...f, editingId: voice.id, editName: voice.name, editLabel: voice.label || '' }));
  };

  const saveEdit = () => {
    if (form.editingId !== null && form.editName.trim()) {
      updateMutation.mutate({
        id: form.editingId,
        updates: { name: form.editName.trim(), label: form.editLabel.trim() || null },
      });
    }
  };

  const canAdd = provider === 'elevenlabs'
    ? form.newName.trim() && form.newVoiceId.trim()
    : form.newName.trim();

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setForm((f) => ({ ...f, showAdd: !f.showAdd }))}>
          <Plus className="w-4 h-4 mr-2" />
          Add Voice
        </Button>
      </div>

      {/* Add form */}
      {form.showAdd && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={provider === 'gemini' ? 'Voice name (e.g. Kore, Puck)' : 'Voice name'}
              value={form.newName}
              onChange={(e) => setForm((f) => ({ ...f, newName: e.target.value }))}
            />
            {provider === 'elevenlabs' ? (
              <Input
                placeholder="ElevenLabs Voice ID"
                value={form.newVoiceId}
                onChange={(e) => setForm((f) => ({ ...f, newVoiceId: e.target.value }))}
              />
            ) : (
              <Select value={form.newGender} onValueChange={(v) => setForm((f) => ({ ...f, newGender: v as 'male' | 'female' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {provider === 'elevenlabs' && (
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.newGender} onValueChange={(v) => setForm((f) => ({ ...f, newGender: v as 'male' | 'female' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Label (e.g. 'Warm & calm')"
                value={form.newLabel}
                onChange={(e) => setForm((f) => ({ ...f, newLabel: e.target.value }))}
              />
            </div>
          )}
          {provider === 'gemini' && (
            <Input
              placeholder="Label (e.g. 'Warm & calm')"
              value={form.newLabel}
              onChange={(e) => setForm((f) => ({ ...f, newLabel: e.target.value }))}
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!canAdd || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm(initialFormState)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Voice list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !voices?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No voices found. Add one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={`flex items-center gap-3 border rounded-lg p-3 transition-opacity ${
                !voice.is_active ? 'opacity-40' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                {form.editingId === voice.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.editName}
                      onChange={(e) => setForm((f) => ({ ...f, editName: e.target.value }))}
                      className="h-7 text-sm"
                      placeholder="Name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setForm((f) => ({ ...f, editingId: null }));
                      }}
                      autoFocus
                    />
                    <Input
                      value={form.editLabel}
                      onChange={(e) => setForm((f) => ({ ...f, editLabel: e.target.value }))}
                      className="h-7 text-sm"
                      placeholder="Label"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setForm((f) => ({ ...f, editingId: null }));
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setForm((f) => ({ ...f, editingId: null }))}>
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
                    {provider === 'elevenlabs' && 'elevenlabs_voice_id' in voice
                      ? (voice as TTSVoice).elevenlabs_voice_id
                      : 'Gemini voice name'}
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
    </div>
  );
}

export function VoiceRegistryCard() {
  const { data: elevenVoices, isLoading: elevenLoading } = useTTSVoicesAdmin();
  const { data: geminiVoices, isLoading: geminiLoading } = useGeminiVoicesAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Volume2 className="w-5 h-5" />
          Voice Registry
        </CardTitle>
        <CardDescription>
          Manage TTS voices for ElevenLabs and Gemini providers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="elevenlabs">
          <TabsList className="mb-4">
            <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
            <TabsTrigger value="gemini">Gemini</TabsTrigger>
          </TabsList>
          <TabsContent value="elevenlabs">
            <VoiceList provider="elevenlabs" voices={elevenVoices} isLoading={elevenLoading} />
          </TabsContent>
          <TabsContent value="gemini">
            <VoiceList provider="gemini" voices={geminiVoices} isLoading={geminiLoading} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
