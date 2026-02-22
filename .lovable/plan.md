

## Fix Auto-Tag to Work With Title-Based Matching

### The Problem

The auto-tag feature only matches content using `original_section_name` and `original_section_number` columns. Since all your existing content was uploaded **before** these columns were added, every item has `NULL` for both fields. The hook skips all items without original section info, resulting in "No unassigned content with section info found to auto-tag."

### The Solution

Update `useAutoTagSections.ts` to also use **title-based keyword matching** as a fallback when `original_section_name` is not available. This means:

1. Fetch ALL unassigned items (not just those with original section info)
2. For each item, first try matching via `original_section_name`/`original_section_number` (precise)
3. If no original section info exists, fall back to matching the item's **title/text** against section names using keyword scoring

### How Title Matching Works

For sections like "1.1 Wound healing", "1.4 Chronic wounds", "1.5 Suture materials":
- Strip the numbering prefix: "wound healing", "chronic wounds", "suture materials"
- For each unassigned item (e.g., title "Wound contraction - cells"):
  - Check if any stripped section name keywords appear in the title
  - Score by number of matching words (excluding stop words like "and", "of", "the")
  - Assign to highest-scoring section (minimum 1 keyword match)
  - On ties, prefer the section whose stripped name is a substring of the title

### Title Column Per Table

Each content table uses a different column for its "title":

| Table | Column |
|---|---|
| study_resources, lectures, resources, essays, practicals, mcq_sets, virtual_patient_cases | `title` |
| mcqs | `stem` |
| true_false_questions | `statement` |
| osce_questions | `history_text` |
| matching_questions | `instruction` |

### Technical Changes

**File: `src/hooks/useAutoTagSections.ts`**

1. Add a `TITLE_COLUMN` map so the hook knows which column to fetch for each table
2. Update the select query to also fetch the title column (e.g., `id, title, original_section_name, original_section_number`)
3. Remove the filter that skips items without original section info (lines 134-136)
4. Add a new `matchSectionByTitle` function that:
   - Strips section name prefixes (e.g., "1.1 Wound healing" becomes "wound healing")
   - Removes stop words from both section name and item title
   - Scores sections by keyword overlap with the item title
   - Returns the best matching section (minimum 1 keyword match)
5. Update the matching logic: try `original_section_name/number` first, then fall back to title matching
6. Update the progress/results to show all items attempted (not just those with original section info)

### Expected Results

With the sections "1.1 Wound healing", "1.2 Types of wounds", etc., and titles like:
- "Wound contraction - cells" matches "1.1 Wound healing" (keyword "wound")
- "Chronic wound" matches "1.4 Chronic wounds" (keywords "chronic" + "wound")
- "Suture materials" matches "1.5 Suture materials" (exact match after stripping)
- "Primary intention" matches "1.1 Wound healing" (keyword "wound" in context -- or may not match if no overlapping keywords, which is fine)

Items that don't match any section remain unassigned for manual tagging.

### Files to Modify

| File | Change |
|---|---|
| `src/hooks/useAutoTagSections.ts` | Add title column map, title-based matching fallback, fetch title in query, remove original-only filter |

