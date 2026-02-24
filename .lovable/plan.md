

## Fix: Algorithm Builder Crash on Open

### Problem
Clicking "Build Algorithm" crashes the app because Radix UI's `<Select.Item>` throws an error when given `value=""`. This happens in two places in `AlgorithmBuilderModal.tsx`:
- Line 148: The "Next Step" selector's "None (end)" option
- Line 167: The decision option's "None" option

### Root Cause
Radix UI Select reserves empty string `""` to represent "no selection" (placeholder state), so it throws:
> A Select.Item must have a value prop that is not an empty string.

### Fix
In `AlgorithmBuilderModal.tsx`, replace `value=""` with a sentinel value like `value="__none__"` for both "None" SelectItems. Then update the `onValueChange` handlers to convert `"__none__"` back to `null`.

### Changes

**File: `src/components/algorithms/AlgorithmBuilderModal.tsx`**

1. **Line 148** - "Next Step" selector: Change `<SelectItem value="">` to `<SelectItem value="__none__">` and update the `onValueChange` to map `"__none__"` to `null`.

2. **Line 167** - Decision option "Next" selector: Same fix -- change `<SelectItem value="">` to `<SelectItem value="__none__">` and update `onValueChange`.

This is a two-line fix that resolves the crash entirely.
