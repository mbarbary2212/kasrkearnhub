

# Make Coach and Tutor Follow Content Factory AI Provider Setting

## Problem

When you select "Gemini" in the admin AI Settings panel, only the Content Factory switches to Gemini. The Study Coach and MedGPT Tutor remain on Lovable because they read their own separate settings (`study_coach_provider` and `tutor_provider`), which are never exposed in the admin panel.

## Solution

Update both edge functions (`coach-chat` and `chat-with-moderation`) to fall back to the global `ai_provider` and model settings when no feature-specific provider is set. This way, changing the provider in the admin panel applies to all AI features automatically.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/coach-chat/index.ts` | Read `ai_provider` / `gemini_model` / `lovable_model` from ai_settings as fallbacks when `study_coach_provider` / `study_coach_model` are not explicitly set |
| `supabase/functions/chat-with-moderation/index.ts` | Same fallback logic for tutor settings |

## Technical Details

### coach-chat/index.ts -- `getCoachSettings()`

Currently reads only `study_coach_provider` and `study_coach_model`. Will be updated to also read `ai_provider`, `gemini_model`, and `lovable_model` from the same query, then apply this logic:

```text
provider = study_coach_provider ?? ai_provider ?? 'lovable'
model    = study_coach_model    ?? (provider === 'gemini' ? gemini_model : lovable_model) ?? default
```

Since the query already fetches all rows from `ai_settings`, we just need to handle the additional keys in the switch statement and apply fallback logic after the loop.

### chat-with-moderation/index.ts -- `getTutorSettings()`

Same approach: read `ai_provider`, `gemini_model`, `lovable_model` as fallbacks for `tutor_provider` and `tutor_model`.

### No Admin Panel Changes Needed

The existing AI Settings panel already lets admins choose the provider and model. The coach and tutor will now automatically follow those global settings. The feature-specific DB keys (`study_coach_provider`, `tutor_provider`) remain as optional overrides if needed in the future, but will no longer block the global setting from taking effect.

### What Changes for the User

- Admin selects "Gemini" + model in Settings panel -> Coach and Tutor both use Gemini
- Admin selects "Lovable" + model -> Coach and Tutor both use Lovable
- No new UI elements needed

