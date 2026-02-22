

## AI-Powered Section Auto-Tagging

### The Problem

The current auto-tag uses simple keyword matching between content titles and section names. This fails for content like "Primary intention healing" which should belong to "Wound healing" but shares no keywords, or "Femoral triangle boundaries" which belongs to "Lower limb anatomy" but has no word overlap.

### The Solution

Create an edge function that sends unmatched content items + section names to the AI, which returns the best section assignment for each item. The frontend calls this after the keyword-based pass fails to match some items.

### How It Works

```text
User clicks "Auto-Tag Content to Sections"
        |
        v
Step 1: Keyword matching (existing logic, instant)
        |
        v
Step 2: AI matching (only for items NOT matched in Step 1)
        |
        v
   Edge function batches unmatched items (up to 50 per call)
   and sends them with section names to the AI
        |
        v
   AI returns: { "item_id": "section_id", ... }
        |
        v
   Database updated with AI assignments
```

### Edge Function: `ai-auto-tag-sections`

**Input:** A list of unmatched items (id + title/text) and available sections (id + name).

**AI Prompt Strategy:** Use tool calling to get structured output. The AI receives:
- The list of section names with IDs
- Batches of content titles with IDs
- Instructions to assign each item to the most relevant section based on medical/academic topic relevance, or mark it as "unmatched" if no section fits

**Model:** Uses the project's configured AI provider (via `ai-provider.ts` shared module), defaulting to `google/gemini-3-flash-preview` for speed.

**Batching:** Items are sent in batches of 50 to avoid token limits. Each batch is a single AI call.

### Frontend Changes

**`useAutoTagSections.ts`:**
1. After the keyword matching pass, collect all still-unmatched items across all tables
2. If unmatched items exist, call the new `ai-auto-tag-sections` edge function
3. Update the database with AI-returned assignments
4. Show progress: "AI analyzing 23 remaining items..."

**`SectionsManager.tsx`:**
- Update the button label during AI phase: "AI analyzing remaining items..."
- Update the results toast to show keyword-matched vs AI-matched counts

### Safety and Cost Controls

- AI is only called for items that keyword matching could not resolve (minimizes API usage)
- Maximum 200 items per auto-tag run (to prevent runaway costs)
- If the AI provider is disabled or fails, the feature gracefully falls back to keyword-only results
- Each AI call is logged via `logAIUsage`

### Technical Details

**Edge function: `supabase/functions/ai-auto-tag-sections/index.ts`**

Accepts:
```json
{
  "items": [
    { "id": "uuid", "title": "Primary intention healing", "table": "study_resources" },
    ...
  ],
  "sections": [
    { "id": "uuid", "name": "1.1 Wound healing" },
    { "id": "uuid", "name": "1.2 Types of wounds" },
    ...
  ]
}
```

Returns:
```json
{
  "assignments": {
    "item-uuid-1": "section-uuid-3",
    "item-uuid-2": "section-uuid-1",
    "item-uuid-3": null
  }
}
```

Uses tool calling for structured output with the `callAI` function from the shared AI provider, plus a tool definition that enforces the response schema.

**System prompt (medical-context aware):**
"You are a curriculum organizer for a medical education platform. Given a list of section names and content titles, assign each content item to the most relevant section. Consider medical topic relationships, synonyms, and hierarchical concepts. If no section is a reasonable match, return null for that item."

### Files to Create/Modify

| File | Change |
|---|---|
| `supabase/functions/ai-auto-tag-sections/index.ts` | New edge function for AI-based section matching |
| `supabase/config.toml` | Register the new function with `verify_jwt = false` |
| `src/hooks/useAutoTagSections.ts` | Add AI fallback pass after keyword matching; collect unmatched items; call edge function; apply results |
| `src/components/sections/SectionsManager.tsx` | Update progress text and toast to distinguish keyword vs AI matches |

### Cost Estimate

- Each batch of 50 items = ~1 AI call using `gemini-3-flash-preview` (fast + cheap)
- A typical chapter with 100 unmatched items = 2 AI calls
- Only triggered manually by admin (not automatic)

