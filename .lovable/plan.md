
# Admin UI Improvement Plan — 6 Sessions

---

## Session 1 — Admin Navigation (Sidebar + Mobile Bottom Nav)

**Problem:** Admins have no sidebar or bottom nav. They can only reach the Admin Panel via a header button and cannot browse student content without typing URLs.

**What to build:**

1. **Extract shared nav constants** into `src/components/layout/sharedNavItems.ts` — pull `learningSubItems`, `connectSubItems`, and color maps out of `StudentSidebar.tsx` so both sidebars can reuse them.

2. **Create `AdminSidebar.tsx`** — same visual style as `StudentSidebar` (80px icon rail, glassmorphic submenus). Two sections separated by a divider:
   - **Browse** (top): Dashboard, Learning (same submenu), Connect (same submenu), Formative, Coach
   - **Admin** (bottom, purple accent): Admin Panel (`/admin`), Inbox, Analytics, Content Factory

3. **Create `AdminBottomNav.tsx`** — 5-item mobile bar: Dashboard, Learning (sheet), Admin Panel, Connect (sheet), More (Formative, Coach, Settings)

4. **Update `MainLayout.tsx`**:
   - Add `{isAdmin && <AdminSidebar />}` and `{isAdmin && <AdminBottomNav />}`
   - Apply same padding/offset logic for admins as students
   - Remove the standalone "Admin Panel" header button (now in sidebar)

**Files:** `sharedNavItems.ts` (new), `AdminSidebar.tsx` (new), `AdminBottomNav.tsx` (new), `MainLayout.tsx` (edit), `StudentSidebar.tsx` (refactor imports)

---

## Session 2 — Admin Dashboard (Home Page)

**Problem:** Admins land on the student Home page with module cards and no overview of platform health or pending items.

**What to build:**

1. **Create `AdminDashboard.tsx`** — shown at `/` when user is admin. Summary cards in a responsive grid:
   - **Users Online** (from presence context)
   - **Pending Questions** (count from `inquiries` where status = `open`)
   - **Negative Feedback** (count from `material_feedback` where status = `new`)
   - **Items Needing Review** (count from `content_review_notes` where review_status != `resolved`)
   - **New Access Requests** (count from `access_requests` where status = `pending`)

2. **Quick Actions row** — buttons/links: Go to Inbox, Content Factory, Announcements, Curriculum

3. **Recent Activity feed** — last 10 entries from `activity_logs` (admin actions) and `inquiries` (new student questions), merged and sorted by timestamp

4. **Update Home page** — conditionally render `AdminDashboard` when `isAdmin`, keep student Home unchanged

**Files:** `AdminDashboard.tsx` (new), `useAdminDashboardStats.ts` (new hook), Home page (edit conditional)

---

## Session 3 — Feedback Triage View

**Problem:** `material_feedback` data is collected but only visible as counts inside Content Analytics detail modals. No dedicated view to browse, filter, and act on feedback.

**What to build:**

1. **Create `FeedbackTriageTab.tsx`** — new sub-tab inside Content Analytics (alongside MCQ, SBA, OSCE, Matching):
   - Table columns: Material Type, Question/Item preview, Feedback Type, Student (anonymous or name), Date, Status (new/reviewed/resolved)
   - Filters: feedback_type dropdown, material_type dropdown, module/chapter selectors, status filter
   - Row actions: Mark Reviewed, Mark Resolved, Jump to Content (link to the actual question/item)

2. **Add "Feedback" sub-tab** to `QuestionAnalyticsTabs.tsx`

3. **Create `useFeedbackTriage.ts`** hook — queries `material_feedback` joined with content tables (mcqs, osce_stations, etc.) to get item previews

**Files:** `FeedbackTriageTab.tsx` (new), `useFeedbackTriage.ts` (new), `QuestionAnalyticsTabs.tsx` (edit)

---

## Session 4 — Enhanced Inbox & Q&A

**Problem:** The inbox exists but lacks priority indicators, SLA visibility, and structured triage. Student questions and admin replies work but aren't surfaced proactively.

**What to build:**

1. **Add priority badges to inbox list** — based on age: >48h unanswered = red "Overdue", >24h = yellow "Attention", else green "New"

2. **Add unread count badge** to the Messaging group card in `AdminTabsNavigation.tsx` (count of `inquiries` where status = `open`)

3. **Add "Unanswered Questions" card to Admin Dashboard** (Session 2) — top 5 oldest unanswered, with direct links to inbox

4. **Add category filter** to inbox — filter by inquiry category (content, technical, general, etc.)

**Files:** Inbox component (edit), `AdminTabsNavigation.tsx` (edit badge), `AdminDashboard.tsx` (edit)

---

## Session 5 — Content Coverage Report

**Problem:** Admins can't see which chapters have content and which are empty. No way to identify gaps (e.g., "Chapter 3 has 0 MCQs, 0 videos").

**What to build:**

1. **Create `ContentCoverageTab.tsx`** — new tab in Content group showing a table:
   - Rows: each chapter grouped by module
   - Columns: MCQs count, Flashcards count, Videos count, Cases count, OSCE count, Mind Maps count
   - Color coding: 0 = red cell, 1-5 = yellow, 5+ = green
   - Filter by module

2. **Create `useContentCoverage.ts`** hook — counts content items per chapter across all content tables

3. **Add tab to `AdminTabsNavigation.tsx`** under Content group

**Files:** `ContentCoverageTab.tsx` (new), `useContentCoverage.ts` (new), `AdminTabsNavigation.tsx` (edit), `AdminPage.tsx` (edit)

---

## Session 6 — Student Performance Overview

**Problem:** Admins have no aggregate view of how students are performing across modules. `student_chapter_metrics` data exists but is only used in individual student views.

**What to build:**

1. **Create `StudentPerformanceTab.tsx`** — new sub-tab inside Analytics:
   - Summary cards: Avg Readiness Score, Avg Accuracy, Active Students (last 7d), Completion Rate
   - Table: Module | Avg Readiness | Avg Accuracy | Students Engaged | Lowest Chapter
   - Expandable rows showing per-chapter breakdown

2. **Create `useStudentPerformanceOverview.ts`** hook — aggregates `student_chapter_metrics` by module/chapter

3. **Add as sub-tab** in Analytics alongside Content Analytics

**Files:** `StudentPerformanceTab.tsx` (new), `useStudentPerformanceOverview.ts` (new), analytics tabs (edit)

---

## Execution Order & Dependencies

```text
Session 1 (Navigation)     — standalone, no dependencies
Session 2 (Dashboard)      — benefits from Session 1 (sidebar links to dashboard)
Session 3 (Feedback Triage) — standalone, extends existing analytics
Session 4 (Inbox/Q&A)      — benefits from Session 2 (dashboard cards)
Session 5 (Coverage Report) — standalone
Session 6 (Student Perf)   — standalone
```

Sessions 1 and 2 are the highest priority — they fix the core navigation and landing experience. Sessions 3-6 can be done in any order after that.
