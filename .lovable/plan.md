

# Combined Plan: Fix JSON Parse Bug + Remove Lovable for Non-SuperAdmins + Default to Gemini

## Summary

Three changes combined into one:
1. Fix the `chat-with-moderation` JSON parse crash (the last unfixed edge function)
2. Remove Lovable as a provider option for all users except super_admin
3. Change defaults everywhere from Lovable to Gemini

## Changes

### 1. Admin UI — `src/components/admin/AISettingsPanel.tsx`

- Keep `AI_PROVIDERS` array with all three options (lovable, gemini, anthropic)
- Gate the Lovable option behind `isSuperAdmin` — only render it if user is super_admin
- Change the default provider fallback from `'lovable'` to `'gemini'`
- Update Provider Notes section: remove Lovable bullet for non-super-admins

### 2. Shared AI Provider — `supabase/functions/_shared/ai-provider.ts`

- Change `DEFAULT_SETTINGS.ai_provider` from `'lovable'` to `'gemini'`
- Change fallback in `getAIProvider` from `settings.lovable_model` to `settings.gemini_model`
- Change fallback in `getModelForContentType` from `settings.lovable_model` to `settings.gemini_model`
- Change fallback in `getAISettings` switch for `ai_provider` from `'lovable'` to `'gemini'`
- Keep all Lovable gateway functions intact (super_admin can still use them)

### 3. Fix `chat-with-moderation/index.ts` (line 50)

Replace the crashing `JSON.parse`:
```
const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
```
With the safe pattern:
```
let value = row.value;
if (typeof value === 'string') {
  try { value = JSON.parse(value); } catch { /* keep as-is */ }
}
```

Also change defaults in this file:
- Default provider: `'lovable'` → `'gemini'`
- Default model: `'google/gemini-3-flash-preview'` → `'gemini-3.1-pro-preview'`
- Fallback resolution: default to `'gemini'` instead of `'lovable'`

### 4. `coach-chat/index.ts`

- Default provider: `'lovable'` → `'gemini'`
- Default model: `'google/gemini-3-flash-preview'` → `'gemini-3.1-pro-preview'`
- Provider resolution fallback: `'lovable'` → `'gemini'`
- Keep the Lovable streaming code path (super_admin may select it)

### 5. `med-tutor-chat/index.ts`

- Default provider: `'lovable'` → `'gemini'`
- Default model fallback: `'google/gemini-3-flash-preview'` → `'gemini-3.1-pro-preview'`
- Provider resolution: default to `'gemini'` instead of `'lovable'`
- Keep Lovable code path intact

## What This Means

- College IT team sees only **Gemini** and **Anthropic** as provider choices
- Everything defaults to Gemini if no setting is configured
- Super_admin (you) still sees and can use Lovable if needed
- The JSON parse crash in `chat-with-moderation` is fixed
- No Lovable code is deleted — it's just hidden from non-super-admin UI and no longer the default

