

# Combined Fix: 6 Changes Across 4 Files

## Changes

### 1. Question counter — remove "/15" (HistoryTakingSection.tsx)
Two locations (lines 638 and 796): change `{studentMessageCount}/{MAX_STUDENT_MESSAGES} questions` → `{studentMessageCount} questions asked`. Keep `MAX_STUDENT_MESSAGES` for the cap logic, just hide the denominator from students.

### 2. Patient diabetes denial — fix expected_behaviour fallback (patient-history-chat edge function)
Line 149: `item.expected_behaviour || 'N/A'` → when no `expected_behaviour` exists, just output the label alone without the colon-value pattern:
```
// Before: "- Diabetes mellitus confirmed: N/A"  (AI thinks patient doesn't have it)
// After:  "- Diabetes mellitus confirmed and duration noted"  (AI knows to confirm it)
```

### 3. First merged PE entry loses its label (physicalExamKeyMapper.ts)
Line 100: when a key was remapped (e.g. `abdomen_inspection` → `abdomen`), prefix the first entry's text with `**${label}:**` so it matches subsequent merged entries. Currently only the 2nd+ entries get prefixed.

### 4. PE card body overflow — add scroll (PhysicalExamSection.tsx)
Line 277: add `max-h-[280px] overflow-y-auto` to the card body div so long findings (merged inspection + palpation) are scrollable.

### 5. AI generation prompt — instruct combining exam components (generate-structured-case edge function)
Update PE schema hints (lines 393-400) to explicitly say each region's text must combine ALL examination components (inspection, palpation, auscultation, special tests) in one text block with bold sub-headings. Strengthen the IMPORTANT_NOTE accordingly.

### 6. Help & Templates — update documentation + template (HelpTemplatesTab.tsx)
- Update the abdomen example (line 699) to show combined format: `"**Inspection:** Distended... **Palpation:** Tender..."`
- Expand rule 11 (line 864) to mandate combining inspection/palpation/auscultation/special tests per region with bold sub-headings

## Files

| File | Changes |
|---|---|
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Remove `/15` denominator (2 locations) |
| `supabase/functions/patient-history-chat/index.ts` | Fix `expected_behaviour` fallback from `'N/A'` to label-only |
| `src/utils/physicalExamKeyMapper.ts` | Prefix first remapped entry with label |
| `src/components/clinical-cases/sections/PhysicalExamSection.tsx` | Add `max-h-[280px] overflow-y-auto` to card body |
| `supabase/functions/generate-structured-case/index.ts` | Strengthen PE prompt to require combined exam components |
| `src/components/admin/HelpTemplatesTab.tsx` | Update template example + expand rule 11 |

