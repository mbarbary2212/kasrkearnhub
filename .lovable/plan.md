

# Revised Plan v3: Model Lifecycle + Tidy Settings (with your corrections)

Three corrections applied:
1. **Home Mind Map** has internal choices → keep its own card, not a switch
2. **Examiner Avatars** belong with the interactive case AI controls → move to AI & Models section
3. **Auto-tag content** is an action button (run-on-demand), not a toggle → keep as its own card
4. **Restore the 5-section sub-nav** from my earlier plan (Student / Curriculum / AI / Diagnostics / Notifications)

---

## Part 1 — Model Lifecycle Improvements (`ManageModelsPanel`)

Unchanged.

- **Set as default** — inline link per row; clears `is_default` on other models of the same provider, sets it here
- **Replace model** — dialog picks a replacement from same provider; rewrites every `ai_settings` row pointing at the old `model_id` (covers `case_authoring_model`, `marking_model`, `interactive_case_model`, `interactive_case_marking_model`, plus per-content-type JSON map); old model auto-deactivates
- **Edit existing model** — pencil icon reopens the Add dialog pre-filled
- **Inactive (N) sub-group** — collapsible per provider, hidden from active dropdowns

No DB migration. `ai_model_catalog` already has every column.

---

## Part 2 — Settings Tab Restructure

### Layout
Left rail (desktop) / horizontal chip row (mobile) with 5 sections, URL-synced via `?tab=settings&section=...`. Default opens to **Student Experience**.

```text
Settings
├── 🎓 Student Experience
│     ├─ [Switch] Hide empty practice tabs
│     ├─ [Switch] Show platform disclaimer on login
│     ├─ [Switch] Allow students to pin modules
│     └─ [Card]   Home Page Mind Map        ← keeps full card (internal choices)
│
├── 🧱 Curriculum Structure
│     ├─ [Switch] Merge surgery modules in student view   (super admin)
│     └─ [Card]   Auto-tag content with AI sections       (super admin, action button)
│
├── 🤖 AI & Models
│     ├─ [Card]   Manage AI Models          (Part 1 — full CRUD + Replace)
│     ├─ [Card]   Provider routing          (per-content-type, marking, live playback)
│     ├─ [Card]   Examiner Avatars          ← moved here (interactive case asset)
│     └─ [Card]   TTS / STT voices
│
├── 🩺 Diagnostics                          (super admin)
│     └─ [Card]   Sentry & Error Reporting  (the 5 test buttons + status)
│
└── 📧 My Notifications
      └─ [Card]   Email Notification Preferences
```

### Switch vs Card rules
- **Switch row** (compact, inline, saves on toggle) → only for pure boolean settings with no extra config: Hide Empty Tabs, Disclaimer, Module Pin, Merge Surgery
- **Card** → anything with internal choices, action buttons, or sub-config: Home Mind Map, Auto-Tag (action), Examiner Avatars, all AI panels, Sentry tests, Email prefs

### URL behaviour
- `?tab=settings` → opens Student Experience
- `?tab=settings&section=ai-models` → deep-links to AI & Models
- Sentry test deep-link → `?tab=settings&section=diagnostics`

---

## Files to modify

| File | Change |
|---|---|
| `src/components/admin/PlatformSettingsTab.tsx` | Replace flat list with sub-nav layout + section router (URL-synced) |
| `src/components/admin/settings-sections/StudentExperienceSection.tsx` (new) | 3 inline switches + HomeMindMapSettings card |
| `src/components/admin/settings-sections/CurriculumSection.tsx` (new) | Merge Surgery switch + SystemAutoTagCard (super admin gating) |
| `src/components/admin/settings-sections/AIAndModelsSection.tsx` (new) | ManageModelsPanel + AISettingsPanel + ExaminerAvatarsCard |
| `src/components/admin/settings-sections/DiagnosticsSection.tsx` (new) | SentryDiagnosticsSection |
| `src/components/admin/settings-sections/NotificationsSection.tsx` (new) | EmailNotificationPreferences |
| `src/components/admin/ManageModelsPanel.tsx` | Add Set-default, Edit, Replace, Inactive sub-group |
| `src/hooks/useAIModelCatalog.ts` | Add `useSetDefaultAIModel` + `useReplaceAIModel` mutations |

No database migration. No edge function changes. No student-facing changes.

---

## Acceptance criteria

1. Settings tab shows 5-section sub-nav; default opens Student Experience.
2. Booleans without sub-config render as inline switches; everything with depth keeps its card.
3. Home Mind Map stays a full card (its dropdown choices preserved).
4. Examiner Avatars now lives under AI & Models alongside interactive-case AI controls.
5. Auto-Tag stays an action card under Curriculum (not a toggle).
6. Manage AI Models supports add / edit / deactivate / delete / **set default** / **replace with auto-migration**; inactive models tucked away.
7. Sentry tests still fire from Diagnostics section.
8. Deep links like `?tab=settings&section=diagnostics` work.
9. Super-admin gating preserved (Merge Surgery, Auto-Tag, Diagnostics).
10. No regression on any existing toggle, hook, or edge function.

