

## Fix Coach AI awareness + restore Tour entry points

Two distinct issues. Each gets its own scoped change. Nothing else touched.

### Issue 1 — Coach AI doesn't know how the app is laid out

**What you'll see after shipping:** When a student asks "where are the MCQs?", "how do I do flashcards?", "where's my study plan?", the coach answers with the actual navigation path in KALM Hub (e.g., *"Open any chapter → Practice tab → MCQs"*). When asked an academic question with no chapter context, it still works the same as today.

**Root cause:** `supabase/functions/coach-chat/index.ts` system prompt has zero knowledge of the app's structure — it's purely a medical tutor. So app-navigation questions get vague or refused answers.

**Fix (one file):** `supabase/functions/coach-chat/index.ts`

Add an `[APP NAVIGATION KNOWLEDGE]` section to `SYSTEM_PROMPT` describing the canonical routes and where each activity type lives. Concise — under ~25 lines so it doesn't bloat token usage. Content based on the actual app:

- Dashboard `/` — Today's Plan, Continue, Daily reviews
- Coach `/progress` — Goals, Plan, Progress tabs
- Learning: Module → Chapter → Topic. Inside a chapter: tabs **Resources** (lectures, PDFs, mind maps, infographics, videos), **Interactive** (clinical cases, structured cases, virtual patient), **Practice** (MCQs, OSCE, matching, short questions, case scenarios), **Test Yourself** (chapter exam)
- Connect: Messages, Ask a Question, Feedback, Discussions `/connect/discussions`, Study Groups `/connect/groups`
- Formative `/formative` — formative assessments
- Settings `/student-settings` — Appearance, Content, Account
- Daily reviews = flashcards (Classic / Cloze / Combined, FSRS-scheduled)

Add one rule to the prompt: *"If the student asks where to find an app feature, give them the navigation path in plain language. Do not invent routes that aren't listed above."*

No other system-prompt logic changes. The grounding/PDF/RAG behavior stays identical.

### Issue 2 — Tour disappeared from sidebar/Settings; Guide is too basic

**What you'll see after shipping:**
- Sidebar **Guide** button opens a small popover with **two** choices: *"Take a tour"* (driver.js spotlight) and *"How to use KALM"* (the existing WorkflowGuide). Today it only opens the basic WorkflowGuide.
- A new **Help & Tour** card appears in `/student-settings` → **Account** tab with two buttons: *"Replay tour"* and *"Open how-to guide"*. Today the tour replay button only lives on the legacy `/account` page, which the sidebar no longer links to.
- Mobile bottom nav "Take a Tour" item now actually starts the tour (currently dispatches `kalm:start-tour` but **nothing listens** for it — silently broken).

**Root cause:** `kalm:start-tour` is dispatched in `MobileBottomNav.tsx` but no component subscribes to it. The sidebar Guide handler only fires `kalm:open-workflow` — no tour option. The tour replay UI is orphaned on `/account` (route exists but isn't linked from the new sidebar).

**Files changed (3 files, no migrations, no DB):**

| File | Change |
|---|---|
| `src/components/layout/StudentSidebar.tsx` | Wrap the Guide `NavButton` in a `Popover` with two items: *Take a tour* (dispatch `kalm:start-tour` with role) and *How to use KALM* (dispatch `kalm:open-workflow`). Keep collapsed-mode tooltip behavior. |
| `src/pages/Home.tsx` and `src/pages/AdminDashboard.tsx` | Add a `useEffect` listener for `window.addEventListener('kalm:start-tour')` that calls the existing `startTour()` from `useTour(...)`. If user is on a different page when the event fires, navigate home first then start (mirrors AccountPage's `handleReplayTutorial` pattern). |
| `src/components/settings/AccountTab.tsx` | Add a small "Help & Tour" card (matching existing Card styling) with two buttons: *Replay tour* (navigates `/` then dispatches `kalm:start-tour`) and *Open how-to guide* (dispatches `kalm:open-workflow`). |

No new components. No changes to `useTour.ts`, `studentTourSteps.ts`, `WorkflowGuide.tsx`, or `FirstLoginModal.tsx`. The legacy `/account` page is left intact — not deleted.

### Out of scope (intentionally)

- The "Something went wrong" screenshot on the `/module/.../chapter/...` route. I see no runtime error in the logs and no edge-function errors. That looks like a separate chapter-page crash, not the coach panel itself (the coach panel renders fine in screenshot 1). If you still see it after PR3 lands, send a fresh repro and I'll investigate as a focused PR — out of scope here to avoid scope creep.
- No changes to `med-tutor-chat` (legacy, unused by the coach icon).
- No prompt tuning beyond the navigation knowledge block.
- No changes to tour step targets or driver.js styling.

### Acceptance tests

**Coach awareness:**
1. Open coach icon from a chapter page → ask *"where are the MCQs?"* → answer mentions Practice tab inside the chapter.
2. Ask *"where do I find my study plan?"* → mentions Coach `/progress` → Plan tab.
3. Ask a normal medical question (e.g., *"stages of wound healing"*) → still answered as before, grounded in chapter PDF when on a chapter page.

**Tour + Guide:**
4. Click sidebar **Guide** → popover shows two options.
5. Click *Take a tour* → driver.js tour starts on the dashboard; navigates home first if needed.
6. Click *How to use KALM* → existing WorkflowGuide modal opens.
7. Open `/student-settings` → Account tab → click *Replay tour* → tour starts (after navigating home if needed).
8. Mobile bottom nav → More → *Take a Tour* → tour now starts (was silently broken).

