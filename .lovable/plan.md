

## Plan: Enhanced Body Map with Colored Zones and Repositioned Labels

### What changes

Rewrite `BodyMap.tsx` to replace the plain gray silhouette + dots with **colored anatomical zones** that highlight on click. Reposition hotspots per user request:

**Layout changes:**
- **Vital Signs** → left upper limb area (left side label)
- **General Appearance** → top of body where Vital Signs was (above head, left label)
- **Head & Neck** → head position where General Appearance was (left label)
- **Chest/CV/Pulmonary** → chest zone (right labels)
- **Abdomen** → single consolidated zone covering all sub-findings (inspection, palpation, auscultation, special tests) — multiple abdomen-related keys map to the SAME body zone
- **Lower Limbs** → stays as-is
- **Unmatched items** (wounds, detailed assessments, etc.) → badge pills below body

**Visual changes:**
- Each body zone (head, chest, abdomen, arms, legs) gets a **distinct semi-transparent fill color** (e.g., head = blue, chest = teal, abdomen = green, limbs = purple)
- Unrevealed zones: muted/desaturated color with dashed connector
- Revealed zones: vivid color fill with solid connector
- Selected zone: brighter fill + ring highlight
- Zones are clickable SVG paths (not just dots) — the entire colored region is the click target

**Abdomen consolidation:**
- Multiple abdomen-related keys (inspection, palpation, auscultation, special tests) all map to the same SVG zone position
- When one is clicked, it reveals that specific finding; the zone dot shows a count badge if multiple sub-findings exist
- Allow multiple keys to share one hotspot position (remove the `usedPositions` uniqueness constraint for abdomen)

**Dynamic visibility:**
- Hotspots/labels only appear if the case scenario has a matching region key — if the case has no "lower_limb" data, no lower limb label shows. This is already the behavior (only positioned entries from `regions` are rendered).

### File modified
`src/components/clinical-cases/sections/BodyMap.tsx` — full rewrite

### Key details
- SVG viewBox stays ~300x420
- Body parts rendered as colored SVG paths with opacity transitions
- Zone colors: Head (#60A5FA blue), Chest (#2DD4BF teal), Abdomen (#4ADE80 green), Upper limbs (#A78BFA purple), Lower limbs (#FB923C orange), Pelvis (#F472B6 pink)
- Connector lines from zone center to label text on left/right side
- Multiple region keys can map to same zone (abdomen consolidation) — shown as stacked items in side panel

