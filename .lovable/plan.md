
# Onboarding & Guidance System — IMPLEMENTED

## Three Layers

### 1. Contextual Guides (ContextGuide.tsx)
Reusable banner component placed on 9 pages:
- **Student**: Home (first 3 visits), ChapterPage Learning/Practice/Interactive sections, Progress (always), Discussions
- **Admin**: Dashboard, Inbox, Analytics/Overview

### 2. Spotlight Tour (driver.js)
- `useTour` hook with auto-start on first visit, manual replay via events
- Student tour: 6 steps (dashboard → learning → connect → coach → settings → final)
- Admin tour: 5 steps (dashboard → learning → overview → admin-panel → final)
- Uses `data-tour` attributes on sidebar and mobile nav buttons

### 3. Workflow Guide + First Login Modal
- `WorkflowGuide.tsx`: Modal with step-by-step usage guide (student: 6 steps, admin: 5 steps)
- `FirstLoginModal.tsx`: One-time welcome with "Take tour" / "Learn how to use" / "Skip"

## Entry Points
- Sidebar: "Tour" and "Guide" buttons in bottom items
- Mobile: "Take a Tour" and "How to Use" in More sheet
- Events: `kalm:start-tour` and `kalm:open-workflow` custom events

## localStorage Keys
- `kalm_tour_student_done` / `kalm_tour_admin_done`
- `kalm_first_login_student_shown` / `kalm_first_login_admin_shown`
- `kalm_workflow_student_seen` / `kalm_workflow_admin_seen`
- `kalm_home_visit_count`
- `kalm_guide_{page}_dismissed` (home, learning, practice, interactive, connect, admin_dashboard, admin_inbox, admin_analytics)

## Files Created
- `src/components/guidance/ContextGuide.tsx`
- `src/components/guidance/WorkflowGuide.tsx`
- `src/components/guidance/FirstLoginModal.tsx`
- `src/hooks/useTour.ts`
- `src/components/tour/studentTourSteps.ts`
- `src/components/tour/adminTourSteps.ts`

## Files Edited
- `src/pages/Home.tsx` — tour + context guide + first login modal + workflow
- `src/pages/AdminDashboard.tsx` — tour + context guide + first login modal + workflow
- `src/pages/ChapterPage.tsx` — context guides for learning/practice/interactive
- `src/pages/ProgressPage.tsx` — always-visible context guide
- `src/pages/DiscussionsPage.tsx` — context guide for connect
- `src/pages/AdminInboxPage.tsx` — context guide
- `src/pages/AdminOverview.tsx` — context guide
- `src/components/layout/StudentSidebar.tsx` — data-tour attrs + Tour/Guide buttons
- `src/components/layout/MobileBottomNav.tsx` — data-tour attrs + Tour/Guide in More
