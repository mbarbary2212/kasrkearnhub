

# Fix: `Cannot access 'content_type' before initialization`

## Root Cause

Lines 915-917 in `generate-content-from-pdf/index.ts` use `content_type` to resolve the model override, but `content_type` is destructured from the request body on line 968. Since `const` declarations have a temporal dead zone, accessing it before initialization throws `ReferenceError`.

This crashes the entire function — no SBA (or any other) content can be generated.

## Fix

Move the content-type model override (lines 914-917) to **after** the body is parsed and `content_type` is available (~after line 975). Specifically, place it right before the generation logic begins (before line 1036 where `content_type` is first validated).

| File | Change |
|------|--------|
| `supabase/functions/generate-content-from-pdf/index.ts` | Move lines 914-917 (model override block) to after line 975 (after body destructuring), before the finalize branch on line 980 |

## SBA Template

The SBA schema and generation instructions are already properly defined in the edge function (lines 64-72, 1207-1219). The template includes clinical scenario stems, 5 plausible choices, best-answer selection, and NBME-aligned pedagogy. The failure was purely the runtime crash — once fixed, SBA generation will work.

