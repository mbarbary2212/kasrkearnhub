

# Home Page App Mind Map: Database-Driven Upload + Admin Settings

## What This Delivers

Right now, clicking the Network icon on the Home page shows a hardcoded Markdown outline. This update will:

1. **Make it database-driven** -- load interactive Markmap HTML files from the database instead of hardcoded text
2. **Support two versions** -- a student version and an admin version, shown based on user role
3. **Add an admin settings panel** -- so platform_admin and super_admin can upload/replace the mind map files or switch to Markdown mode
4. **Ship the two provided HTML files** -- `markmap_student.html` and `markmap_admin.html` will be uploaded to Supabase Storage and saved as the initial content

---

## Part 1: Copy HTML Files to Project

Copy both uploaded Markmap files into the public folder so they can be uploaded to Supabase Storage during the admin settings setup:

- `user-uploads://markmap_admin.html` to `public/markmap_admin.html`
- `user-uploads://markmap_student.html` to `public/markmap_student.html`

These are temporary -- once uploaded to Supabase Storage via the admin UI, they'll be served from there.

---

## Part 2: Update AppMindMap.tsx (Database-Driven)

### File: `src/components/dashboard/AppMindMap.tsx`

**Current**: Renders hardcoded `appStructureMarkdown` string via ReactMarkdown.

**Updated behavior**:

1. Detect user role from `useAuthContext()`
2. Query `study_settings` for the appropriate key:
   - Students: `app_mindmap_student`
   - All admin roles: `app_mindmap_admin`
3. Parse the JSON value which has this shape:
   ```json
   {
     "format": "markdown" | "file",
     "markdown_text": "# ...",
     "fileUrl": "https://...",
     "fileType": "html" | "svg" | "png" | "pdf"
   }
   ```
4. Render based on format:
   - `format === "markdown"`: ReactMarkdown (current behavior)
   - `format === "file"` + `fileType === "html"`: Full-dialog sandboxed iframe
   - `format === "file"` + image types: `<img>` with zoom
   - `format === "file"` + PDF: PDF embed
5. **Fallback**: If no setting exists, show the existing hardcoded Markdown

**Dialog sizing**: When rendering an HTML iframe, the dialog will expand to near-fullscreen (`max-w-[95vw] h-[90vh]`) to give the interactive Markmap enough space.

---

## Part 3: New Hook for App Mind Map Setting

### File: `src/hooks/useStudyResources.ts`

Add a dedicated hook:

```typescript
export function useAppMindMapSetting(audience: 'student' | 'admin') {
  const key = audience === 'student' ? 'app_mindmap_student' : 'app_mindmap_admin';
  return useQuery({
    queryKey: ['study-settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return null;
      return JSON.parse(data.value);
    },
  });
}
```

This ensures students only ever query `app_mindmap_student` and admins only query `app_mindmap_admin` -- audience separation enforced at the application layer.

---

## Part 4: Admin Settings Section for Home Mind Map

### New Component: `src/components/admin/HomeMindMapSettings.tsx`

A settings card (similar to `PlatformSettingsTab`) with:

- Two sections: "Student Version" and "Admin Version"
- Each section has:
  - A toggle: Markdown mode vs File mode
  - **Markdown mode**: A textarea to edit the Markdown text, with a preview toggle
  - **File mode**: A file upload zone accepting `.html`, `.htm`, `.svg`, images, `.pdf`
    - Uploads to Supabase Storage under `study-resources/home-mindmap/student/` or `study-resources/home-mindmap/admin/`
    - Shows current file info and a "Replace" button
  - A "Delete" button to remove the setting (reverts to fallback Markdown)
  - A "Save" button that calls `useUpsertStudySetting` with the JSON payload

### Integration into AdminPage.tsx

- Add this component inside the `PlatformSettingsTab` section
- Visibility gated: only rendered when `isPlatformAdmin || isSuperAdmin`
- Other admin roles cannot see or access this section

---

## Part 5: Initial Upload of Provided Files

After the admin settings UI is built, platform/super admins can upload the two HTML files through the UI. Alternatively, the implementation can seed the `study_settings` rows by:

1. Uploading both HTML files to Supabase Storage (`study-resources/home-mindmap/student/app-overview.html` and `study-resources/home-mindmap/admin/app-overview.html`)
2. The admin uses the new settings UI to upload the files -- no manual SQL needed

---

## Permissions

| Role | View Mind Map | Modify Settings |
|------|--------------|-----------------|
| Student | Student version only | No |
| Teacher/Admin/Topic Admin/Dept Admin | Admin version | No |
| Platform Admin | Admin version | Yes |
| Super Admin | Admin version | Yes |

---

## Files Summary

| File | Action |
|------|--------|
| `public/markmap_admin.html` | Copy from user upload (temporary, for initial upload) |
| `public/markmap_student.html` | Copy from user upload (temporary, for initial upload) |
| `src/components/dashboard/AppMindMap.tsx` | Rewrite: load from study_settings, render markdown or file |
| `src/hooks/useStudyResources.ts` | Add `useAppMindMapSetting` hook |
| `src/components/admin/HomeMindMapSettings.tsx` | **NEW** -- admin UI for managing both mind map versions |
| `src/pages/AdminPage.tsx` | Add HomeMindMapSettings inside PlatformSettingsTab (gated to platform/super admin) |

