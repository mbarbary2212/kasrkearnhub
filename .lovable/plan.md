

## Restructure Student Global Sidebar

### Current State
The student sidebar has: Home, All Years, Study Coach, Flashcards, Achievements, Settings.
The header has a flashcard icon button.

### New Sidebar Structure

```text
Dashboard        (Home icon)        → "/" (renamed from Home)
Learning         (BookOpen icon)    → "/" with skipAutoLogin (renamed from All Years)
Connect          (MessageCircle)    → new route "/connect"
Formative        (ClipboardCheck)   → new route "/formative"
Study Coach      (GraduationCap)    → "/progress" (unchanged)
─── bottom ───
Settings         (Settings icon)    → "/student-settings" (unchanged)
```

Removed from sidebar: Flashcards, Achievements.
Removed from header: Flashcard icon button.

Flashcards widget and Achievements section will be added to the Dashboard (Home page).

### Changes by File

**1. `src/components/layout/StudentSidebar.tsx`**
- Rename "Home" → "Dashboard", "All Years" → "Learning"
- Add "Connect" (`/connect`) and "Formative" (`/formative`) nav items
- Remove Flashcards item and Achievements button
- Remove `useDueCards` import, `onBadgesOpen` prop

**2. `src/components/layout/MainLayout.tsx`**
- Remove flashcard icon button from header (lines 157-183)
- Remove `GalleryHorizontal` import and `useDueCards`/`dueCount` if only used there
- Remove `onBadgesOpen` prop from `StudentSidebar` (achievements now on dashboard)

**3. `src/pages/Home.tsx` (Dashboard)**
- Add Flashcards widget card (due count + link to `/review/flashcards`)
- Add Achievements section (trigger `HeaderBadgesPanel` or inline badge stats)
- Update subtitle text from "Select your academic year" to something dashboard-appropriate

**4. New page: `src/pages/ConnectPage.tsx`**
- Global Connect page (not module-specific)
- Shows: Messages/Announcements (global), Ask a Question, Give Feedback, Discussion Forum, Study Groups
- Reuses existing `MessagesCard`, `InquiryModal`, `FeedbackModal`, `DiscussionSection` components without requiring a moduleId
- Q&A can be added per-module later as mentioned

**5. New page: `src/pages/FormativePage.tsx`**
- Shows a module selector (dropdown or card grid) listing all modules the student has access to
- On selecting a module, renders `ModuleFormativeTab` for that module
- Uses `useModules` to fetch modules across the student's preferred year

**6. `src/App.tsx`**
- Add routes: `/connect` → `ConnectPage`, `/formative` → `FormativePage`

### What Does NOT Change
- Module-level sidebar (Dashboard/Learning/Connect/Formative/Coach inside `/module/:id`)
- Colors, fonts, design system
- Admin/teacher views
- Settings at bottom of sidebar
- Mobile bottom nav behavior

