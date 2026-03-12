

# Root Cause Analysis: Why This Keeps Happening

## What went wrong

**Two distinct bugs, one shared cause: the fuzzy mapper and the body map were built with different assumptions.**

### Bug 1: `wound_assessment` → `head_neck` (wrong mapping)

Line 34 of `physicalExamKeyMapper.ts`:
```
k.includes('ent')  // intended for ENT (Ear/Nose/Throat)
```
The substring `"ent"` matches inside `"wound_assessm**ent**"`, `"treatm**ent**"`, `"managem**ent**"`, `"environm**ent**"`, etc. This is a classic substring collision — the mapper was written quickly with broad `.includes()` checks and never tested against real-world descriptive keys that contain common English suffixes.

**Why it wasn't caught earlier:** The mapper was built and tested with the 8 canonical keys in mind. When I wrote the fuzzy fallback logic, I tested it mentally against medical terms (`ent_exam`, `thyroid`) but never against compound words ending in `-ment`, `-ent`, `-ment_assessment`. The key `wound_assessment` hits this trap because `assessm-ent` contains `ent`.

### Bug 2: "Upper limb" label visible with no data

`BodyMap.tsx` renders all 8 region labels as hardcoded SVG groups — always visible, always clickable. Only the `extra` region is conditionally rendered (`{hasExtra && ...}`). The other 7 labels show even when there's zero data for that region. This was a design oversight: the body map was built as a static anatomical diagram, not as a data-driven visualization.

## Why this pattern is dangerous for your app

Your cases are complex medical scenarios where the AI (or JSON import) produces diverse, unpredictable key names. The current fuzzy mapper uses a **priority-ordered chain of `.includes()` checks**, which means:

1. **Order matters** — a key matching an earlier rule never reaches the correct later rule
2. **Substring collisions** — common suffixes (`-ment`, `-tion`, `-ness`) can trigger false matches
3. **Silent failures** — data routes to the wrong region with no error, no warning, no visual indication

This is especially dangerous because clinical data integrity is critical — showing wound findings under "Head & Neck" is medically misleading.

## The Fix (2 files)

### 1. `src/utils/physicalExamKeyMapper.ts` — Fix substring collision

Replace `k.includes('ent')` with exact/specific ENT matches that cannot collide with common English suffixes:

```
// Before:
k.includes('ent')

// After:
k === 'ent' || k.includes('ear_nose') || k.includes('ent_exam') || k.includes('ent_assessment')
```

Additionally, **reorder the rules** so that the `extra` fallback-prone terms (`wound`, `skin`, `dre`, `rectal`, `fundoscopy`) are matched **before** the broad anatomical substring checks. This prevents any future collision where a descriptive key accidentally matches a body region.

Add a Sentry warning (not just breadcrumb) when a key maps via fuzzy logic rather than exact match — this creates an alert trail for any future unexpected mappings.

### 2. `src/components/clinical-cases/sections/BodyMap.tsx` — Only show regions with data

Wrap each of the 7 hardcoded region `<g>` groups in a conditional check: `{findings.region_key && (...)}`. The `extra` region already does this correctly — apply the same pattern to all others.

This ensures students only see clickable regions that actually contain clinical findings, eliminating confusion from empty ghost labels.

## Preventing This Class of Bug Permanently

Both fixes above solve the immediate problem, but the deeper issue is that **fuzzy substring matching is inherently fragile** for a medical app. Two additional safeguards in this same change:

1. **Sentry `captureMessage` (warning level)** whenever a key is fuzzy-matched (not exact) — so you get alerted to unexpected AI key names before students encounter broken UIs
2. **Move specific extra-type matches** (`wound`, `skin`, `dre`, `rectal`) to an explicit list checked **before** the broad anatomical `.includes()` chain — this inverts the priority so known edge cases are caught first

## Files Changed

| File | Change |
|---|---|
| `src/utils/physicalExamKeyMapper.ts` | Fix `ent` collision, reorder rules, add Sentry warning for fuzzy matches |
| `src/components/clinical-cases/sections/BodyMap.tsx` | Conditionally render all region labels based on data existence |

