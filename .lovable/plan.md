

## Changes

### 1. Move Content Factory tab before AI Cases in AdminTabsNavigation.tsx

Current order in the `content` group:
1. Curriculum
2. PDF Library
3. **Content Factory** ← currently here
4. Help & Templates
5. Question Analytics
6. Content Integrity
7. AI Cases

New order:
1. Curriculum
2. PDF Library
3. Help & Templates
4. Question Analytics
5. Content Integrity
6. **Content Factory** ← moved here
7. AI Cases

Edit lines 51-58 in `src/components/admin/AdminTabsNavigation.tsx` to reorder the tabs array.

### 2. Add Claude AI as a provider option in AISettingsPanel.tsx

Add a third entry to the `AI_PROVIDERS` array (line 24-27):
```
{ value: 'anthropic', label: 'Anthropic Claude API', description: 'Uses your ANTHROPIC_API_KEY' }
```

Add a `CLAUDE_MODELS` array after `GEMINI_MODELS`:
```
const CLAUDE_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Balanced)' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
];
```

Then update the provider selection UI in AISettingsPanel to render the Claude model dropdown when `anthropic` is the active provider, and wire the `ai-provider.ts` shared edge function to handle the Anthropic provider when selected.

### 3. Update edge function AI provider abstraction

In `supabase/functions/_shared/ai-provider.ts`, add Anthropic API support so that when `provider === 'anthropic'`, requests go to `https://api.anthropic.com/v1/messages` using the `ANTHROPIC_API_KEY` secret with the appropriate message format conversion.

