

## Plan: Fix Physical Exam Region Mapping and UI Issues

### Root Cause
The existing case has legacy region keys (`abdomen_inspection`, `abdomen_palpation`, `wound_assessment`) that don't match the new `RegionKey` enum (`abdomen`, `general`, etc.). The backward compatibility code blindly casts them, so regions like abdomen never appear.

### Changes

**1. Fix legacy region key mapping (`PhysicalExamSection.tsx`)**

Update the backward compatibility `useMemo` to map old keys to new `RegionKey` values:
- `abdomen_inspection` + `abdomen_palpation` → merge into `abdomen` (concatenate texts)
- `wound_assessment` → merge into `extra` with label "Wound Assessment"
- `vital_signs` → convert `finding` string into structured `VitalsFinding` if possible, or keep as `RegionFinding`
- `general` → maps directly
- `lower_limbs` → maps directly
- Any key containing `head`, `neck` → `head_neck`
- Any key containing `chest`, `cardio` → `chest`
- Any key containing `upper`, `arm` → `upper_limbs`

This is a fuzzy mapping function that groups legacy arbitrary keys into the 8 fixed regions.

**2. Enlarge the body image (`BodyMap.tsx`)**

Change the SVG `<image>` dimensions from `width="330" height="490"` to fill more of the viewBox — approximately `width="380" height="540"` and reposition to center it. Adjust the viewBox if needed to accommodate.

**3. Fix bullet alignment on finding cards (`PhysicalExamSection.tsx`)**

The finding text likely contains bullet characters or the `<p>` tag is rendering with default list styles. Change the card body to use `whitespace-pre-line` and ensure no `list-style` bullets appear. If the text contains `•` characters, render them left-aligned with proper text alignment (not right-justified).

**4. Card title color scheme**

The General Appearance pill is clear because of its teal background+border. For the other card headers in default (unexamined) state, add a subtle left border accent or icon background tint so they stand out:
- Default state: slate-blue left border (`#1a5568`) + slightly darker icon background
- This gives visual weight without competing with the active (teal) and done (green) states

### Files Modified

| File | Change |
|------|--------|
| `src/components/clinical-cases/sections/PhysicalExamSection.tsx` | Legacy key mapping logic, bullet fix, card color scheme |
| `src/components/clinical-cases/sections/BodyMap.tsx` | Enlarge body image dimensions |

