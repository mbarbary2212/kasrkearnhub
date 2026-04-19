

## Rebranding plan — text-only, surgical edits

### Files to modify (5 total)

**1. `src/components/SplashScreen.tsx`** — the actual public-facing landing/hero shown at `/auth` and on first load. Two layouts (desktop + mobile) each contain the heading + subtitle.

- Line 87 (desktop heading): `Kasr Al-Ainy Learning & Mentorship Hub` → `Knowledge, Assessment, Learning & Mentorship — For Medical Students`
- Line 90 (desktop subtitle): `An academic digital platform supporting medical students at Kasr Al-Ainy.` → `The all-in-one learning hub for medical students.`
- Line 145 (mobile heading): same replacement as line 87
- Line 148 (mobile subtitle, slight variant): `An academic platform for medical students at Kasr Al-Ainy.` → `The all-in-one learning hub for medical students.`

Mobile heading currently uses `text-xs` in a narrow `w-32` box — the new longer heading will wrap. I'll widen the mobile heading container (e.g. `w-32` → `w-48` or `max-w-[60%]`) and remove `truncate`/single-line constraints so it wraps gracefully without shrinking the font. Desktop already uses `max-w-xs` which wraps fine.

**2. `index.html`** — `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">` (Change 3 — generic acronym expansion form).

- Title: `KALM Hub – Kasr Al-Ainy Learning & Mentorship Platform` → `KALM Hub – Knowledge, Assessment, Learning & Mentorship Platform`
- Description: rewrite to drop "developed at Kasr Al-Ainy" → "...digital learning and mentorship platform supporting medical students and trainees through structured education, formative assessment, and guided learning."
- og:title: same as `<title>`
- og:description: drop "at Kasr Al-Ainy" → "Digital learning and mentorship platform supporting medical students through structured education and formative assessment."

**3. `vite.config.ts`** — PWA manifest description (line 29).

- `Kasr Al-Ainy Learning & Mentorship Platform for medical students` → `Knowledge, Assessment, Learning & Mentorship Platform for medical students`

**4. `supabase/functions/provision-user/index.ts`** — email template footers (lines 401, 726, 741).

- All three: `KALM Hub — Kasr Al-Ainy Learning & Mentorship Hub` → `KALM Hub — Knowledge, Assessment, Learning & Mentorship Hub`

### Files explicitly NOT touched (flagged for manual review)

- **`supabase/functions/coach-chat/index.ts`** line 13 — AI system prompt: `"You are the Kasr Aliny Study Coach... for Cairo University medical students"`. This is an AI persona identity, not the KALM acronym phrase. **Flagging — will not change** unless you confirm.
- **`security-report.html`** — internal/historical "KasrLearnHub" references in a confidential security report. Not user-facing app copy.
- **`src/components/module/ModuleLearningTab.tsx`** lines 584, 652 — `kasrlearn_book_*` / `kasrlearn_sort_*` are localStorage **code identifiers** (keys). Per your "do not change identifiers" rule, leaving alone.
- **`supabase/functions/send-admin-email/index.ts`** line 144 — `kasrkearnhub.lovable.app` is a deployment URL fallback. Per "do not change URLs/routes", leaving alone.
- **`supabase/migrations/*.sql`** — historical migrations and any rows containing `@kasralainy.edu.eg` admin emails. Per "do not change Supabase config / seed data", leaving alone.
- **`README.md`** — no `Kasr` matches found. No change needed.

### Confirmations the implementation will satisfy

- "KALM Hub" brand name preserved in every location (verified in all 4 changed files)
- Hero watercolor `<picture>`/`<img>` references in `SplashScreen.tsx` (lines 118-127 and the corresponding desktop block) untouched — only the text `<p>` siblings change
- No code identifiers, file names, env vars, RLS policies, table/column names, or routes touched
- `kasralainy.edu.eg` test/admin emails in migrations untouched
- No new dependencies, no logic changes, no styling beyond the minimal mobile heading container width fix needed for graceful wrapping

### Report format after implementation

Per your request, I'll return: full file paths, before→after diff for each line, the four explicit confirmations, and the manual-review flag list above.

