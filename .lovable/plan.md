

# Fix iOS 15 Crash: Named Capture Group RegExp in mdast-util-gfm-footnote

## Problem
`mdast-util-gfm-footnote` v2.1.0 (pulled in by `remark-gfm` → `mdast-util-gfm`) uses named capture groups (`(?<label>...)`) in regex at runtime. iOS 15 WebKit doesn't support this, causing a fatal `SyntaxError` that crashes the app wherever `react-markdown` with `remarkGfm` is rendered.

Affected components: `AskCoachPanel`, `AppMindMap`, `RichDocumentViewer`, `AccountPage`, `HomeMindMapSettings`.

Note: `CoachContext.tsx`'s `generatePrompt()` is plain string concatenation — it does NOT use the markdown pipeline and is not the crash site. The Sentry stack trace points to the remark/rehype pipeline inside `ReactMarkdown`.

## Changes

### 1. `package.json` — Pin `mdast-util-gfm-footnote` to v1.x

Add an `overrides` block to force the safe version:

```json
"overrides": {
  "mdast-util-gfm-footnote": "1.0.2"
}
```

This prevents the named capture group regex from ever loading.

### 2. Wrap all `ReactMarkdown` usages with error boundaries

Create a small `SafeMarkdown` wrapper component that:
- Wraps `ReactMarkdown` in a try/catch error boundary
- On error, falls back to rendering the raw text in a `<pre>` tag
- Prevents any future markdown pipeline crash from taking down the app

Replace all 5 `ReactMarkdown` usages with `SafeMarkdown`.

### 3. Skip `@vitejs/plugin-legacy` for now

Adding the legacy plugin significantly increases bundle size and build time. The override fix directly addresses the root cause. We can revisit if more iOS 15 issues surface.

## Files

| File | Change |
|------|--------|
| `package.json` | Add `overrides` for `mdast-util-gfm-footnote` to `1.0.2` |
| `src/components/ui/SafeMarkdown.tsx` | New — error boundary wrapper for ReactMarkdown |
| `src/components/coach/AskCoachPanel.tsx` | Use `SafeMarkdown` |
| `src/components/dashboard/AppMindMap.tsx` | Use `SafeMarkdown` |
| `src/components/study/RichDocumentViewer.tsx` | Use `SafeMarkdown` |
| `src/pages/AccountPage.tsx` | Use `SafeMarkdown` |
| `src/components/admin/HomeMindMapSettings.tsx` | Use `SafeMarkdown` in lazy loader |

