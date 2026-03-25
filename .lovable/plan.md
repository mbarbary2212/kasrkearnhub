

## Remove Per-Module Dashboard — Go Straight to Learning

### Problem
When a student clicks a module, they land on a per-module "Dashboard" tab (greeting, stats, study plan) which duplicates the Home dashboard. This adds an unnecessary extra step before reaching the actual content.

### Solution
1. **Change default section for students** in `ModulePage.tsx` (line 50): change `return isStudentEarly ? 'dashboard' : 'learning'` → always return `'learning'` for everyone.

2. **Remove "Dashboard" from module nav tabs** in `ModulePage.tsx` (~line 156): remove the dashboard entry from `sectionNav` so students no longer see the Dashboard tab inside modules.

3. **Remove dashboard rendering** in `ModulePage.tsx` (~line 233): remove or keep the `activeSection === 'dashboard'` block (it won't be reachable, but can be cleaned up).

### Result
- Student clicks module → lands directly on Learning tab with chapters/content
- All dashboard-style info (greeting, stats, study plan, flashcards) lives on the Home page only
- Module page focuses on content: Learning, Connect, Formative, Study Coach tabs

### File
- **`src/pages/ModulePage.tsx`** — 3 small changes (default section, nav items, cleanup)

