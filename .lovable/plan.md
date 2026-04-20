

## Make AI model lists future-proof (no more code edits when providers release new models)

### How it works today

Model dropdowns in `AISettingsPanel.tsx` are hardcoded:
- `LOVABLE_MODELS` (4 entries)
- `GEMINI_MODELS` (5 entries)
- `CLAUDE_MODELS` (only 2 — already outdated)

When Anthropic ships Claude 4.5 or Google ships Gemini 2.6, **nothing in the app picks it up**. You need a code change. That's why your Claude list is stale.

Saved values are just strings, so once a model name is in the dropdown, the rest of the system handles it fine. The only friction is *getting the new name into the dropdown*.

### Recommended approach: hybrid — curated defaults + free-text override

Pick this because it keeps the safe defaults (so admins don't accidentally type bad model names) but lets you adopt a new model **the same day it ships**, without waiting for a code release.

#### What changes

**1. Move the model lists out of code, into the database**

New table `ai_model_catalog`:

| column | type | example |
|---|---|---|
| `id` | uuid | — |
| `provider` | text | `'anthropic'` |
| `model_id` | text | `'claude-sonnet-4-5-20250929'` |
| `label` | text | `'Claude Sonnet 4.5 (Latest)'` |
| `is_default` | bool | false |
| `is_active` | bool | true |
| `sort_order` | int | 10 |
| `notes` | text | `'Released Sept 2025, supports PDFs'` |
| `created_at` | timestamptz | — |

Seeded with the current curated lists for `lovable`, `gemini`, `anthropic`. Super-admin only RLS.

**2. Admin UI: replace hardcoded arrays with a query**

`AISettingsPanel.tsx` reads dropdown options from `ai_model_catalog` filtered by current provider. Adding a new model = inserting one row, no deploy needed.

**3. Add a small "Manage Models" sub-panel** (super-admin only)

Inside the AI settings page. Lets you:
- Add a new model: pick provider, paste model id (e.g. `claude-sonnet-4-5-20250929`), give it a label
- Toggle a model active/inactive (so you can hide deprecated ones without deleting)
- Reorder
- Mark one as the recommended default per provider

**4. Add a "Custom model" free-text option in the main dropdown**

For ultra-fresh adoption: pick "Custom…" → paste model id → save. The string goes straight into `ai_settings.gemini_model` (or `anthropic_model`). Useful when you want to try a new model for one day before adding it to the catalog formally.

**5. Optional but recommended: a "Test connection" button**

Next to the model dropdown. Sends a 1-token "ping" to the configured provider+model and shows ✓ or the actual upstream error. Catches typos like `claude-sonnett-5` instantly instead of finding out later when the Coach silently fails.

### What I will NOT do

- **No auto-fetching from Anthropic/Google's `GET /models` endpoints.** Their feeds include embeddings, vision-only, deprecated, and fine-tuned variants — surfacing all of them in your admin dropdown would be noise and a footgun. Curation by you is more reliable. (We can revisit if you want it later.)
- **No automatic model swap.** Even if Anthropic releases a new model, your saved selection stays put. You decide when to switch.

### Files affected

| File | Change |
|---|---|
| New migration | Create `ai_model_catalog` table + RLS + seed rows from current hardcoded lists |
| `src/components/admin/AISettingsPanel.tsx` | Remove hardcoded `LOVABLE_MODELS`/`GEMINI_MODELS`/`CLAUDE_MODELS`; read from new table; add "Custom…" option |
| `src/components/admin/ManageModelsPanel.tsx` (new) | CRUD UI for catalog: add/edit/toggle/reorder rows |
| `src/hooks/useAIModelCatalog.ts` (new) | Query + mutation hooks for the catalog |
| `supabase/functions/test-ai-connection/index.ts` (new, optional) | One-shot ping using current provider+model, returns ✓ or upstream error |

### Acceptance criteria

1. Open admin AI settings → see all current models in the dropdowns (matches today's behavior).
2. Click "Manage Models" → add `claude-sonnet-4-5-20250929` with label `Claude Sonnet 4.5` → save.
3. Refresh provider dropdown → new model appears immediately.
4. Switch active model to it → save → reload → still selected.
5. Pick "Custom…" → type any model id → save → it persists and is used by edge functions.
6. (Optional) "Test connection" button reports success or shows the exact provider error.

### One question before I build it

Do you want the **"Test connection" ping button** included in this round, or skip it to keep the change minimal? It costs ~1 token per click and catches typos immediately, but it's ~30 minutes of extra work and a new edge function. My recommendation: include it.

