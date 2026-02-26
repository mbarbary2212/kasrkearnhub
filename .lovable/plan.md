

## Plan: Socrates Documents (No Audio) + Visual Resources Tab Styling

### Three Changes

**1. Remove audio upload from Socrates > Documents tab**

The current `AdminContentActions` with `contentType="resource"` automatically includes an `AudioUploadDialog`. Instead of using `AdminContentActions` in the Socrates Documents sub-tab, I'll add a simpler upload button that only handles document/PDF uploads (no audio). This keeps Socrates Documents purely for text-based Socratic tutorial documents.

- **Files**: `src/pages/ChapterPage.tsx`, `src/pages/TopicDetailPage.tsx`
- Replace `<AdminContentActions contentType="resource" />` in the Socrates Documents sub-tab with a dedicated document-only upload button (reusing the existing `addResource` mutation pattern but without the audio option)
- Alternatively, add a new prop `hideAudio` to `AdminContentActions` to conditionally hide the `AudioUploadDialog`

**2. Confirm: Socrates docs are separate from Reference Materials docs**

Yes, these are different content pools:
- **Socrates > Documents**: Resources with `document_subtype === 'socratic_tutorial'` (AI-generated Socratic tutorial documents stored in `resources.rich_content`)
- **Reference Materials > Documents & Summaries**: Regular uploaded documents (PDFs, links) + AI-generated summaries stored in `resources.rich_content` where `document_subtype === 'summary'`

No code change needed here, just confirming the separation is already correct.

**3. Style Visual Resources sub-tabs (Mind Maps / Infographics) with subtle colors**

Currently the Mind Maps and Infographics tabs in `VisualResourcesSection.tsx` use the default `TabsTrigger` styling which is subtle and easy to miss. I'll add distinct background colors:
- **Mind Maps**: Subtle blue tint (`bg-blue-50 text-blue-700` when active, `hover:bg-blue-50/50` when inactive)
- **Infographics**: Subtle purple/violet tint (`bg-violet-50 text-violet-700` when active, `hover:bg-violet-50/50` when inactive)

- **File**: `src/components/study/VisualResourcesSection.tsx`
- Add color properties to the `SUBTABS` array and apply conditional styling to each `TabsTrigger` based on the active state using Radix's `data-[state=active]` attribute

### Technical Detail

For the `AdminContentActions` audio removal, the cleanest approach is adding an optional `hideAudio?: boolean` prop:

```tsx
// AdminContentActions.tsx
{showAddControls && contentType === 'resource' && !hideAudio && (
  <AudioUploadDialog ... />
)}
```

This avoids duplicating upload logic and keeps the Socrates tab document-only.

### Files to Edit
| File | Change |
|------|--------|
| `src/components/admin/AdminContentActions.tsx` | Add `hideAudio` prop, conditionally hide `AudioUploadDialog` |
| `src/pages/ChapterPage.tsx` | Pass `hideAudio` to Socrates Documents `AdminContentActions` |
| `src/pages/TopicDetailPage.tsx` | Same as above |
| `src/components/study/VisualResourcesSection.tsx` | Add subtle color styling to Mind Maps and Infographics sub-tabs |

