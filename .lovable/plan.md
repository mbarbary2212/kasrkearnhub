

## Security Analysis

Adding `allow-same-origin` alongside `allow-scripts` **does reduce security** when using `src=` — it could let the iframe access parent-page cookies/storage if origins align.

**Better approach**: Always load HTML mind maps via `srcDoc` (already partially implemented). With `srcDoc`, the iframe's origin is opaque/null, so `allow-same-origin` only enables network requests (loading CDN scripts) but **cannot** access the parent page's storage or cookies. This is as secure as before.

## Changes in `src/components/dashboard/AppMindMap.tsx`

1. **Line 89-95**: Change the `useEffect` to **always** fetch HTML content and set `htmlSrcdoc`, not just when content-type is wrong. Remove the content-type check — always use `res.text()` → `setHtmlSrcdoc()`.

2. **Line 125**: Change `sandbox="allow-scripts"` → `sandbox="allow-scripts allow-same-origin"`.

This way the iframe always uses `srcDoc` (opaque origin) + the sandbox permits CDN script loading, while being unable to access the parent page's session data.

