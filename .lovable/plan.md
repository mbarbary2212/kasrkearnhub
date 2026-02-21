

## Render the API Key Guide with Proper Formatting

The detailed guide you added to the cost message is already saved in the database. The issue is that it currently displays as plain unformatted text in the admin's Account page alert. This plan improves both the display and the editing experience.

### Changes

**1. Account Page - Render the message with markdown formatting**

In `src/pages/AccountPage.tsx`, the alert that shows the `global_key_disabled_message` will be updated to use the `react-markdown` library (already installed) so that numbered lists, bold text, links, and headings render properly instead of appearing as a wall of plain text.

The alert will also be made expandable/collapsible — showing a short summary line with a "Read setup guide" toggle to expand the full formatted instructions, so it doesn't overwhelm the page.

**2. AI Settings Panel - Expand the textarea**

In `src/components/admin/AISettingsPanel.tsx`, the cost message `Textarea` rows will be increased from 3 to 12 so superadmins can comfortably view and edit the full multi-step guide.

### Technical Details

| File | Change |
|------|--------|
| `src/pages/AccountPage.tsx` | Import `ReactMarkdown`, wrap `global_key_disabled_message` in a `ReactMarkdown` component inside a collapsible section. Style with `prose` classes for proper list/heading rendering. |
| `src/components/admin/AISettingsPanel.tsx` | Change Textarea `rows={3}` to `rows={12}` for the cost message editor. |

No new dependencies needed — `react-markdown` is already installed.
