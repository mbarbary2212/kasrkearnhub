

## Production-Grade AI Governance System

This plan implements versioned AI rules, per-admin BYOK API keys, superadmin-only controls, and usage logging -- all without breaking existing functionality.

---

### Overview

```text
+------------------------------------------+
|  SUPERADMIN ONLY                         |
|  - Global AI kill switch                 |
|  - Allow admin fallback to global key    |
|  - Cost message editor                   |
|  - AI Rules version management           |
+------------------------------------------+
|  ALL ADMINS                              |
|  - Account > My API Key (BYOK)           |
|  - Content Factory (uses own key or      |
|    falls back per policy)                |
+------------------------------------------+
|  EDGE FUNCTION                           |
|  - Check user role                       |
|  - Check personal key first              |
|  - Check fallback policy                 |
|  - Load rules: chapter > module > global |
|  - Log usage event                       |
+------------------------------------------+
```

---

### A) AI Rules System (Versioned + Scoped)

**New table: `ai_rules`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| scope | text | 'global', 'module', or 'chapter' |
| module_id | uuid nullable | FK to modules |
| chapter_id | uuid nullable | FK to module_chapters |
| content_type | text | mcq, osce, flashcard, matching, essay, clinical_case, guided_explanation, etc. |
| instructions | text | The pedagogical rules text |
| version | int | Auto-incremented per scope+content_type group |
| is_active | boolean default false | Only one active per unique combination |
| created_at | timestamptz | |
| created_by | uuid | FK to auth.users |
| notes | text nullable | Admin note for this version |

**Unique constraint**: Only ONE active rule per (scope, module_id, chapter_id, content_type) enforced via partial unique index.

**Seed data**: Current NBME guidelines from `getNbmeGuidelines()` will be inserted as version 1 global rules for each content type.

**Edge function logic update** (in `generate-content-from-pdf`):
- Load rules with precedence: chapter-level (if chapter_id provided) then module-level then global
- Concatenate active rules into the system prompt
- Append user `additional_instructions` last

**Admin UI** (in AI Settings panel):
- New "Content Rules" tab showing rules grouped by content type
- Each content type shows the active rule with an edit button
- Editing creates a new version (old version stays for rollback)
- "Activate" / "Rollback" buttons to switch between versions
- Module-scoped and chapter-scoped overrides can be added

---

### B) Per-Admin API Keys (BYOK)

**New table: `admin_api_keys`**

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid PK | FK to auth.users |
| provider | text | 'gemini' (only option for now) |
| api_key_encrypted | text | Encrypted ciphertext |
| key_hint | text | Last 4 characters for display |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| revoked_at | timestamptz nullable | Soft-revoke |

**RLS**: Users can only SELECT their own row's metadata (user_id, provider, key_hint, created_at). The encrypted key column is never returned to the client -- only the edge function with service role can read it.

**New edge function: `manage-admin-api-key`**
- POST: Encrypt the key using a server-side secret (AES-256-GCM via Web Crypto API), store ciphertext + hint
- DELETE: Set revoked_at
- GET: Return only key_hint + provider + status
- Never returns the full key

**Account Page update**:
- New "My AI API Key" card (visible only to admin roles)
- Shows current key status (hint, provider) or "No key configured"
- Input to add/replace key
- Remove key button
- If admin has no key and fallback is disabled, shows the blocking banner with the custom message from settings

---

### C) Global Platform Settings (Superadmin Only)

**New table: `ai_platform_settings`**

| Column | Type | Default |
|--------|------|---------|
| id | int PK | 1 (single row) |
| allow_superadmin_global_ai | boolean | true |
| allow_admin_fallback_to_global_key | boolean | false |
| global_key_disabled_message | text | "We are sorry, but because of increasing AI generation costs, we kindly ask you to use your own API key..." |
| updated_by | uuid | |
| updated_at | timestamptz | |

**Seeded with default row** (id=1) containing the message you specified.

**RLS**: All authenticated users can read (needed for the banner check). Only superadmins can update.

---

