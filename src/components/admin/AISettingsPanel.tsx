import { useState } from 'react';
import { TTSVoicesCard } from '@/components/admin/TTSVoicesCard';
import { GeminiVoicesCard } from '@/components/admin/GeminiVoicesCard';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, Settings, AlertTriangle, Save, RefreshCw, Zap, Cloud,
  ChevronDown, ChevronRight, BookOpen, Shield, History, Check, Volume2, Loader2, PlugZap
} from 'lucide-react';

// ELEVENLABS_VOICES import removed - voices now managed via TTSVoicesCard only
import { useAISettings, useUpdateAISetting, getSettingValue } from '@/hooks/useAISettings';
import { 
  useActiveAIRules, useAIRules, useCreateAIRule, useActivateAIRule,
  useAIPlatformSettings, useUpdateAIPlatformSettings
} from '@/hooks/useAIGovernance';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAIModelCatalog, type AIProvider } from '@/hooks/useAIModelCatalog';
import { ManageModelsPanel } from '@/components/admin/ManageModelsPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AI_PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI Gateway', description: 'Uses Lovable credits' },
  { value: 'gemini', label: 'Google Gemini API', description: 'Uses your GOOGLE_API_KEY' },
  { value: 'anthropic', label: 'Anthropic Claude API', description: 'Uses your ANTHROPIC_API_KEY' },
];

const CUSTOM_MODEL_VALUE = '__custom__';

const CONTENT_TYPES = [
  { value: 'mcq', label: 'MCQ Questions' },
  { value: 'sba', label: 'SBA Questions' },
  { value: 'essay', label: 'Short Questions' },
  { value: 'osce', label: 'OSCE Questions' },
  { value: 'matching', label: 'Matching Questions' },
  { value: 'flashcard', label: 'Flashcards' },
  { value: 'clinical_case', label: 'Interactive Cases' },
  { value: 'guided_explanation', label: 'Guided Explanations' },
  { value: 'mind_map', label: 'Mind Maps' },
];

interface AISettingsPanelProps {
  showRules?: boolean | 'only';
}

