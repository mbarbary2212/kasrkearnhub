

## Plan: Simplify AI Provider Selection UI

### What changes
Replace the large provider card grid (with "Active" badges) with a streamlined inline selection built into the existing model dropdown row.

### Implementation (single file: `src/components/admin/AISettingsPanel.tsx`)

1. **Remove the provider card grid** (lines 217-255) — the entire `AI Provider` label, the `grid` of clickable cards, and the "Save Provider" button.

2. **Restyle the 3 model dropdowns** (lines 258-322) to act as both provider selector and model picker:
   - Each column header gets a clickable area that sets `ai_provider` to that provider (click the column to switch)
   - The active provider's column gets: a `✓` checkmark icon next to the label, a highlighted border/background color (`border-primary bg-primary/5`), and the dropdown is enabled
   - Inactive providers keep a muted style with disabled dropdown and a subtle "Click to switch" hint instead of "Switch to X provider"
   - Add the "Save Provider" button below the row (only shown when `ai_provider` is in `pendingChanges`)

3. **Keep the Provider Notes section** unchanged (lines 324-336).

