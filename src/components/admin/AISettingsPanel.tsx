import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Settings, 
  AlertTriangle, 
  Save,
  RefreshCw,
  Zap,
  Cloud
} from 'lucide-react';
import { useAISettings, useUpdateAISetting, getSettingValue } from '@/hooks/useAISettings';

const AI_PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI Gateway', description: 'Uses Lovable credits' },
  { value: 'gemini', label: 'Google Gemini API', description: 'Uses your GOOGLE_API_KEY' },
];

const LOVABLE_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Fast)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanced)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (High Quality)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (OpenAI)' },
];

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanced)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (High Quality)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Fastest)' },
];

export function AISettingsPanel() {
  const { data: settings, isLoading, refetch } = useAISettings();
  const updateSetting = useUpdateAISetting();
  
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});

  const getValue = <T,>(key: string, defaultValue: T): T => {
    if (key in pendingChanges) return pendingChanges[key] as T;
    return getSettingValue(settings, key, defaultValue);
  };

  const handleChange = (key: string, value: unknown) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    if (!(key in pendingChanges)) return;
    await updateSetting.mutateAsync({ key, value: pendingChanges[key] });
    setPendingChanges(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveAll = async () => {
    for (const [key, value] of Object.entries(pendingChanges)) {
      await updateSetting.mutateAsync({ key, value });
    }
    setPendingChanges({});
  };

  const factoryEnabled = getValue('ai_content_factory_enabled', true);
  const provider = getValue('ai_provider', 'lovable');
  const lovableModel = getValue('lovable_model', 'google/gemini-3-flash-preview');
  const geminiModel = getValue('gemini_model', 'gemini-2.5-flash');
  const disabledMessage = getValue('ai_content_factory_disabled_message', 'AI content generation is currently disabled.');

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Content Factory Settings
            </CardTitle>
            <CardDescription>
              Configure AI provider, models, and content generation controls.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {hasPendingChanges && (
              <Button size="sm" onClick={handleSaveAll} disabled={updateSetting.isPending}>
                <Save className="w-4 h-4 mr-1" />
                Save All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Factory Enable/Disable */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="factory-toggle" className="text-base font-medium">
                AI Content Factory
              </Label>
              <Badge variant={factoryEnabled ? 'default' : 'secondary'}>
                {factoryEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable or disable AI content generation from PDFs. Other AI features (Study Coach) remain unaffected.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="factory-toggle"
              checked={factoryEnabled}
              onCheckedChange={(checked) => handleChange('ai_content_factory_enabled', checked)}
            />
            {'ai_content_factory_enabled' in pendingChanges && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleSave('ai_content_factory_enabled')}
                disabled={updateSetting.isPending}
              >
                Save
              </Button>
            )}
          </div>
        </div>

        {!factoryEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI Content Factory is disabled. Admins cannot generate new content from PDFs until re-enabled.
            </AlertDescription>
          </Alert>
        )}

        {/* Disabled Message */}
        {!factoryEnabled && (
          <div className="space-y-2">
            <Label htmlFor="disabled-message">Disabled Message</Label>
            <div className="flex gap-2">
              <Textarea
                id="disabled-message"
                value={disabledMessage}
                onChange={(e) => handleChange('ai_content_factory_disabled_message', e.target.value)}
                placeholder="Message shown to admins when factory is disabled"
                rows={2}
                className="flex-1"
              />
              {'ai_content_factory_disabled_message' in pendingChanges && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleSave('ai_content_factory_disabled_message')}
                  disabled={updateSetting.isPending}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
        )}

        {/* AI Provider Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">AI Provider</Label>
          <div className="grid gap-3 md:grid-cols-2">
            {AI_PROVIDERS.map((p) => (
              <div
                key={p.value}
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  provider === p.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => handleChange('ai_provider', p.value)}
              >
                <div className={`p-2 rounded-lg ${provider === p.value ? 'bg-primary/10' : 'bg-muted'}`}>
                  {p.value === 'lovable' ? (
                    <Zap className="w-5 h-5 text-primary" />
                  ) : (
                    <Cloud className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{p.label}</div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
                {provider === p.value && (
                  <Badge variant="default" className="ml-auto">Active</Badge>
                )}
              </div>
            ))}
          </div>
          {'ai_provider' in pendingChanges && (
            <Button 
              size="sm" 
              onClick={() => handleSave('ai_provider')}
              disabled={updateSetting.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              Save Provider
            </Button>
          )}
        </div>

        {/* Model Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Lovable Model */}
          <div className="space-y-2">
            <Label htmlFor="lovable-model">Lovable Gateway Model</Label>
            <div className="flex gap-2">
              <Select
                value={lovableModel}
                onValueChange={(v) => handleChange('lovable_model', v)}
                disabled={provider !== 'lovable'}
              >
                <SelectTrigger id="lovable-model" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOVABLE_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {'lovable_model' in pendingChanges && (
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => handleSave('lovable_model')}
                  disabled={updateSetting.isPending}
                >
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>
            {(provider as string) !== 'lovable' && (
              <p className="text-xs text-muted-foreground">Switch to Lovable provider to use this model</p>
            )}
          </div>

          {/* Gemini Model */}
          <div className="space-y-2">
            <Label htmlFor="gemini-model">Gemini API Model</Label>
            <div className="flex gap-2">
              <Select
                value={geminiModel as string}
                onValueChange={(v) => handleChange('gemini_model', v)}
                disabled={(provider as string) !== 'gemini'}
              >
                <SelectTrigger id="gemini-model" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {'gemini_model' in pendingChanges && (
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => handleSave('gemini_model')}
                  disabled={updateSetting.isPending}
                >
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>
            {(provider as string) !== 'gemini' && (
              <p className="text-xs text-muted-foreground">Switch to Gemini provider to use this model</p>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Provider Notes</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Lovable AI Gateway:</strong> Uses your Lovable workspace credits. No API key needed.</li>
            <li><strong>Google Gemini API:</strong> Requires <code>GOOGLE_API_KEY</code> secret in Edge Functions.</li>
            <li>Changes take effect immediately for new generation requests.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