### D) Global Key Policy (Edge Function Logic)

The `generate-content-from-pdf` function will be updated with this decision tree:

```text
1. Validate JWT, get user role
2. If user is SUPERADMIN:
   - If allow_superadmin_global_ai = true -> use global GOOGLE_API_KEY
   - Else -> return error "Global AI disabled"
3. If user is any other ADMIN:
   - If admin has personal API key (not revoked) -> decrypt and use it
   - Else if allow_admin_fallback_to_global_key = true -> use global key
   - Else -> return { error: "GLOBAL_KEY_DISABLED", message: <custom message> }
```

The `callAI` function in `_shared/ai-provider.ts` will be extended to accept an optional `customApiKey` parameter, used instead of the env secret when provided.

---

### E) UI Behavior

**Admin > AI Settings (superadmin-only controls)**:
- New section at the top: "Global AI Policy" (hidden for non-superadmins)
  - Toggle 1: "Allow Superadmin Global AI"
  - Toggle 2: "Allow Admin Fallback to Global AI"
  - Editable cost message textarea
- Existing provider/model controls remain for everyone

**Account Page (admin banner)**:
- If the user is an admin, has no personal API key, and fallback is disabled:
  - Show a prominent alert banner with the custom message
  - Button: "Add My API Key" scrolls/opens the key input section

**Content Factory Modal**:
- Before generating, check if the user has a valid key or fallback is allowed
- If neither, show the blocking message inline and disable the generate button

---

### F) Usage Logging

**New table: `ai_usage_events`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | Who triggered generation |
| content_type | text | mcq, osce, etc. |
| tokens_input | int nullable | From API response if available |
| tokens_output | int nullable | From API response if available |
| cost_estimate | numeric nullable | Calculated from token counts |
| provider | text | 'gemini' or 'lovable' |
| key_source | text | 'personal', 'global', or 'lovable' |
| created_at | timestamptz | |

**Edge function update**: After every successful AI call, insert a usage event row. Token counts are extracted from the Gemini API response metadata (`usageMetadata`).

**Limits**: Existing max quantities remain enforced (MCQ max 50, OSCE max 20, clinical_case max 5).

---

### G) Security Requirements

- Global GOOGLE_API_KEY stays only in Supabase secrets, never exposed to client
- Personal API keys encrypted server-side with AES-256-GCM using a new `API_KEY_ENCRYPTION_SECRET` Supabase secret
- All toggle enforcement is server-side in the edge function
- All role checks performed server-side via JWT + `user_roles` table
- Strict RLS on all new tables
- `admin_api_keys` RLS: users see only their own row's non-sensitive columns
- `ai_platform_settings` RLS: all authenticated read, only superadmin write
- `ai_rules` RLS: all authenticated read, only platform_admin+ write
- `ai_usage_events` RLS: superadmins read all, admins read their own

---

### Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | 4 new tables + seed data + RLS policies |
| `supabase/functions/manage-admin-api-key/index.ts` | Encrypt/store/delete admin API keys |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AISettingsPanel.tsx` | Add Content Rules editor, Global AI Policy section (superadmin-only) |
| `src/pages/AccountPage.tsx` | Add "My AI API Key" card for admins |
| `src/components/admin/AIContentFactoryModal.tsx` | Pre-check key availability before generation |
| `supabase/functions/generate-content-from-pdf/index.ts` | Load rules from DB, implement key policy, log usage |
| `supabase/functions/_shared/ai-provider.ts` | Accept optional custom API key in `callAI` |
| `src/hooks/useAISettings.ts` | Add hooks for platform settings and admin key status |
| `supabase/config.toml` | Register new edge function |

### New Secret Required

- `API_KEY_ENCRYPTION_SECRET` -- a 32-byte random string for AES-256-GCM encryption of admin API keys

---

### What Will NOT Change

- Student-facing features (Study Coach, Tutor) continue using the global key as before
- Existing content generation workflow and chunk orchestration remain intact
- Current provider/model selection logic stays the same
- All existing data preserved
