

# Intelligent Fallback Distribution in Blueprint

## Problem

Line 31-33 of `_shared/blueprint.ts`: when no blueprint config exists, `distribution_instruction` returns `""`. All generators then give the AI zero guidance on how to weight sections — so "Introduction" gets the same volume as "Signs & Symptoms", which is clinically wrong.

## Solution

Modify `getBlueprintContext()` in `supabase/functions/_shared/blueprint.ts` to:

1. When no blueprint configs exist, **fetch the chapter's actual sections** from the `sections` table
2. Pass those section names to the AI with an explicit instruction to **evaluate each section's clinical and exam importance** and weight content generation accordingly
3. Give concrete examples of weighting logic (e.g., pathophysiology/signs/management > introduction/history)

## Single File Change

**`supabase/functions/_shared/blueprint.ts`** — Replace the early return (lines 31-33) with:

```typescript
if (error || !rawConfigs || rawConfigs.length === 0) {
  // No blueprint — fetch actual sections so AI can intelligently weight them
  let sectionList = "";
  if (chapterId) {
    const { data: sections } = await client
      .from("sections")
      .select("name, section_number")
      .eq("chapter_id", chapterId)
      .order("display_order");
    if (sections && sections.length > 0) {
      sectionList = "\n\nSections in this chapter:\n" +
        sections.map(s => `- ${s.section_number ? s.section_number + '. ' : ''}${s.name}`).join("\n");
    }
  }

  return {
    configs: [],
    distribution_instruction: `CONTENT DISTRIBUTION (no admin blueprint configured — use your own clinical judgment):
No admin-defined blueprint exists for this chapter. You MUST evaluate each section's importance and distribute items proportionally. DO NOT treat all sections equally.${sectionList}

Weighting rules:
- Core clinical sections (pathophysiology, signs & symptoms, diagnosis, management, complications) → HIGH weight, generate more items
- Moderate sections (epidemiology, risk factors, investigations, prognosis) → MEDIUM weight
- Low-yield sections (introduction, history, definitions, summary) → LOW weight, generate fewer items
- Weight toward sections most likely to appear in medical exams
- Vary difficulty: harder questions for high-weight sections, basic recall for low-weight ones`
  };
}
```

This ensures every generator — flashcards, mind maps, pathways, cases — always receives intelligent distribution guidance, whether from admin blueprint or AI clinical judgment. The section list gives the AI concrete names to reason about rather than guessing from the PDF alone.

