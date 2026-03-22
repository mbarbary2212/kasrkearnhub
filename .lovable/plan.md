

# Teacher Role: View-Only Access with All Tabs Visible

## Problem
1. `isTeacher` is defined as a superset including admin, department_admin, platform_admin, super_admin — it should only match `role === 'teacher'`
2. Teachers currently get full `canManageContent` privileges (Add/Edit/Delete buttons). They should see all tabs (including empty ones) but with NO action buttons — identical content layout to students

## Changes

### 1. `src/hooks/useAuth.ts` — Fix `isTeacher` definition (line 317)
Change:
`isTeacher: state.role === 'teacher' || state.role === 'admin' || state.role === 'department_admin' || state.role === 'platform_admin' || state.role === 'super_admin'`
→ `isTeacher: state.role === 'teacher'`

### 2. `src/pages/ChapterPage.tsx` — Split tab visibility from content management

**a) Remove `auth.isTeacher` from `showAddControls` (line 112)** — teachers should NOT see Add buttons.

**b) Remove `auth.isTeacher` from `canManageContent` (line 126)** — teachers should NOT have edit/delete capabilities.

**c) Add a new `showAllTabs` flag (after line 129):**
```ts
const showAllTabs = canManageContent || auth.isTeacher;
```

**d) Replace `canManageContent` with `showAllTabs` in the 3 tab-filtering `useMemo` blocks (lines 372, 392, 419):**
- `if (showAllTabs) return allResourcesTabs;`
- `if (showAllTabs) return allInteractiveTabs;`
- `if (showAllTabs) return allPracticeTabs;`

This keeps all tabs visible for teachers while hiding all action buttons since `showAddControls` and `canManageContent` are both false for them.

### 3. Impact on other files using `auth.isTeacher`

Since `isTeacher` now only matches `role === 'teacher'`, the following files already have separate checks for admin roles (`isAdmin`, `isPlatformAdmin`, `isSuperAdmin`) so they remain correct:
- `AdminContentActions.tsx` — `showAddControls` has `auth.isAdmin || auth.isModuleAdmin || ...` (teacher excluded = correct)
- `McqList.tsx`, `TrueFalseList.tsx`, `MatchingQuestionList.tsx`, `ResourcesTabContent.tsx`, `StudyResourcesSection.tsx` — same pattern, teacher will be excluded from add controls (correct)
- `FlashcardsTab.tsx`, `AIMindMapCards.tsx` — `isAdmin || isTeacher` controls edit view; teacher will still see admin view here → need to **remove `isTeacher`** from `showAdminView` in `FlashcardsTab.tsx` and `canEdit` in `AIMindMapCards.tsx`
- `YearPage.tsx`, `ModuleLearningTab.tsx` — `!auth.isTeacher` guards for module/chapter assignment checks; with new definition, teacher role users who are also module admins won't bypass the check (correct behavior)
- `ClinicalCaseList.tsx` — `canSeeUnpublished` includes `isTeacher`; teachers should NOT see unpublished cases → **remove `isTeacher`** from `canSeeUnpublished`

### 4. Additional files needing `isTeacher` removal from edit/manage checks

| File | Change |
|------|--------|
| `src/components/study/FlashcardsTab.tsx` | Remove `isTeacher` from `showAdminView` check |
| `src/components/study/AIMindMapCards.tsx` | Remove `isTeacher` from `canEdit` check |
| `src/components/clinical-cases/ClinicalCaseList.tsx` | Remove `isTeacher` from `canSeeUnpublished` |

## Files Modified
| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | `isTeacher` = only `role === 'teacher'` |
| `src/pages/ChapterPage.tsx` | Add `showAllTabs` flag; remove teacher from `showAddControls` and `canManageContent`; use `showAllTabs` for tab filtering |
| `src/components/study/FlashcardsTab.tsx` | Remove `isTeacher` from admin view check |
| `src/components/study/AIMindMapCards.tsx` | Remove `isTeacher` from edit check |
| `src/components/clinical-cases/ClinicalCaseList.tsx` | Remove `isTeacher` from unpublished visibility |

