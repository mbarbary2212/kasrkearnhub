

# Onboarding Upgrade — Content-Focused Tour & Micro-Guidance

## What's Changing

The student tour currently highlights **sidebar navigation items**. This upgrade shifts it to highlight **dashboard content areas** — the actual working elements students interact with. Additionally, micro-guidance helper text is added inline, context guide copy is made more actionable, and the workflow guide is rewritten for daily use.

---

## Part 1 — Rewrite Student Tour Steps

**File: `src/components/tour/studentTourSteps.ts`**

Replace all sidebar-targeting steps with 5 content-focused steps in behavioral order (Resume → Review → Prioritize → Follow path → Explore):

| Step | Selector | Title | Description |
|------|----------|-------|-------------|
| 1 | `[data-tour="continue-card"]` | Continue | "Start here. This takes you back to exactly where you left off." |
| 2 | `[data-tour="flashcards-due"]` | Daily reviews | "Complete these first to keep knowledge fresh and maintain retention." |
| 3 | `[data-tour="today-plan"]` | Today's priorities | "This shows what deserves your attention today." |
| 4 | `[data-tour="study-plan"]` | Study path | "Follow this step by step to stay organized." |
| 5 | `[data-tour="modules"]` | Modules | "Use this to explore topics or revise specific areas." |
| 6 | (no element) | You're ready | "Start with your reviews, then follow today's plan." |

All steps use `side: 'bottom'` for content elements. Missing elements are skipped; minimum 2 valid steps required to run (already handled by `useTour.ts`).

---

## Part 2 — Add `data-tour` Selectors to Home.tsx

**File: `src/pages/Home.tsx`**

Add attributes to these existing elements:

| Element | Line area | Attribute | Notes |
|---------|-----------|-----------|-------|
| Continue card wrapper `<div>` | ~358 | `data-tour="continue-card"` | The rounded-xl border div |
| Flashcards Card | ~571 (due) / ~593 (caught up) | `data-tour="flashcards-due"` | On the Card element |
| ClassificationDashboard Card | ~554 | `data-tour="today-plan"` | **This is the Intelligence panel** containing "Today's Plan", "Needs Attention", "Improve" — the actual daily priorities area |
| Today's Study Plan wrapper `<div>` | ~614 | `data-tour="study-plan"` | The `space-y-2` div containing suggestions |
| Modules `<section>` | ~382 | `data-tour="modules"` | The section containing year selector + module grid |

**`data-tour="today-plan"` target**: The `ClassificationDashboard` Card (line 554) — this is the panel users see as their daily priorities dashboard. It contains "Today's Plan", "Needs Attention", and "Improve" sections, making it the most intuitive "daily priorities" element.

---

## Part 3 — Add Micro-Guidance Helper Text

**File: `src/pages/Home.tsx`**

Add subtle `<p className="text-[10px] text-muted-foreground">` lines near key elements:

| Element | Helper text | Placement |
|---------|------------|-----------|
| Continue card | "Pick up exactly where you left off" | Below the "Continue where you left off" label (line ~369) |
| Flashcards widget | "Daily review to keep knowledge fresh" | Below "X cards due today" text (line ~583) |
| ClassificationDashboard | "Your daily priorities" | As a subtle subtitle above the component |
| Today's Study Plan heading | "Follow this step by step to stay organized" | Below the "Today's Study Plan" heading (line ~616) |
| Modules heading | "Explore topics or revise specific areas" | Below "Your Modules" heading (line ~385) |

These use existing muted styling — no new components.

---

## Part 4 — Update Context Guide Copy

**File: `src/pages/Home.tsx`** (line ~266)
- Title: `"Start here"`
- Description: `"Resume where you left off, then follow today's plan to stay on track."`

**File: `src/pages/ChapterPage.tsx`** — update existing ContextGuide instances:
- Practice: Description → `"Use questions here to identify weak areas before moving forward."`
- Interactive: Description → `"Work through clinical cases to practice real decision-making."`

**File: `src/pages/ProgressPage.tsx`**
- Title: `"Track your performance"`
- Description: `"Focus on weak areas and maintain your strengths."`

**File: `src/pages/DiscussionsPage.tsx`**
- Title: `"Get help when needed"`
- Description: `"Ask questions or contact your module lead if you're stuck."`

**Admin pages** — tighten copy:
- AdminDashboard: `"Monitor activity and act where needed."`
- AdminInboxPage: `"Respond to student questions promptly."`
- AdminOverview: `"Use insights to improve content quality."`

---

## Part 5 — Rewrite Workflow Guide

**File: `src/components/guidance/WorkflowGuide.tsx`**

Student title: `"How to use KALM daily"`

| # | Title | Description |
|---|-------|-------------|
| 1 | Start here | "Resume from where you left off using the continue card." |
| 2 | Complete your reviews | "Do your flashcards first to maintain retention." |
| 3 | Follow today's priorities | "Use the suggested tasks instead of choosing randomly." |
| 4 | Practice | "Test your understanding and identify weak areas." |
| 5 | Go deeper when needed | "Use modules to explore topics more thoroughly." |
| 6 | Ask for help | "Use Connect when something is unclear." |

Admin steps: keep current content (already good).

---

## Part 6 — "Today's Plan" vs "Study Plan" Distinction

Consistent language everywhere:
- **ClassificationDashboard** = "Your daily priorities" (what needs attention)
- **Today's Study Plan** = "Your step-by-step learning path" (actionable tasks)

No overlapping wording like "structured" or "your plan" used for both.

---

## Files Summary

| Action | File |
|--------|------|
| Rewrite | `src/components/tour/studentTourSteps.ts` |
| Edit | `src/pages/Home.tsx` (selectors + micro-guidance + context guide copy) |
| Edit | `src/components/guidance/WorkflowGuide.tsx` (student steps) |
| Edit | `src/pages/ChapterPage.tsx` (context guide copy) |
| Edit | `src/pages/ProgressPage.tsx` (context guide copy) |
| Edit | `src/pages/DiscussionsPage.tsx` (context guide copy) |
| Edit | `src/pages/AdminDashboard.tsx` (context guide copy) |
| Edit | `src/pages/AdminInboxPage.tsx` (context guide copy) |
| Edit | `src/pages/AdminOverview.tsx` (context guide copy) |

Admin tour (`adminTourSteps.ts`) unchanged. No new dependencies. No new components.

