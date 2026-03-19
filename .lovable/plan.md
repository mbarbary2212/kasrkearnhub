

## Restore Year Card Labels on Home Page

**Single file:** `src/pages/Home.tsx`

### What to add

**Years 1, 2, 3** — Below the subtitle line, add italic muted text:
> *Content coming soon — you can still see the structure*

Accompanied by a small clock icon (`Clock` from lucide-react).

**Year 4** — Same position, but show:
> *SUR-423: Surgery 1*

**Year 5** — Same position, but show:
> *SUR-523: Surgery 2*

### Implementation

Inside the `YearCard` component, after the subtitle `<p>` tag (line 157-159), add a conditional block:

```text
if year.number <= 3:
  render: <Clock icon> + "Content coming soon — you can still see the structure" (italic, muted, text-xs)
if year.number === 4:
  render: "SUR-423: Surgery 1" (italic, muted, text-xs)  
if year.number === 5:
  render: "SUR-523: Surgery 2" (italic, muted, text-xs)
```

### Changes

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Add `Clock` to lucide imports; add conditional label inside `YearCard` after the subtitle paragraph |

