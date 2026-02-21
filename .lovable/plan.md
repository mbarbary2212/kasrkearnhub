

## Auto-Select AI Model by Content Type

Instead of manually switching models, the system will automatically pick the best model for each content type based on a configurable mapping stored in the database.

### How It Works

- A new `ai_settings` row called `content_type_model_overrides` stores a JSON mapping like:
  ```
  {
    "mcq": "gemini-2.5-flash",
    "flashcard": "gemini-2.5-flash",
    "osce": "gemini-3.1-pro-preview",
    "clinical_case": "gemini-3.1-pro-preview",
    "essay": "gemini-2.5-flash",
    "matching": "gemini-2.5-flash",
    "guided_explanation": "gemini-3.1-pro-preview",
    "virtual_patient": "gemini-3.1-pro-preview",
    "mind_map": "gemini-2.5-flash",
    "worked_case": "gemini-2.5-flash",
    "case_scenario": "gemini-3.1-pro-preview"
  }
  ```
- When generating content, the edge function checks this mapping for the current content type. If a match exists, it overrides the global model. Otherwise, it falls back to the global default.
- The Admin AI Settings panel gets a new "Model per Content Type" section showing each content type with a dropdown to pick its model (or "Use Default").

### Changes

**1. Add more Gemini models to dropdowns** (`src/components/admin/AISettingsPanel.tsx`)
- Add `gemini-3-flash-preview` and `gemini-2.5-flash-lite` to the `GEMINI_MODELS` array (these are valid direct Google API model IDs).

**2. New database setting** (migration)
- Insert a new row into `ai_settings` with key `content_type_model_overrides` and the default JSON mapping above.

**3. Update AI provider abstraction** (`supabase/functions/_shared/ai-provider.ts`)
- Add a new function `getModelForContentType(settings, contentType)` that reads the overrides and returns the appropriate model, falling back to the global default.
- Export this function.

**4. Use per-content-type model in generation** (`supabase/functions/generate-content-from-pdf/index.ts`)
- After resolving the AI provider, call `getModelForContentType(aiSettings, content_type)` to override `aiProvider.model` with the content-type-specific model.

**5. Admin UI for per-content-type model mapping** (`src/components/admin/AISettingsPanel.tsx`)
- Add a new card/section "Model per Content Type" below the existing model dropdowns.
- For each content type, show a dropdown with all available models (from the active provider) plus a "Use Global Default" option.
- Changes save to the `content_type_model_overrides` setting.

### Default Model Assignments

| Content Type | Default Model | Reason |
|---|---|---|
| MCQ | gemini-2.5-flash | Speed -- simple structured output |
| Flashcard | gemini-2.5-flash | Speed |
| Essay | gemini-2.5-flash | Speed |
| Matching | gemini-2.5-flash | Speed |
| Mind Map | gemini-2.5-flash | Speed |
| Worked Case | gemini-2.5-flash | Speed |
| OSCE | gemini-3.1-pro-preview | Complex clinical reasoning |
| Clinical Case | gemini-3.1-pro-preview | Multi-stage clinical logic |
| Virtual Patient | gemini-3.1-pro-preview | Complex multi-stage |
| Guided Explanation | gemini-3.1-pro-preview | Socratic reasoning |
| Case Scenario | gemini-3.1-pro-preview | Clinical reasoning |

### Technical Summary

| File | Change |
|---|---|
| `AISettingsPanel.tsx` | Add gemini-3-flash-preview, gemini-2.5-flash-lite to GEMINI_MODELS; add per-content-type model mapping UI section |
| `ai-provider.ts` | Add `getModelForContentType()` function |
| `generate-content-from-pdf/index.ts` | Override `aiProvider.model` based on content type |
| Database migration | Insert `content_type_model_overrides` row in `ai_settings` |
| `useAISettings.ts` | No changes needed -- existing hooks already handle the new key generically |

