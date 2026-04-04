# In-App Student-to-Admin Contact Flow

## What changes

### 1. New: `src/components/content/ChapterAdminAvatars.tsx`
- Fetches admins via `useModuleAdmins(moduleId)` and `useChapterAdmins(chapterId)`
- Picks exactly **one** module admin (`admins[0]`) and **one** topic admin (`admins[0]`) — deterministic, first returned by RPC
- Renders two compact circular avatars (`h-8 w-8`, shrinks to `h-6 w-6` on small screens)
- Hover: `scale-[1.15]` with `transition-transform duration-200`; mobile uses focus/active state
- Tooltip: admin name + "Module Lead" / "Topic Lead" — no email shown
- Click calls `onContactAdmin(admin, 'module'|'topic')` callback
- Props: `moduleId`, `moduleName`, `chapterId`, `chapterTitle`, `onContactAdmin`

### 2. Update: `src/pages/ChapterPage.tsx`
- Import `ChapterAdminAvatars` and `InquiryModal`
- Add `ChapterAdminAvatars` to the header row (line ~698), pushed right with `ml-auto`
- Add state: `inquiryOpen`, `selectedAdmin`, `selectedAdminRole`
- `onContactAdmin` sets state and opens `InquiryModal` prefilled with moduleId/moduleName/chapterId
- Pass `assigned_to_user_id` context so the inquiry targets the clicked admin
- Delete dead `ChapterLeadRow` and `ModuleLeadInChapter` functions (lines 1594-1606)

### 3. Update: `src/components/content/ContentAdminCard.tsx`
- Replace `<a href="mailto:...">` with `<button>` / `<div role="button">`
- Add optional prop: `onContact?: (admin: ContentAdmin) => void`
- Remove `Mail` import; use `MessageCircle` icon instead
- Tooltip: "Message via platform" (not "Contact by email")
- Never expose email in rendered UI

### 4. Update: `src/pages/ModulePage.tsx`
- Add local state for `InquiryModal` open/close
- Wire `ModuleLeadRow` → `ContentAdminCard` with `onContact` callback that opens `InquiryModal` prefilled with module context
- Render `InquiryModal` with moduleId/moduleName

### 5. Update: `src/components/layout/StudentSidebar.tsx`
- Remove `useModuleAdmins`, `useChapterAdmins` imports and hook calls
- Remove `LeadAvatarStack` import
- Remove the entire "Your Team" avatar block (lines 357-366)
- No replacement — admins are now shown in page headers only

### 6. Update: `src/components/feedback/InquiryModal.tsx`
- Add optional prop: `targetAdminId?: string`, `targetAdminName?: string`, `targetRole?: string`
- When `targetAdminId` is provided, include it as `assigned_to_user_id` in the inquiry insert
- Show a small context line: "To: Dr. [Name] (Module Lead)" when a specific admin is targeted
- The `assigned_to_user_id` column already exists in the `inquiries` table — no DB migration needed

### 7. Update: `src/hooks/useInquiries.ts`
- Accept optional `assignedToUserId` in the mutation data
- Pass it through to the insert: `assigned_to_user_id: data.assignedToUserId || null`

## No database changes needed
- `inquiries.assigned_to_user_id` already exists
- `inquiries.assigned_team` already exists
- Existing Connect reply flow (admin_replies → MessagesPanel → Questions tab) works unchanged

## Files summary

| File | Action |
|------|--------|
| `src/components/content/ChapterAdminAvatars.tsx` | Create |
| `src/pages/ChapterPage.tsx` | Edit — add avatars to header, remove dead code |
| `src/components/content/ContentAdminCard.tsx` | Edit — replace mailto with callback |
| `src/pages/ModulePage.tsx` | Edit — wire InquiryModal |
| `src/components/layout/StudentSidebar.tsx` | Edit — remove admin avatars |
| `src/components/feedback/InquiryModal.tsx` | Edit — add targeted admin support |
| `src/hooks/useInquiries.ts` | Edit — pass assignedToUserId |
