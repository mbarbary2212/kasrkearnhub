

## Add AI-Generated Socratic Tutorials & Summaries to Reference Materials

### Overview
Add two new AI-generated document types -- **Socratic Tutorials** and **Topic Summaries** -- to the Reference Materials tab. These are long-form, rich-text documents generated from uploaded PDFs via the AI Content Factory. The Documents sub-tab will be split into three sub-tabs: **Summaries**, **Socratic Tutorials**, and **Documents** (existing uploaded files).

### What the User Sees

The Reference Materials tab currently shows: Tables | Exam Tips | Images | Documents

After this change, the Documents sub-tab becomes three sub-tabs:
- **Summaries** -- AI-generated concise topic overviews
- **Socratic Tutorials** -- AI-generated narrative tutorials written in Socratic teaching style (like the uploaded DOCX example)
- **Documents** -- Existing uploaded PDF/file resources (unchanged)

Each generated document is viewable in-app as rich formatted text and downloadable.

### Database Changes

**Add a `document_subtype` column to the `resources` table:**

| Column | Type | Default | Nullable |
|---|---|---|---|
| `document_subtype` | `text` | `NULL` | Yes |
| `rich_content` | `text` | `NULL` | Yes |

- `document_subtype`: `'socratic_tutorial'`, `'summary'`, or `NULL` (for existing uploaded documents)
- `rich_content`: Stores the generated markdown/text content for in-app viewing

Existing documents are unaffected (both columns remain NULL).

### AI Content Factory Changes

**1. New content types in `AIContentFactoryModal.tsx`**

Add two new entries to `CONTENT_TYPES`:
- `socratic_tutorial`: "Socratic Tutorial" -- generates a long-form narrative tutorial document
- `topic_summary`: "Topic Summary" -- generates a concise study summary

These appear under the "resources" category and require a chapter.

**2. Edge Function: `generate-content-from-pdf/index.ts`**

Add two new content type handlers:

**`socratic_tutorial`** schema:
```text
{
  title: "string - tutorial title",
  content: "string - full tutorial in markdown format (2000-5000 words)",
  section_number: "string (optional)"
}
```

Pedagogical guidelines for Socratic tutorials:
- Write as a conversational narrative that guides the student through clinical scenarios
- Use the Socratic method: pose questions, let the student think, then reveal answers
- Include exam points (marked with warning emoji), clinical scenarios, risk factor lists
- Structure with clear numbered parts and subheadings
- Include "critical thinking questions" and "reasoning questions" throughout
- Follow the pattern from the uploaded example: scenario, question, explanation, key points

**`topic_summary`** schema:
```text
{
  title: "string - summary title",
  content: "string - structured summary in markdown (500-1500 words)",
  section_number: "string (optional)"
}
```

Both types produce a single long-form document per generation (quantity fixed to 1).

**3. Approval flow: `approve-ai-content` Edge Function**

Update to handle the new types by inserting into the `resources` table with:
- `resource_type: 'document'`
- `document_subtype: 'socratic_tutorial'` or `'summary'`
- `rich_content`: the generated markdown text

### Frontend UI Changes

**1. `src/components/content/ResourcesTabContent.tsx`**

Split the "Documents" sub-tab into three sub-tabs using nested tabs:
- **Summaries**: Filters resources where `document_subtype = 'summary'`
- **Socratic Tutorials**: Filters resources where `document_subtype = 'socratic_tutorial'`
- **Documents**: Filters resources where `document_subtype IS NULL` (existing behavior)

**2. New component: `src/components/study/SocraticTutorialViewer.tsx`**

A rich-text viewer component that:
- Renders the markdown content with proper formatting (headers, lists, tables, bold, emoji)
- Highlights exam points and clinical scenarios with styled callout boxes
- Provides a "Download as PDF" option (using browser print-to-PDF)
- Shows the document title and metadata

**3. New component: `src/components/study/TopicSummaryViewer.tsx`**

Similar viewer for summary documents -- simpler layout with clean markdown rendering.

**4. `src/components/admin/AIContentPreviewCard.tsx`**

Update to handle preview of `socratic_tutorial` and `topic_summary` content types, showing a truncated preview of the generated markdown.

**5. `src/components/admin/HelpTemplatesTab.tsx`**

No CSV template needed for these types since they are AI-generated only (not bulk uploaded).

### Generation Flow

```text
Admin opens Content Factory
  -> Selects "Socratic Tutorial" or "Topic Summary"
  -> Selects source PDF, module, chapter
  -> Quantity fixed to 1 (one document per generation)
  -> Optional: additional instructions
  -> AI generates long-form markdown content
  -> Admin previews the full document
  -> Approves -> saved to resources table
  -> Appears under Reference Materials > Socratic Tutorials (or Summaries)
```

### Files to Create

| File | Purpose |
|---|---|
| `src/components/study/SocraticTutorialViewer.tsx` | In-app viewer for Socratic tutorials |
| `src/components/study/TopicSummaryViewer.tsx` | In-app viewer for summaries |

### Files to Modify

| File | Change Summary |
|---|---|
| Database migration | Add `document_subtype` and `rich_content` columns to `resources` |
| `AIContentFactoryModal.tsx` | Add `socratic_tutorial` and `topic_summary` content types, fix quantity to 1 |
| `generate-content-from-pdf/index.ts` | Add schemas, guidelines, and validation for new types |
| `approve-ai-content/index.ts` | Handle saving new types to `resources` table |
| `ResourcesTabContent.tsx` | Split Documents into 3 sub-tabs, render viewers for each type |
| `AIContentPreviewCard.tsx` | Add preview rendering for long-form content |

### Technical Details

- Socratic tutorials use `react-markdown` (already installed) for rendering
- Download uses `window.print()` with a print-optimized layout
- Generation quantity is capped at 1 for these long-form types (they produce 2000-5000 word documents)
- The `rich_content` column stores raw markdown, keeping rendering flexible
- Existing documents (uploaded files) remain unchanged with `document_subtype = NULL`

