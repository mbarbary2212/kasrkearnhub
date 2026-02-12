
# Fix Visual Resources: Infographic Crash, Delete Labels, and Type Re-tagging

## Problems Found

1. **Crash when adding/cancelling infographic**: The form modal (`StudyResourceFormModal.tsx`) never renders the `InfographicForm` component for the `infographic` type, and `getDefaultContent()` has no case for `'infographic'` -- returning `undefined` which crashes React.

2. **"Flashcard deleted" toast for mind maps**: The delete button in `VisualResourcesAdminTable.tsx` hardcodes `'mind_map'` as the kind for every row, regardless of actual type. Also, `ResourcesDeleteManager.tsx` doesn't include `'infographic'` in its type or label map.

3. **Re-tagging already works** in the admin table view via the Type dropdown. It just needs the above bugs fixed to function properly.

---

## Fix 1: Add Infographic Support to StudyResourceFormModal

**File**: `src/components/study/StudyResourceFormModal.tsx`

- Import `InfographicForm` and `InfographicContent`
- Add a rendering block for `resourceType === 'infographic'` that shows the `InfographicForm` (similar to the mind_map block)
- Add `case 'infographic'` to `getDefaultContent()` returning `{ fileUrl: '', description: '' }`

## Fix 2: Correct Delete Labels

**File**: `src/components/study/VisualResourcesAdminTable.tsx`

- Change line 279 from hardcoded `'mind_map'` to `resource.resource_type` so each row uses its actual type

**File**: `src/components/content/ResourcesDeleteManager.tsx`

- Add `'infographic'` to the `ResourceKind` type union
- Add `infographic: "infographic"` to the `kindLabels` map

## Fix 3: Batch Move Existing Mind Maps to Infographics

Since you mentioned you'd like to move existing mind maps to infographics and re-add mind maps manually:
- The admin table's Type dropdown already supports this (once the bugs above are fixed)
- You can switch to Table view, and use the Type dropdown on each row to change it from "Mind Map" to "Infographic"

---

## Technical Details

### StudyResourceFormModal.tsx changes

Add after the mind_map block (~line 234):
```typescript
{resourceType === 'infographic' && (
  <InfographicForm
    content={content as InfographicContent}
    onChange={(c) => setContent(c)}
    onUpload={handleImageUpload}
    uploading={uploading}
  />
)}
```

Add to `getDefaultContent`:
```typescript
case 'infographic':
  return { fileUrl: '', description: '' };
```

### ResourcesDeleteManager.tsx changes

Update type to include `'infographic'`:
```typescript
export type ResourceKind = "flashcard" | "table" | "algorithm" | "exam_tip" | "key_image" | "mind_map" | "infographic" | "clinical_case_worked";
```

Add to kindLabels:
```typescript
infographic: "infographic",
```

### VisualResourcesAdminTable.tsx change

Line 279 -- use actual resource type:
```typescript
onClick={() => requestResourceDelete(resource.resource_type as any, resource.id, resource.title)}
```

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/study/StudyResourceFormModal.tsx` | Add infographic form rendering + default content |
| `src/components/content/ResourcesDeleteManager.tsx` | Add 'infographic' to type + labels |
| `src/components/study/VisualResourcesAdminTable.tsx` | Fix hardcoded delete kind |
