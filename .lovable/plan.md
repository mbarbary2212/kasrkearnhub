

## Plan: History Taking Editor Enhancements

### What the user wants
1. **Add/delete checklist categories** (currently can only add/delete items within categories, not categories themselves)
2. **Add/delete comprehension questions** (already works — confirm)
3. **Add an Arabic reference paragraph** — a single free-text Arabic paragraph stored on the history section, used as a reference during voice/chat conversations (not per-topic, just one block)

### Changes

#### 1. Type update — `src/types/structuredCase.ts`
Add `arabic_reference?: string` to `HistorySectionData` interface (line 109). This stores a single Arabic paragraph the AI can use as conversation reference.

#### 2. History Editor enhancements — `CasePreviewEditor.tsx` (lines 673–806)

**a) Add/delete checklist categories:**
- Add a "＋ Add category" button after the categories list (after line 745)
- Add an ✕ delete button on each category header row (line 716-724 area)
- New helper: `addCategory()` pushes `{ key: 'cat_${Date.now()}', label: 'New Category', items: [] }`
- New helper: `removeCategory(catIdx)` splices the category

**b) Arabic reference textarea:**
- Add a new section after the Mode badge (after line 698) with label "Arabic Reference (للمحادثة)"
- Single `<Textarea>` bound to `data.arabic_reference`
- Placeholder: "أدخل النص العربي المرجعي للمحادثة هنا..."
- Set `dir="rtl"` for proper Arabic text direction

#### 3. Wire Arabic reference into conversation — `HistoryTakingSection.tsx`
- When building the system prompt for voice/chat mode, append the `arabic_reference` text if present, so the AI patient uses it as context for Arabic responses

### Files

| File | Change |
|------|--------|
| `src/types/structuredCase.ts` | Add `arabic_reference?: string` to `HistorySectionData` |
| `src/components/clinical-cases/CasePreviewEditor.tsx` | Add category CRUD + Arabic textarea to `HistoryEditor` |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Pass `arabic_reference` into AI conversation prompt |

