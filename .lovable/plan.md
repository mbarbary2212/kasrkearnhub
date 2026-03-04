

## Reorganizing Platform Settings Tab

### Current State (what's messy)

The **Platform Settings** tab currently contains a mix of unrelated concerns:
1. **Hide Empty Practice Tabs** — student-facing display toggle
2. **App Architecture** — file upload for mind map (large card with two sub-editors)
3. **Archive Legacy OSCE** — destructive content migration action
4. **Sentry Diagnostics** — monitoring/debugging
5. **Email Notifications** — admin preferences

These are all crammed into one page with no grouping logic.

### Proposed Reorganization

**Move OUT of Platform Settings:**
- **Archive Legacy OSCE** → Move to **Content → Content Integrity** tab (it's a content cleanup action, fits naturally there)
- **AI Gateway / Content Factory** — stays where it is (already in Content group), but we add a quick-link or keep it separate

**Restructure Platform Settings into two side-by-side columns:**

```text
┌──────────────────────────────────────────────────────┐
│  Platform Settings                                    │
│  Configure global platform behavior.                  │
├──────────────────────────────────────────────────────┤
│  [Hide Empty Practice Tabs]              [toggle]     │
├──────────────────────┬───────────────────────────────┤
│  App Architecture    │  Monitoring / Sentry           │
│  (compact card)      │  (compact card)                │
│  Student version     │  [Test Frontend] [Test Edge]   │
│  Admin version       │                                │
└──────────────────────┴───────────────────────────────┘
│  Email Notifications (separate card below)            │
└──────────────────────────────────────────────────────┘
```

### Changes

| File | Change |
|------|--------|
| `src/pages/AdminPage.tsx` — `PlatformSettingsTab` | Remove Archive Legacy OSCE block. Place App Architecture and Sentry Diagnostics side-by-side in a `grid grid-cols-1 md:grid-cols-2 gap-4` layout. Keep Hide Empty Practice Tabs at top, Email Notifications at bottom. |
| `src/pages/AdminPage.tsx` — Content Integrity `TabsContent` | Add the Archive Legacy OSCE card at the bottom of the Content Integrity tab (after the integrity dashboard). Only visible to super admins. |
| `src/components/admin/HomeMindMapSettings.tsx` | Make the outer card more compact — reduce padding, use smaller headers so it fits well in a half-width column. |
| `src/components/admin/SentryDiagnosticsSection.tsx` | Wrap in a Card with header to match the App Architecture card height, so they sit side-by-side cleanly. |

This gives the Platform Settings page a cleaner information hierarchy: global display settings at top, two utility panels side-by-side in the middle, and personal notification preferences at the bottom. The destructive OSCE archive action moves to where content cleanup tools logically belong.

