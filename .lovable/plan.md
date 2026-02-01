
# Direct Gemini API Support - Implementation Plan

## Overview

Good news! The infrastructure for direct Gemini API support is **already largely in place**. The `_shared/ai-provider.ts` abstraction already supports both Lovable AI Gateway and direct Gemini API calls using the secure `X-goog-api-key` header.

The main work needed is:
1. Update 2 edge functions that bypass the shared abstraction
2. Ensure the `ai_settings` defaults/values are correct for Gemini

---

## Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `_shared/ai-provider.ts` | Ready | Already supports Gemini with `X-goog-api-key` header |
| `coach-chat` | Ready | Already has dual-provider streaming support |
| `generate-content-from-pdf` | Ready | Uses shared abstraction |
| `process-batch-job` | Ready | Calls `generate-content-from-pdf` |
| `approve-ai-content` | Ready | No AI calls (just database operations) |
| `generate-vp-case` | Needs Update | Hardcoded to Lovable gateway |
| `chat-with-moderation` | Needs Update | Hardcoded to Lovable gateway |

---

## Implementation Tasks

### Task 1: Update `generate-vp-case/index.ts`

This function generates Virtual Patient cases but bypasses the shared AI provider abstraction.

**Changes:**
- Import and use `getAISettings`, `getAIProvider`, `callAI` from `_shared/ai-provider.ts`
- Add Supabase client for database access (to read settings)
- Replace direct Lovable gateway call with abstracted `callAI()`

**Before:**
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...);
```

**After:**
```typescript
import { getAISettings, getAIProvider, callAI } from "../_shared/ai-provider.ts";
// Fetch settings from database
const aiSettings = await getAISettings(serviceClient);
const provider = getAIProvider(aiSettings);
const result = await callAI(SYSTEM_PROMPT, userPrompt, provider);
```

---

### Task 2: Update `chat-with-moderation/index.ts`

This function powers the MedGPT Tutor feature and also bypasses the shared abstraction.

**Changes:**
- Add Supabase client imports
- Import `getAISettings`, `getAIProvider` from `_shared/ai-provider.ts`
- Implement dual-provider streaming (similar to `coach-chat`)
- Keep OpenAI moderation API call (it's separate from the AI response generation)

**Key Notes:**
- This function uses OpenAI's moderation API (still uses `OPENAI_API_KEY`)
- Only the **chat completion** should switch to Gemini
- The moderation check stays with OpenAI

---

### Task 3: Update Default ai_settings Values (Optional)

Current database values:

| Key | Current Value | Recommended |
|-----|---------------|-------------|
| `ai_provider` | `lovable` | Keep (admin can change to `gemini`) |
| `gemini_model` | `gemini-1.5-flash` | Correct |
| `study_coach_provider` | `lovable` | Keep (independent control) |
| `study_coach_model` | `google/gemini-3-flash-preview` | Correct |

The settings are already correct. Super Admins can switch `ai_provider` and `study_coach_provider` to `gemini` in the admin panel to start using direct Gemini API.

---

## Security Checklist

All security requirements are already implemented:

| Requirement | Status | Location |
|-------------|--------|----------|
| Server-side key reading | Implemented | `Deno.env.get("GOOGLE_API_KEY")` |
| `X-goog-api-key` header | Implemented | `_shared/ai-provider.ts` line 134 |
| No key in database/frontend | Confirmed | Key only in Edge Function secrets |
| Prompt injection defense | Implemented | `_shared/security.ts` |
| Student daily limits (coach) | Implemented | `coach-chat/index.ts` |
| No limits for admins | Implemented | Role check bypasses quota |

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/generate-vp-case/index.ts` | Modify | Use shared AI provider abstraction |
| `supabase/functions/chat-with-moderation/index.ts` | Modify | Add dual-provider streaming support |

---

## Technical Details

### Provider Switching Logic

The system already supports selecting providers via `ai_settings` table:

```text
For AI Content Factory:
  - Read ai_settings.ai_provider ("lovable" or "gemini")
  - Read ai_settings.gemini_model or ai_settings.lovable_model
  - Use _shared/ai-provider.ts callAI()

For Study Coach:
  - Read ai_settings.study_coach_provider ("lovable" or "gemini")
  - Read ai_settings.study_coach_model
  - Has independent provider/model selection
```

### Gemini API Call Pattern (Already Implemented)

```typescript
const key = Deno.env.get("GOOGLE_API_KEY");
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const resp = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-goog-api-key": key!,  // Secure header-based auth
  },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    safetySettings: [...],
  }),
});
```

### Streaming Support (For Chat Functions)

For `chat-with-moderation`, I'll add streaming Gemini support similar to what's already in `coach-chat`:

```typescript
// For streaming, use ?alt=sse endpoint
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

// Transform Gemini SSE to OpenAI-compatible SSE for frontend compatibility
const transformStream = new TransformStream({
  transform(chunk, controller) {
    // Convert Gemini format to OpenAI format
  },
  flush(controller) {
    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
  },
});
```

---

## How Admins Switch to Gemini

After implementation, Super Admins can:

1. Go to **Admin Panel → AI Settings**
2. Change `ai_provider` from `lovable` to `gemini`
3. Optionally change `gemini_model` (default: `gemini-1.5-flash`)
4. For Study Coach specifically: change `study_coach_provider` to `gemini`

The system will immediately start using direct Gemini API calls with the configured `GOOGLE_API_KEY`.

---

## Summary

Most of the Gemini infrastructure is already in place. This plan focuses on updating 2 functions that hardcode the Lovable gateway, ensuring all AI features can use direct Gemini API when the admin configures it.

**Scope:**
- AI Content Factory: Uses `ai_provider` setting
- Study Coach: Uses `study_coach_provider` setting (independent)
- No usage limits for admins (already implemented)
- Student limits apply only to coach (already implemented)