export function AISettingsPanel({ showRules = true }: AISettingsPanelProps) {
  const { data: settings, isLoading, refetch } = useAISettings();
  const updateSetting = useUpdateAISetting();
  const { isSuperAdmin } = useAuthContext();
  
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});
  const [mainOpen, setMainOpen] = useState(false);

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
  const provider = getValue('ai_provider', 'gemini');
  const lovableModel = getValue('lovable_model', 'google/gemini-3-flash-preview');
  const geminiModel = getValue('gemini_model', 'gemini-2.5-flash');
  const anthropicModel = getValue('anthropic_model', 'claude-sonnet-4-20250514');
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

  // If showRules is 'only', render just the rules section
  if (showRules === 'only') {
    return <ContentRulesSection />;
  }

  return (
    <div className="space-y-4">
      {/* Superadmin Global AI Policy */}
      {isSuperAdmin && <GlobalAIPolicySection />}

      <Card>
        <Collapsible open={mainOpen} onOpenChange={setMainOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ChevronRight className={`w-4 h-4 transition-transform ${mainOpen ? 'rotate-90' : ''}`} />
                    <Sparkles className="w-5 h-5" />
                    AI Content Factory Settings
                  </CardTitle>
                  <CardDescription>
                    Configure AI provider, models, and content generation controls.
                  </CardDescription>
                </div>
                {mainOpen && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
                <Button size="sm" variant="outline"
                  onClick={() => handleSave('ai_content_factory_enabled')}
                  disabled={updateSetting.isPending}>
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
                  <Button size="sm" variant="outline"
                    onClick={() => handleSave('ai_content_factory_disabled_message')}
                    disabled={updateSetting.isPending}>
                    Save
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* AI Provider & Model Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">AI Provider & Model</Label>
            <div className="grid gap-4 md:grid-cols-3">
              {AI_PROVIDERS.filter((p) => p.value !== 'lovable' || isSuperAdmin).map((p) => {
                const isActive = provider === p.value;
                const modelKey = p.value === 'lovable' ? 'lovable_model' : p.value === 'gemini' ? 'gemini_model' : 'anthropic_model';
                const modelValue = p.value === 'lovable' ? lovableModel : p.value === 'gemini' ? geminiModel : anthropicModel;
                const icon = p.value === 'lovable' ? <Zap className="w-4 h-4" /> : p.value === 'anthropic' ? <Sparkles className="w-4 h-4" /> : <Cloud className="w-4 h-4" />;

                return (
                  <ProviderModelCard
                    key={p.value}
                    provider={p.value as AIProvider}
                    label={p.label}
                    icon={icon}
                    isActive={isActive}
                    modelValue={modelValue as string}
                    isPendingSave={modelKey in pendingChanges}
                    onActivate={() => handleChange('ai_provider', p.value)}
                    onModelChange={(v) => handleChange(modelKey, v)}
                    onSaveModel={() => handleSave(modelKey)}
                    saveDisabled={updateSetting.isPending}
                  />
                );
              })}
            </div>
            {'ai_provider' in pendingChanges && (
              <Button size="sm" onClick={() => handleSave('ai_provider')} disabled={updateSetting.isPending}>
                <Save className="w-4 h-4 mr-1" />
                Save Provider
              </Button>
            )}
          </div>

          {/* Info Section */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Provider Notes</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {isSuperAdmin && <li><strong>Lovable AI Gateway:</strong> Uses your Lovable workspace credits. No API key needed.</li>}
              <li><strong>Google Gemini API:</strong> Requires <code>GOOGLE_API_KEY</code> secret in Edge Functions.</li>
              <li><strong>Anthropic Claude API:</strong> Requires <code>ANTHROPIC_API_KEY</code> secret in Edge Functions.</li>
              <li>Changes take effect immediately for new generation requests.</li>
            </ul>
          </div>
        </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Voice Provider Section */}
      <VoiceProviderSection
        getValue={getValue}
        handleChange={handleChange}
        handleSave={handleSave}
        pendingChanges={pendingChanges}
        updateIsPending={updateSetting.isPending}
      />

      {/* Model per Content Type */}
      <ContentTypeModelSection provider={provider as string} />

      {/* Manage Models catalog (super admin only) */}
      {isSuperAdmin && <ManageModelsPanel />}

      {/* Content Type Rules Section — only if showRules is true */}
      {showRules && <ContentRulesSection />}
    </div>
  );
}

// ============================================
// Provider + Model card with catalog + Custom + Test
// ============================================

function ProviderModelCard({
  provider,
  label,
  icon,
  isActive,
  modelValue,
  isPendingSave,
  onActivate,
  onModelChange,
  onSaveModel,
  saveDisabled,
}: {
  provider: AIProvider;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  modelValue: string;
  isPendingSave: boolean;
  onActivate: () => void;
  onModelChange: (v: string) => void;
  onSaveModel: () => void;
  saveDisabled: boolean;
}) {
  const { data: catalog, isLoading } = useAIModelCatalog(provider, { activeOnly: true });
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [testing, setTesting] = useState(false);

  const models = catalog ?? [];
  const matchesCatalog = models.some(m => m.model_id === modelValue);
  const showingCustom = customMode || (!isLoading && !matchesCatalog && !!modelValue);
  const selectValue = showingCustom ? CUSTOM_MODEL_VALUE : modelValue;

  const handleSelect = (v: string) => {
    if (v === CUSTOM_MODEL_VALUE) {
      setCustomMode(true);
      setCustomValue(matchesCatalog ? '' : modelValue);
      return;
    }
    setCustomMode(false);
    onModelChange(v);
  };

  const commitCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    onModelChange(trimmed);
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-connection', {
        body: { provider, model: modelValue },
      });
      if (error) {
        toast.error(`Test failed: ${error.message}`);
      } else if (data?.ok) {
        toast.success(`✓ ${provider}/${modelValue} responded`);
      } else {
        toast.error(`Provider error: ${data?.error || 'unknown'}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Test failed: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={`space-y-2 p-3 border rounded-lg transition-colors ${
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-muted hover:border-primary/30 cursor-pointer'
      }`}
      onClick={() => !isActive && onActivate()}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </span>
        {isActive && <Check className="w-4 h-4 text-primary ml-auto" />}
      </div>

      <Select value={selectValue} onValueChange={handleSelect} disabled={!isActive}>
        <SelectTrigger className={`w-full ${!isActive ? 'opacity-50' : ''}`}>
          <SelectValue placeholder={isLoading ? 'Loading…' : 'Pick a model'} />
        </SelectTrigger>
        <SelectContent>
          {models.map(m => (
            <SelectItem key={m.model_id} value={m.model_id}>{m.label}</SelectItem>
          ))}
          {!matchesCatalog && !!modelValue && !customMode && (
            <SelectItem value={modelValue}>{modelValue} (current)</SelectItem>
          )}
          <SelectItem value={CUSTOM_MODEL_VALUE}>✏️ Custom model ID…</SelectItem>
        </SelectContent>
      </Select>

      {showingCustom && isActive && (
        <div className="flex gap-1.5">
          <Input
            value={customValue || (matchesCatalog ? '' : modelValue)}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="paste exact model id"
            className="h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
          <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); commitCustom(); }}>
            Use
          </Button>
        </div>
      )}

      {!isActive && <p className="text-xs text-muted-foreground">Click to switch</p>}

      {isActive && (
        <div className="flex gap-1.5">
          {isPendingSave && (
            <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); onSaveModel(); }} disabled={saveDisabled}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <Button size="sm" variant="ghost" className={isPendingSave ? '' : 'flex-1'} onClick={handleTest} disabled={testing || !modelValue}>
            {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PlugZap className="w-3 h-3 mr-1" />}
            Test
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Voice Provider Section
// ============================================

function VoiceProviderSection({
  getValue,
  handleChange,
  handleSave,
  pendingChanges,
  updateIsPending,
}: {
  getValue: <T>(key: string, defaultValue: T) => T;
  handleChange: (key: string, value: unknown) => void;
  handleSave: (key: string) => Promise<void>;
  pendingChanges: Record<string, unknown>;
  updateIsPending: boolean;
}) {
  const { isSuperAdmin } = useAuthContext();
  const ttsProvider = getValue('tts_provider', 'browser') as string;

  const providers = [
    { value: 'browser', label: '🌐 Browser (Built-in)', description: 'Free, works on all devices. Quality varies by browser and OS.' },
    { value: 'elevenlabs', label: '🟢 ElevenLabs', description: 'Authentic Egyptian Arabic voices. Powered by professional voice actors.' },
    ...(isSuperAdmin ? [{ value: 'gemini', label: '🤖 Google Gemini', description: 'Google Gemini TTS. Uses GOOGLE_API_KEY.' }] : []),
  ];

  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className={`w-4 h-4 transition-transform ${voiceOpen ? 'rotate-90' : ''}`} />
              <Volume2 className="w-5 h-5" />
              Voice Provider (TTS)
            </CardTitle>
            <CardDescription>Choose how patient voice responses are spoken during history taking</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleChange('tts_provider', p.value)}
                  className={cn(
                    'flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
                    ttsProvider === p.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-sm">{p.label}</span>
                    {ttsProvider === p.value && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </button>
              ))}
            </div>

            {'tts_provider' in pendingChanges && (
              <Button size="sm" onClick={() => handleSave('tts_provider')} disabled={updateIsPending}>
                <Save className="w-4 h-4 mr-1" /> Save Provider
              </Button>
            )}

            {/* Voice Registry — nested inside the collapsible */}
            {ttsProvider === 'elevenlabs' && (
              <div className="pt-4 border-t">
                <TTSVoicesCard />
              </div>
            )}

            {ttsProvider === 'gemini' && (
              <div className="pt-4 border-t">
                <GeminiVoicesCard />
              </div>
            )}

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// Global AI Policy (Superadmin Only)
// ============================================

function GlobalAIPolicySection() {
  const { data: platformSettings, isLoading } = useAIPlatformSettings();
  const updateSettings = useUpdateAIPlatformSettings();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !platformSettings) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Shield className="w-5 h-5" />
              Global AI Policy
              <Badge variant="outline" className="text-xs">Super Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Control who can use the platform's global API key for AI generation.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Allow Superadmin Global AI</Label>
                <p className="text-sm text-muted-foreground">
                  Allow super admins to use the platform's global API key.
                </p>
              </div>
              <Switch
                checked={platformSettings.allow_superadmin_global_ai}
                onCheckedChange={(checked) => updateSettings.mutate({ allow_superadmin_global_ai: checked })}
                disabled={updateSettings.isPending}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Allow Admin Fallback to Global Key</Label>
                <p className="text-sm text-muted-foreground">
                  If disabled, admins without their own API key cannot generate content.
                </p>
              </div>
              <Switch
                checked={platformSettings.allow_admin_fallback_to_global_key}
                onCheckedChange={(checked) => updateSettings.mutate({ allow_admin_fallback_to_global_key: checked })}
                disabled={updateSettings.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Cost Message (shown to admins without API key)</Label>
              <Textarea
                value={platformSettings.global_key_disabled_message}
                onChange={(e) => updateSettings.mutate({ global_key_disabled_message: e.target.value })}
                rows={12}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// Model per Content Type
// ============================================

function ContentTypeModelSection({ provider }: { provider: string }) {
  const { data: settings } = useAISettings();
  const updateSetting = useUpdateAISetting();
  const [isOpen, setIsOpen] = useState(false);
  const { data: catalog } = useAIModelCatalog(provider as AIProvider, { activeOnly: true });

  const overrides = getSettingValue<Record<string, string>>(settings, 'content_type_model_overrides', {});

  const models = (catalog ?? []).map(m => ({ value: m.model_id, label: m.label }));

  const handleModelChange = (contentType: string, model: string) => {
    const newOverrides = { ...overrides, [contentType]: model };
    updateSetting.mutate({ key: 'content_type_model_overrides', value: newOverrides });
  };

  const globalModel = provider === 'gemini'
    ? getSettingValue(settings, 'gemini_model', 'gemini-2.5-flash')
    : provider === 'anthropic'
    ? getSettingValue(settings, 'anthropic_model', 'claude-sonnet-4-20250514')
    : getSettingValue(settings, 'lovable_model', 'google/gemini-3-flash-preview');

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <Settings className="w-5 h-5" />
              Model per Content Type
            </CardTitle>
            <CardDescription>
              Automatically select the best model for each content type. "Use Global Default" falls back to: <Badge variant="outline" className="ml-1">{String(globalModel)}</Badge>
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTENT_TYPES.map(ct => {
                const current = overrides[ct.value] || 'default';
                return (
                  <div key={ct.value} className="flex items-center gap-2">
                    <Label className="w-36 text-sm shrink-0">{ct.label}</Label>
                    <Select value={current} onValueChange={(v) => handleModelChange(ct.value, v)} disabled={updateSetting.isPending}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Use Global Default</SelectItem>
                        {models.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================
// Content Type Rules Editor
// ============================================

function ContentRulesSection() {
  const { data: rules, isLoading } = useActiveAIRules();
  const createRule = useCreateAIRule();
  const activateRule = useActivateAIRule();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  if (isLoading) return <Skeleton className="h-48" />;

  const activeRulesByType = new Map<string, typeof rules extends (infer T)[] | undefined ? T : never>();
  rules?.forEach(r => activeRulesByType.set(r.content_type, r));

  const handleEdit = (contentType: string) => {
    const existing = activeRulesByType.get(contentType);
    setEditText(existing?.instructions || '');
    setEditingType(contentType);
  };

  const handleSaveRule = async () => {
    if (!editingType) return;
    await createRule.mutateAsync({
      scope: 'global',
      content_type: editingType,
      instructions: editText,
      is_active: true,
      notes: 'Updated from AI Settings panel',
    });
    setEditingType(null);
    setEditText('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Content Type Rules
        </CardTitle>
        <CardDescription>
          Edit the pedagogical guidelines used for each content type during AI generation.
          Changes create new versions — you can rollback anytime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {CONTENT_TYPES.map(ct => {
          const activeRule = activeRulesByType.get(ct.value);
          const isEditing = editingType === ct.value;

          return (
            <Collapsible key={ct.value}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{ct.label}</span>
                    {activeRule && (
                      <Badge variant="outline" className="text-xs">v{activeRule.version}</Badge>
                    )}
                    {!activeRule && (
                      <Badge variant="secondary" className="text-xs">No rules set</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost" size="sm"
                      onClick={(e) => { e.stopPropagation(); handleEdit(ct.value); }}
                    >
                      Edit
                    </Button>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                {isEditing ? (
                  <div className="space-y-3 mt-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="Enter pedagogical guidelines for this content type..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveRule} disabled={createRule.isPending}>
                        <Save className="w-4 h-4 mr-1" />
                        Save as New Version
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingType(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">
                      {activeRule?.instructions || 'No rules configured. Using default hardcoded guidelines.'}
                    </pre>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
