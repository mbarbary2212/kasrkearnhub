

## Problem

The `CasePreviewEditorPage` renders `CasePreviewEditor` without wrapping it in `MainLayout`. Every other page in the app (Home, Admin, VirtualPatient, Chapter, etc.) wraps its content in `MainLayout`, which provides the sticky header with the logo, admin panel button, user avatar dropdown, and navigation. Without it, the editor page looks disconnected from the app — no header, no consistent navigation.

The "Back" button uses `navigate(-1)` which fails when the page is opened directly (no browser history to go back to).

## Fix

### 1. Wrap `CasePreviewEditorPage` in `MainLayout`

**File: `src/pages/CasePreviewEditorPage.tsx`**
- Import and wrap with `MainLayout`, same pattern as every other page.

### 2. Fix the Back button fallback

**File: `src/components/clinical-cases/CasePreviewEditor.tsx`**
- Change `navigate(-1)` to navigate to `/admin?tab=ai-cases` as a reliable fallback (since only admins access this page). This ensures the Back button always works even when opened directly.

These are two small, targeted changes — no structural refactoring needed.

