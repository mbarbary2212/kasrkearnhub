

## Three Issues to Fix

### 1. Add "Start Case" / Preview button for admins on the Cases admin list

**File:** `src/components/clinical-cases/ClinicalCaseAdminList.tsx` (lines 270-287)

Currently the admin card only shows "Edit Case" and a delete button. Add a "Preview Case" button (with a Play icon) that navigates to `/virtual-patient/{caseId}`, allowing admins to test/run the case just like a student would.

The button will be added alongside the existing "Edit Case" button row, either as a second row or inline.

---

### 2. Back arrow on ChapterPage — ensure it lands on the chapters list

**File:** `src/pages/ChapterPage.tsx` (line 397)

Currently navigates to `/module/${moduleId}` which defaults to the "Learning" tab (chapters list). However, if the `ModulePage` ever persists tab state or if the user perceives it as going to the "whole module page," we can make the intent explicit by navigating to `/module/${moduleId}?section=learning` — ensuring the chapters list is always shown. This requires a small update to `ModulePage` to read the `section` query param on mount.

**File:** `src/pages/ModulePage.tsx` — read `section` from URL search params to initialize `activeSection`.

---

### 3. Socratic Documents — open PDFs in-app instead of download-only

**File:** `src/components/content/SocraticDocumentCard.tsx`

Currently, clicking the download icon opens the file in a new tab for download. For PDF files, add a clickable document title/row that opens the existing `PdfViewerModal` in-app, matching the behavior of other resources in the app. The download button remains for downloading.

Changes:
- Import `PdfViewerModal` and add state for the viewer
- Make the document title clickable — if the file URL ends in `.pdf`, open the `PdfViewerModal`; otherwise open in new tab
- Add an "eye" icon button for explicit "View" action alongside download
- Keep the existing download button as-is

