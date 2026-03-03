

## Plan: Sentry Test Buttons in Admin + Compact File Upload

### A. Add "Monitoring / Sentry" section to PlatformSettingsTab

**File: `src/pages/AdminPage.tsx`**

Inside `PlatformSettingsTab`, after the "Archive Legacy OSCE" block (line ~184) and before the closing `</CardContent>`, add a new super-admin-only section:

- A bordered card titled "Monitoring / Sentry" with two buttons side by side
- **"Test Frontend Sentry"**: wraps `throw new Error("SENTRY_FRONTEND_TEST")` in a try/catch with `Sentry.captureException`, shows success toast. Needs `import * as Sentry from '@sentry/react'`.
- **"Test Edge Sentry"**: calls `supabase.functions.invoke('run-ai-case', { body: { sentry_test: true } })`, shows toast based on response.
- Each button has independent loading state via `useState`.
- Gated by `isSuperAdmin` (already available in scope).

### B. Remove old Sentry test button from Auth.tsx

**File: `src/pages/Auth.tsx`** (lines 639-649)

Delete the `{isSuperAdmin && (...Sentry Test...)}` block entirely.

### C. Add `sentry_test` handler in edge function

**File: `supabase/functions/run-ai-case/index.ts`**

Insert immediately after `const body = await req.json();` (line 272), before the destructuring on line 273:

```typescript
if (body.sentry_test === true) {
  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  // Check super_admin role
  const { data: roleRow } = await createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  ).from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
  
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  Sentry.captureMessage("Edge Sentry test: run-ai-case");
  await Sentry.flush(2000);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

### D. Compact App Architecture file upload UI

**File: `src/components/admin/HomeMindMapSettings.tsx`** (lines 135-161)

When a file is already uploaded (`fileUrl` exists), replace the current layout (filename bar + full DragDropZone) with a single compact row:

```
[FileText icon] filename.html [html badge] [Replace button] [Remove icon button]
```

- "Replace" opens a hidden `<input type="file">` via ref
- "Remove" clears `fileUrl` and sets `dirty = true`
- Only show `DragDropZone` when no file is uploaded yet

### Files changed

| File | Change |
|------|--------|
| `src/pages/AdminPage.tsx` | Add Sentry diagnostics section to PlatformSettingsTab |
| `src/pages/Auth.tsx` | Remove old Sentry test button (lines 639-649) |
| `supabase/functions/run-ai-case/index.ts` | Add `sentry_test` early handler |
| `src/components/admin/HomeMindMapSettings.tsx` | Compact file upload row when file exists |

