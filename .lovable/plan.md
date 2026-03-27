

## Restructure Mobile Bottom Nav

### Changes

**1. Update bottom bar tabs (`MobileBottomNav.tsx`)**

Replace Practice with Connect. New 5-item bar:
- Dashboard (LayoutDashboard, `/`)
- Learning (BookOpen, submenu action)
- Connect (MessageCircle, submenu action)
- Coach (coach-img, `/progress`)
- More (MoreHorizontal, submenu action)

**2. Learning submenu sheet**

Tapping "Learning" toggles a glassmorphic bottom sheet (same style as current "More" sheet) with 4 sub-items:
- Resources, Interactive, Practice, Test Yourself

Behavior:
- On a chapter page → navigate to `?section=resources|interactive|practice|test`
- On a module page (no chapter) → navigate to module page
- Not on any module/chapter → resume last position or fall back to dashboard
- Closes on outside tap, route change, or re-tap

**3. Connect submenu sheet**

Tapping "Connect" toggles a similar sheet with the existing 5 connect items (Messages, Ask a Question, Feedback, Discussions, Study Groups). Each calls `openConnect(id)` as today.

**4. Remove Connect from "More" sheet**

"More" sheet keeps only: Formative, Customize, Settings.

**5. Sheet mutual exclusivity**

Opening any sheet (Learning, Connect, More) closes the others.

### Single file changed

`src/components/layout/MobileBottomNav.tsx`

### Technical details

- Remove `practice` tab; change tab array to 5 items with `action` property for `learning`, `connect`, `more`
- Three boolean states: `showLearning`, `showConnect`, `showMore` — only one true at a time
- Three refs for outside-click handling
- Learning sub-items defined locally with icons from lucide (BookOpen, Gamepad2, PenLine, ClipboardCheck)
- Connect items reuse existing `connectItems` array
- Active highlighting for learning sub-items based on `searchParams.get('section')`
- Connect active state based on whether any connect overlay is open
- All sheets share the same glassmorphic styling, positioned above the 56px bottom bar

