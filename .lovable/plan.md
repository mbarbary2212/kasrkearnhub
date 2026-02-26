

## Plan: Reorganize Reference Materials & Rename Guided Explanations

### What You Asked
1. Merge the standalone "Summaries" sub-tab (under Documents) with uploaded Documents into one tab called something like "Doc/Sum"
2. Move this merged tab to be the **first** sub-tab in Reference Materials
3. Move "Socratic Tutorials" out of Documents and into the current "Guided Explanations" top-level tab — renaming that tab from "Guided Explanations" to **"Socratic Tutorials"**
4. Audio files can also live in the merged doc/sum tab

### Current Structure (Reference Materials)
```text
Reference Materials
├── Tables (0)
├── Exam Tips (0)
├── Images (0)
└── Documents (1)          ← nested sub-tabs:
    ├── Summaries (0)
    ├── Socratic Tutorials (0)
    └── Documents (1)      ← uploaded files
```

### Proposed Structure
```text
Socratic Tutorials         ← renamed top-level tab (was "Guided Explanations")
  └── existing guided explanations + socratic tutorials from Documents

Reference Materials
├── Documents & Summaries  ← NEW first tab (merged: uploaded docs + AI summaries + audio)
├── Tables
├── Exam Tips
└── Images
```

### Technical Changes

**1. Rename "Guided Explanations" tab → "Socratic Tutorials"** (`src/config/tabConfig.ts`)
- Change label from `'Guided Explanations'` to `'Socratic Tutorials'`
- Change icon from `MessageCircleQuestion` to `GraduationCap`

**2. Move Socratic Tutorial content into the Guided Explanations tab** (`src/pages/ChapterPage.tsx` + `src/pages/TopicDetailPage.tsx`)
- In the `guided_explanations` tab content section, add a sub-section that renders Socratic Tutorials (fetched from `resources` table where `document_subtype = 'socratic_tutorial'`) alongside existing guided explanations
- Both content types live in one tab, separated by clear headings
- Update the tab count to include socratic tutorials: `guided_explanations count = guided_explanation study_resources + socratic_tutorial resources`

**3. Merge Summaries + Documents into one "Documents & Summaries" tab** (`src/components/content/ResourcesTabContent.tsx`)
- Remove the nested 3-sub-tab structure (Summaries / Socratic Tutorials / Documents)
- Create a single flat list showing both AI-generated summaries (rendered via `RichDocumentViewer`) and uploaded documents (rendered via `ResourceList`)
- Remove the `filteredTutorials` logic from this component (tutorials move to Socratic Tutorials tab)
- Make this the **first** tab in the `STUDY_RESOURCE_TYPES` array (before Tables)

**4. Reorder sub-tabs in Reference Materials** (`src/components/content/ResourcesTabContent.tsx`)
- New order: Documents & Summaries → Tables → Exam Tips → Images
- Set `defaultValue` to the new merged tab id

**5. Update both page files** (`ChapterPage.tsx` + `TopicDetailPage.tsx`)
- Pass socratic tutorial resources into the Socratic Tutorials (formerly Guided Explanations) tab
- Update count calculations to include socratic tutorials in the `guided_explanations` count
- Remove socratic tutorials from the `reference_materials` document count

### Files to Edit
| File | Change |
|------|--------|
| `src/config/tabConfig.ts` | Rename label + icon for `guided_explanations` |
| `src/components/content/ResourcesTabContent.tsx` | Remove nested sub-tabs, merge docs+summaries, remove socratic tutorials, reorder |
| `src/pages/ChapterPage.tsx` | Add socratic tutorials to Socratic Tutorials tab, update counts |
| `src/pages/TopicDetailPage.tsx` | Same changes as ChapterPage |

### What Stays the Same
- Tab id remains `'guided_explanations'` internally (avoids breaking routes/state)
- All existing guided explanation CRUD (add, bulk upload, edit, delete) unchanged
- Reference Materials sub-tabs for Tables, Exam Tips, Images unchanged
- Audio upload button stays in the merged documents tab

