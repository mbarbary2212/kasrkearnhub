

## Add Gemini 3.1 Pro Preview and Set as Default

Your new paid-tier API key is already configured in Supabase secrets. Now the plan updates the model across the app.

### Important caveat

The model ID `gemini-3.1-pro-preview` is not a confirmed public Google model name. If generation fails with a 400/404 error after this change, you can instantly switch back to `gemini-2.5-pro` from Admin > AI Settings without needing any code changes.

### Changes

**1. `src/components/admin/AISettingsPanel.tsx`**
- Add `gemini-3.1-pro-preview` (labeled "Gemini 3.1 Pro Preview (Advanced)") to the `GEMINI_MODELS` dropdown array.

**2. `supabase/functions/_shared/ai-provider.ts`**
- Change `DEFAULT_SETTINGS.gemini_model` from `gemini-2.5-flash` to `gemini-3.1-pro-preview`.

**3. `supabase/functions/med-tutor-chat/index.ts`**
- Change the fallback model from `gemini-2.5-flash` to `gemini-3.1-pro-preview`.

**4. Database update**
- Update the `ai_settings` row where `key = 'gemini_model'` to set `value` to `gemini-3.1-pro-preview`, making it immediately active.

### Technical summary

| File | What changes |
|------|-------------|
| `AISettingsPanel.tsx` line 36-40 | Add new entry to GEMINI_MODELS array |
| `ai-provider.ts` line 24 | Change default gemini_model |
| `med-tutor-chat/index.ts` line ~72 | Change fallback model |
| Database `ai_settings` table | UPDATE value for key `gemini_model` |

