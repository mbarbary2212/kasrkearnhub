

# Plan: Wire up Display Density, Reading Size & Flashcard Behaviour

Make the three "Coming soon" controls in **Settings → Appearance** actually work and remove the disabled state.

---

## 1. Reading Size (Small / Default / Large)

- Persist choice in `localStorage` under `kalm_font_size` as `"0.9"`, `"1"`, or `"1.1"`.
- On change, set `document.documentElement.style.setProperty('--app-font-scale', value)`.
- The variable is already consumed by `body { font-size: calc(1rem * var(--app-font-scale, 1)) }` in `index.css` — and `main.tsx` already applies it before first render. So once we write the value, everything scales.
- Headings, buttons, cards inherit `rem`, so they scale proportionally with no further CSS work.

## 2. Display Density (Comfortable / Compact)

- Persist in `localStorage` under `kalm_density_preference` as `"comfortable"` or `"compact"`.
- On change, toggle `density-compact` class on `<html>`.
- `main.tsx` already pre-applies the class on boot; `index.css` already has compact overrides for `main .card`, `space-y-6`, `space-y-4`, and headings.
- **Extension**: broaden the existing compact rules slightly so dashboard tiles, plan card, and chapter list also tighten (add a few more selectors scoped to `main`).

## 3. Flashcard Behaviour (auto-flip interval, 3–15s)

- Persist in `localStorage` under `kalm_flashcard_interval` as a number string.
- Update `useFlashcardSettings.ts` so the **default** `intervalSeconds` reads from this global preference (when no per-chapter/per-topic value has been saved yet).
- Per-session changes the student makes inside the flashcard player still override and persist per chapter/topic, exactly as today — the global setting is just the new-session default.

---

## UI changes in `AppearanceTab.tsx`

- Remove `disabled` prop and the "Coming soon" badges from all three controls.
- Wire each control's `onValueChange` to write to `localStorage` + apply the live effect.
- Read initial values from `localStorage` so the UI reflects the active state on mount.
- Add a tiny "Saved" toast on change (matches existing settings pattern).

---

## Files to modify

| File | Change |
|---|---|
| `src/components/settings/AppearanceTab.tsx` | Wire 3 controls, remove disabled state + "Coming soon" badges, persist + apply on change |
| `src/index.css` | Extend `.density-compact main ...` rules to cover dashboard tiles & plan card padding/gaps |
| `src/hooks/useFlashcardSettings.ts` | Default `intervalSeconds` reads from `kalm_flashcard_interval` (falls back to 7s) |

No new dependencies. No database changes. No edge functions. `main.tsx` already pre-applies both font-scale and density before first render, so there is **no flash** on reload.

---

## Acceptance criteria

1. Changing **Reading Size** instantly resizes app text; choice survives reload with no flash.
2. Switching to **Compact** density tightens spacing in dashboard, chapter pages, and cards; switching back restores comfortable spacing.
3. Setting a **Flashcard auto-flip interval** is used as the default for new flashcard sessions (any chapter/topic that hasn't been customised yet).
4. All three controls are enabled, "Coming soon" badges removed.
5. Settings persist per-browser via `localStorage` (no backend changes).
6. No regressions to existing per-chapter/per-topic flashcard settings — those still override the global default.

