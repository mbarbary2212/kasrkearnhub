

## Fix MCQ Choices Displaying as "[object Object]" in Approve Section

### Problem

The AI generates MCQ choices as an array of objects (`[{key: 'A', text: '...'}, ...]`) but the approve/preview card uses `Object.entries(item.choices)` which expects a dictionary (`{A: 'text', B: 'text'}`). This causes choices to render as `[object Object]`.

### Solution

Add a `normalizeChoices()` helper function to `AIContentPreviewCard.tsx` that converts both formats into a consistent dictionary. Apply it in three locations:

**File: `src/components/admin/AIContentPreviewCard.tsx`**

1. Add helper function (after imports, before the component):

```text
function normalizeChoices(choices: any): Record<string, string> {
  if (!choices) return {};
  if (Array.isArray(choices)) {
    const result: Record<string, string> = {};
    choices.forEach((c: any) => {
      if (c && typeof c === 'object' && c.key) {
        result[c.key] = c.text || '';
      }
    });
    return result;
  }
  if (typeof choices === 'object') {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(choices)) {
      result[k] = typeof v === 'object' && v !== null
        ? (v as any).text || String(v)
        : String(v);
    }
    return result;
  }
  return {};
}
```

2. **Line 87 (collapsed preview)** -- change `Object.keys(item.choices || {}).length` to `Object.keys(normalizeChoices(item.choices)).length`

3. **Lines 196-212 (edit form)** -- replace `Object.entries(editedItem.choices || {})` with `Object.entries(normalizeChoices(editedItem.choices))`, and update the onChange to write back normalized format

4. **Lines 497-506 (full view panel)** -- replace `Object.entries(item.choices || {})` with `Object.entries(normalizeChoices(item.choices))`

5. **Initialize editedItem with normalized choices** -- in `useState` or via an effect, ensure `editedItem.choices` is normalized to dictionary format on mount so edits write back correctly

### Summary

| Location | Current Code | Fix |
|---|---|---|
| Line 87 | `Object.keys(item.choices \|\| {}).length` | Use `normalizeChoices(item.choices)` |
| Line 196 | `Object.entries(editedItem.choices \|\| {})` | Use `normalizeChoices(editedItem.choices)` |
| Line 497 | `Object.entries(item.choices \|\| {})` | Use `normalizeChoices(item.choices)` |

Only `AIContentPreviewCard.tsx` is modified. No AI model or settings changes.
