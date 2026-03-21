
Root cause (confirmed):
- Section generation is failing because `generate-mind-map` expects the section AI response to be a JSON array, but the active default `mind_map_prompts` row for `prompt_type='section'` still uses the old “return markdown” instructions.
- The function currently prioritizes DB prompt text over the built-in structured section prompt, so Gemini often returns plain Markmap markdown (or mixed prose), not strict JSON.
- Logs confirm this path: full map succeeds, then section step logs “Could not parse section maps from AI response.”

Implementation plan to fix it permanently:
1. Harden backend section output contract (`supabase/functions/generate-mind-map/index.ts`)
- Keep prompts customizable for style/content, but make JSON structure non-optional in code.
- Build section generation prompt as:
  - mandatory schema wrapper (must return structured sections),
  - plus admin-configurable style instructions appended.
- Add Gemini JSON mode for sections (`responseMimeType: "application/json"` + strict schema) so output is machine-parseable by design.

2. Add legacy-prompt compatibility guard
- Detect legacy section prompts (old markdown-only style, missing structured keys).
- If detected, auto-fallback to the new structured default wrapper and log a warning.
- Prevent old prompt text from breaking generation again after future edits.

3. Strengthen parser + diagnostics
- Accept both:
  - direct array `[...]`,
  - wrapped object `{ sections: [...] }`.
- Preserve current fence-stripping, but add better parse diagnostics (first chunk preview + model/finish reason in logs).
- Return a clearer admin-facing error: “Section prompt is legacy/non-structured; update Section prompt format in Mind Map Prompts.”

4. Data/config alignment
- Add a migration to update the seeded default `section` prompt to the new structured contract (so fresh environments don’t inherit old behavior).

Validation after implementation:
- Run `generation_mode=sections` and `both` on the same chapter.
- Expect: 1 full + N section draft maps saved (instead of full-only).
- Confirm result dialog no longer shows parse error for normal runs.
- Confirm student/published flow remains unchanged.
