

# In-App Student-to-Admin Contact Flow

## Overview
Remove all mailto behavior, show exactly one module admin + one topic admin in the chapter header, remove sidebar admin duplication, and wire clicks to open InquiryModal targeting the specific admin.

**No database changes needed** — `inquiries.assigned_to_user_id` and `assigned_team` columns already exist.

## Files to change (7 files)

### 1. CREATE `src/components/content/ChapterAdminAvatars.tsx`
New component that:
- Fetches admins via existing `useModuleAdmins` and `useChapterAdmins` hooks
- Picks exactly one topic admin (`chapterAdmins[0]`) and one module admin (`moduleAdmins[0]`, skipping if same person as topic admin)
- Renders compact circular avatars (`h-8 w-8`) with `ring-2 ring-background`
- Hover/focus: `scale-[1.15]` with `transition-transform duration-200`
- Tooltip: admin name + role label ("Topic Lead" / "Module Lead") + "Tap to message" — no email shown
- Click calls `onContactAdmin(admin, 'module' | 'topic')` callback
- Uses `<button>` elements, not `<a>` tags

### 2. EDIT `src/components/feedback/InquiryModal.tsx`
- Add optional props: `targetAdminId?: string`, `targetAdminName?: string`, `targetRole?: string`
- When `targetAdminId` is provided, show a context line: "To: [Name] ([Role])" above the form
- Pass `assignedToUserId: targetAdminId` to the `submitInquiry` mutation
- Pass `assignedTeam: targetRole === 'module' ? 'module' : 'chapter'`

### 3. EDIT `src/hooks/useInquiries.ts`
- Add `assignedToUserId?: string` and `assignedTeam?: AssignedTeam` to the mutation data type
- Include in the insert: `assigned_to_user_id: data.assignedToUserId || null` and `assigned_team: data.assignedTeam || null`

### 4. EDIT `src/components/content/ContentAdminCard.tsx`
- Replace `<a href="mailto:...">` with `<button>` or `<div role="button">`
- Add optional prop: `onContact?: (admin: ContentAdmin) => void`
- Click calls `onContact(admin)` if provided, otherwise no-op
- Remove `Mail` icon import; use `MessageCircle` from lucide-react
- Tooltip: "Message via platform" instead of "Contact by email"
- Never render email addresses in the UI

### 5. EDIT `src/pages/ChapterPage.tsx`
- Import `ChapterAdminAvatars` and `InquiryModal`
- In the header row (around line 698, the `flex items-center gap-2` div), add `ChapterAdminAvatars` pushed right with `ml-auto`
- Add local state: `inquiryOpen`, `selectedAdmin`, `selectedAdminRole`
- `onContactAdmin` callback sets state and opens InquiryModal prefilled with moduleId, moduleName, chapterId, targetAdminId, targetAdminName, targetRole
- Render `<InquiryModal>` with these props
- Delete dead `ChapterLeadRow` function (line 1594-1599)
- Delete dead `ModuleLeadInChapter` function (line 1601-1606)

### 6. EDIT `src/pages/ModulePage.tsx`
- Add local state for InquiryModal open/close and selected admin
- Update `ModuleLeadRow` to pass `onContact` callback to `ContentAdminCard`
- On admin click, open InquiryModal prefilled with module context and `targetAdminId`
- Render `<InquiryModal>` in the component

### 7. EDIT `src/components/layout/StudentSidebar.tsx`
- Remove imports: `useModuleAdmins`, `useChapterAdmins`, `LeadAvatarStack`
- Remove the hook calls for `moduleAdmins` and `chapterAdmins`
- Remove the entire "Your Team" avatar block (lines 357-366)
- No replacement needed — admins now appear only in page headers

## Data flow
```text
Student clicks avatar → InquiryModal opens (prefilled with admin + context)
  → Student writes message → Submit
  → Insert into inquiries table with assigned_to_user_id = clicked admin
  → Edge function notifies admin
  → Admin replies via admin panel
  → Student sees reply in Connect → Messages → Questions tab (existing flow)
```

## Design
```text
Chapter header row:
┌──────────────────────────────────────────────────────┐
│ ← [Section Filter] [Content Dropdown]    (●)(●)     │
│                                          ↑    ↑     │
│                                     topic  module   │
│                                      lead   lead    │
└──────────────────────────────────────────────────────┘

Hover on avatar → 1.15x scale, tooltip shows name + role
Click → InquiryModal opens with "To: Dr. [Name] (Topic Lead)"
```

