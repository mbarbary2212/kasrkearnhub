

# Fix: Blueprint Excel Sections + Admin Photo Guidance

## Two Issues

### Issue 1: Excel Download Missing Sections

**Root Cause Analysis**: The code in `blueprintExcelExport.ts` already has section-fetching logic (lines 46-62), but there's a potential silent failure: if the Supabase query errors out, the `if (sections)` guard silently skips all section rows. Additionally, there's no error logging, so you'd never know it failed.

**Fixes** (file: `src/components/admin/blueprint/blueprintExcelExport.ts`):

1. **Add error logging** to the sections query so failures are visible in the console
2. **Remove the 1000-row default limit** by paginating or using `.limit(10000)` to handle modules with many sections
3. **Add a fallback debug log** that logs how many sections were found per chapter, so we can trace exactly what's happening
4. **Force re-export** by also passing the section data from the UI component rather than re-fetching it, as a reliability improvement

Specifically:
- Change the sections query to include explicit error handling: `if (error) console.error('Failed to fetch sections for export:', error);`
- Add `.limit(5000)` to the sections query to avoid the 1000-row Supabase default
- Log `sectionsByChapter.size` and total section count for debugging
- Keep the existing section row rendering logic (it's correct)

### Issue 2: Admin Photo / Avatar — Where and How

**Current system (already built):**

| What | Where | Who Does It |
|------|-------|-------------|
| Upload your own avatar | `/account` page → "Profile Picture" card (click avatar to upload) | Any user uploads their own |
| Assign someone as Module Admin | Admin Panel → Users tab → "Module Admins" sub-tab → "+ Assign" button | **Super Admin only** |
| Assign someone as Topic Admin | Admin Panel → Users tab → "Topic Admins" sub-tab → "+ Assign" button | Super Admin or Module Admin |
| See Module Lead on student pages | Module page header (below module title) — shows avatar + name, clickable to email | Students see this automatically |
| See Topic Lead on student pages | Chapter page (below chapter title) — shows avatar + name, clickable to email | Students see this automatically |

**The avatar shown as "Module Lead" or "Topic Lead" comes from the assigned user's profile photo.** So the flow is:
1. The person who will be a Module Admin goes to `/account` and uploads their avatar photo
2. A Super Admin assigns them as Module Admin via Admin Panel → Users → Module Admins
3. Students automatically see that person's photo + name on the module page

**No code changes needed** for this — the system already works. The user just needs to:
- Ensure the Module Admin has uploaded a profile picture at `/account`
- Ensure they've been assigned via the Module Admins tab

### Plan Summary

| File | Change |
|------|--------|
| `src/components/admin/blueprint/blueprintExcelExport.ts` | Add `.limit(5000)`, add error logging, add debug console log for section counts |

This is a minimal, targeted fix. The section-fetching code structure is correct — we just need to ensure it doesn't silently fail and isn't hitting the default row limit.

