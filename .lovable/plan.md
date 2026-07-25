## Goal
Give you a one-click "Export to Excel" button on Admin → System → Accounts that downloads every access request since the project started, so you can open it in Excel and turn it into a table or chart yourself.

## Why this approach
- The data is already loaded in `AccountsTab` via `useAccessRequests()` (no status filter = all requests).
- The project already uses `ExcelJS` (see `blueprintExcelExport.ts`), so no new dependencies.
- A chart/curve built inside the app would duplicate what Excel does natively and add UI weight. Exporting is faster and gives you full flexibility (pivot tables, charts, filters).

## What I'll build

**1. New util: `src/lib/exportAccessRequests.ts`**
- Function `exportAccessRequestsToExcel(requests, reviewerNameMap?)` using ExcelJS.
- One sheet "Access Requests" with columns:
  - Full Name, Email, Job Title, Request Type, Status, Requested On, Reviewed On, Days to Review, Reviewed By, Notes
- Bold header row, frozen top row, sensible column widths, date cells formatted as real Excel dates (so you can chart by month).
- Filename: `KalmHub_Access_Requests_YYYY-MM-DD.xlsx`.

**2. Small addition to `src/components/admin/AccountsTab.tsx`**
- "Export to Excel" button (outline, with Download icon) placed next to the existing All Requests view header.
- Disabled while `allRequests` is loading or empty; toast on success/failure.
- Uses `allRequests` already fetched — no extra query.

**3. Optional (tell me yes/no)**
- Add a second sheet "Monthly Summary" with counts per month (Approved / Rejected / Pending) so you can paste a chart in Excel with one click. Adds ~15 lines. Recommended.

## Out of scope
- No in-app chart component (you asked for export, not a new dashboard).
- No backend/RPC changes; no schema changes.
- No changes to the approval flow itself.

## Files touched
- `src/lib/exportAccessRequests.ts` (new)
- `src/components/admin/AccountsTab.tsx` (add button + handler)

## Question before I build
Do you want the **Monthly Summary sheet** included (recommended, ~15 extra lines), or just the raw list?
