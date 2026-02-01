
# Fix: Batch Generate Button Crash

## Root Cause

The "Batch Generate" button triggers a crash because `AIBatchGeneratorModal.tsx` contains an invalid `SelectItem`:

```tsx
<SelectItem value="">All chapters</SelectItem>  // ← Line 189
```

**Radix UI Rule**: `<Select.Item />` must have a non-empty string value. Empty strings are reserved for clearing the selection.

When the modal opens, React attempts to render this invalid component, which throws an error. Since this happens during render (not in an async handler), the `GlobalErrorBoundary` catches it and displays "Something Went Wrong."

## Fix

Replace the empty string with a sentinel value like `"__all__"`, then handle it in the `onValueChange` callback:

**Before:**
```tsx
<SelectContent>
  <SelectItem value="">All chapters</SelectItem>
  {chapters?.map(c => (
    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
  ))}
</SelectContent>
```

**After:**
```tsx
<SelectContent>
  <SelectItem value="__all__">All chapters</SelectItem>
  {chapters?.map(c => (
    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
  ))}
</SelectContent>
```

And update the handler:
```tsx
<Select 
  value={selectedChapterId || '__all__'} 
  onValueChange={(v) => setSelectedChapterId(v === '__all__' ? '' : v)}
  disabled={!selectedModuleId}
>
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AIBatchGeneratorModal.tsx` | Replace empty string value with `"__all__"` sentinel and update handler |

## Technical Notes

- The PDFLibraryTab filter dropdowns already use this pattern correctly (e.g., `value="all"` for "All Modules")
- This is a common Radix UI pitfall documented in their API
- No database or edge function changes required - this is purely a frontend fix
