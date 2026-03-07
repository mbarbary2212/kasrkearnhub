

## Issues and Requested Changes

### 1. AI Cases Tab Shows "0 cases" — Module Dropdown Broken
The `useAICasesInScope` hook fetches cases but only selects `id, title, level, module_id, topic_id`. The module dropdown in `AICasesAdminTab` extracts module IDs from cases but has no module **names** — it shows truncated UUIDs (`m.id.substring(0, 8)...`). The dropdown needs to show actual module names. Additionally, for super/platform admins, the module list should come from the `modules` state already loaded in `AdminPage`, not be derived from cases (which may return 0 if no cases exist yet).

**Fix:** Pass `modules` prop from `ContentAnalyticsTab` → `AICasesAdminTab`. Use those modules for the dropdown. Add chapter/topic filter as a second dropdown (fetched based on selected module).

### 2. Move "Batch Generate" from PDF Library to Content Factory
The "Batch Generate" button currently lives inside `PDFLibraryTab`. The user wants it grouped with the batch jobs list inside the Content Factory tab.

**Fix:**
- Remove "Batch Generate" button from `PDFLibraryTab`
- Move the batch generation dialog/modal trigger into the Content Factory tab (`AdminPage.tsx` ai-settings section), alongside `AISettingsPanel` and `AIBatchJobsList`

### 3. Add "AI Rules" Tab Inside Content Factory
The AI rules management UI exists inside `AISettingsPanel` but the user wants it as a separate visible tab. Restructure Content Factory into inner tabs:
- **Settings** — AI provider, model selection, toggles (current `AISettingsPanel`)
- **Batch Generation & Jobs** — batch generate trigger + `AIBatchJobsList`
- **AI Rules** — dedicated tab for AI rules management (extract from `AISettingsPanel`)

### Summary of Changes

| File | Change |
|------|--------|
| `AICasesAdminTab.tsx` | Accept `modules` prop, use for dropdown with names; add chapter/topic filter |
| `ContentAnalyticsTab.tsx` | Pass `modules` prop through to `AICasesAdminTab` |
| `PDFLibraryTab.tsx` | Remove "Batch Generate" button and related dialog |
| `AdminPage.tsx` | Restructure ai-settings TabsContent into inner tabs (Settings, Batch Generation, AI Rules) |
| `AISettingsPanel.tsx` | Extract AI Rules section into a standalone component |
| New: `AIRulesTab.tsx` | Standalone AI Rules management component |
| `useAICaseAdmin.ts` | Update `useAICasesInScope` — no changes needed if modules passed as prop |

