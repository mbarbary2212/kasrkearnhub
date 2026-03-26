

## Change Content Dropdown to Show Sub-Tabs

### What Changes

The header dropdown currently shows the four main sections (Resources, Interactive, Practice, Test Yourself). Instead, it should show the **sub-tabs within the active section** — and the inline sub-tab pills/mobile dropdowns should be removed from the content area.

**Examples:**
- Resources selected → dropdown shows: Videos, Flashcards, Visual Resources, Socrates, Reference Materials, Clinical Tools
- Interactive selected → dropdown shows: Cases, Pathways
- Practice selected → dropdown shows: MCQs, SBA, True/False, Short Answer, OSCE, Practical, Matching, Image Questions
- Test Yourself → no sub-tabs (stays as-is)

### File: `src/pages/ChapterPage.tsx`

**1. Update the Content Type Dropdown (lines 546-592)**
- Change the dropdown trigger to show the current **sub-tab** label and icon (e.g., "Videos" instead of "Resources")
- Change the dropdown items to list the sub-tabs of the active section using:
  - `resourcesTabs` when `activeSection === 'resources'` → sets `resourcesTab`
  - `interactiveTabs` when `activeSection === 'interactive'` → sets `interactiveTab`
  - `practiceTabs` when `activeSection === 'practice'` → sets `practiceTab`
  - For `test` section, either hide the dropdown or show a single item
- Include item counts (badges) in the dropdown items
- Use the section's theme color for the active styling

**2. Remove inline sub-tab rows from each section's content area**
- **Resources section** (lines 639-672): Remove both the mobile `MobileSectionDropdown` and desktop pill buttons
- **Interactive section** (lines 932-961): Remove both the mobile dropdown and desktop pills
- **Practice section** (lines 1035-1064): Remove both the mobile dropdown and desktop pills

This consolidates all sub-navigation into the single header dropdown, saving vertical space and simplifying the layout.

