

## 1. Duplicate Detection for Visual Resource Uploads (Mind Maps, Infographics, Algorithms)

### How It Works

When an admin uploads a file (image/PDF/HTML/SVG) for any of the three visual resource types, the app will check for duplicates **by title and by file name** against existing resources in the same chapter/topic before saving.

- **Title match**: Compares the entered title against existing resource titles (case-insensitive, trimmed) of the same type within the same chapter/topic
- **File name match**: Compares the uploaded file's name against existing file URLs (extracts the original filename from storage paths)
- If a match is found, a confirmation dialog appears showing the matched item(s) and asking "This appears to be a duplicate. Upload anyway?"
- The admin can proceed or cancel

### Technical Details

| File | Change |
|------|--------|
| `src/components/study/StudyResourceFormModal.tsx` | Before calling `createResource.mutateAsync`, query existing resources in the same chapter/topic and type. If a title match (normalized) is found, show an `AlertDialog` warning with the matched title. Admin can confirm to proceed or cancel. |
| `src/hooks/useStudyResources.ts` | No changes needed -- `useChapterStudyResources` and `useTopicStudyResources` already fetch all resources for the container, which can be filtered client-side. |
| `src/components/study/MindMapBulkUploadModal.tsx` | Add duplicate check before processing each file in the bulk upload loop. Compare each file's name against existing resource titles. Flag duplicates with a warning icon in the preview list, but still allow the admin to proceed. |

### Duplicate Check Logic

```
1. Admin fills in title + uploads file, clicks "Create"
2. Before saving, fetch existing resources for this chapter/topic filtered to the same resource_type
3. Check: does any existing resource have a normalized title matching the new title?
4. Check: does any existing resource's fileUrl contain the same file name?
5. If either match found -> show AlertDialog: "A resource with a similar title already exists: [title]. Continue anyway?"
6. If admin confirms -> proceed with create
7. If admin cancels -> stay on form
```

### What About the Bulk Upload Modal?

The `MindMapBulkUploadModal` (used for bulk visual resource uploads) processes multiple files at once. For this flow:
- After files are selected and before the "Upload All" action, each file's name is compared against existing resources
- Duplicates are flagged with a warning badge in the file list preview
- A summary shows "X of Y files may be duplicates"
- The admin can remove individual flagged files or proceed with all

## 2. OSCE Template Format

Both the **Help Templates tab** and the **OSCE Bulk Upload modal** already generate the same format: **XLSX** (`osce_template.xlsx`). There is no mismatch -- they are consistent. XLSX is the correct choice for OSCE because it has 15+ columns (history, 5 statements, 5 answers, 5 explanations, section info) which would be hard to manage in CSV.

No changes needed here.

