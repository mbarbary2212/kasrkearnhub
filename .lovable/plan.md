

# Fix: Bulk Insert Mutation Drops Concept Fields

## Root Cause

The `useBulkCreateStudyResources` mutation in `src/hooks/useStudyResources.ts` (lines 425-436) explicitly maps each field into the insert payload. It includes `section_id` but **omits** `concept_id`, `concept_auto_assigned`, and `concept_ai_confidence`. This means:

- The upload modal correctly resolves and passes these fields
- The preview table correctly shows them
- But they are silently dropped right before the Supabase `.insert()` call

## Fix

### File: `src/hooks/useStudyResources.ts` (lines 425-436)

Add the three missing concept fields to the `resourcesWithUser` mapping:

```typescript
const resourcesWithUser = resources.map((r) => ({
  module_id: r.module_id,
  chapter_id: r.chapter_id || null,
  topic_id: r.topic_id || null,
  resource_type: r.resource_type,
  title: r.title,
  content: r.content,
  display_order: r.display_order,
  section_id: r.section_id || null,
  concept_id: r.concept_id || null,                       // ADD
  concept_auto_assigned: r.concept_auto_assigned ?? null,  // ADD
  concept_ai_confidence: r.concept_ai_confidence ?? null,  // ADD
  created_by: userData.user?.id,
  folder: r.folder,
}));
```

That is the **only** change needed. No other files require modification -- the upload modal, preview, type definitions, and export are all already correct.

## What Was Stripping the Fields

The explicit field-by-field mapping in lines 425-436 acted as an allowlist. Since `concept_id`, `concept_auto_assigned`, and `concept_ai_confidence` were never listed, they were dropped before reaching Supabase, even though the `StudyResourceInsert` type and calling code included them.
