

## Plan: Physical Examination v8 Rewrite

This is a full rewrite of the physical examination UI based on the v8 HTML reference you designed with Claude. The v8 design is a significant upgrade — it uses a dark figure panel with a detailed body image, white-box labels on the body for Chest/Abdomen, side labels for other regions, a "Misc" dashed pill for extra findings, and a card-based findings panel with vitals grid and topic modal.

### Changes Overview

**1. Update TypeScript types (`src/types/structuredCase.ts`)**

Add new interfaces and update `PhysicalExamSectionData`:

```typescript
type RegionKey = 'general' | 'head_neck' | 'vital_signs' | 'chest' | 'upper_limbs' | 'abdomen' | 'lower_limbs' | 'extra';

interface VitalSign { name: string; value: string; unit: string; abnormal: boolean; }
interface RegionFinding { text: string; ref?: string | null; }
interface VitalsFinding extends RegionFinding { vitals: VitalSign[]; }
interface ExtraFinding extends RegionFinding { label: string; }
interface TopicItem { key: string; label: string; title: string; chapter: string; body: string; quote: string; }

// Updated PhysicalExamSectionData
interface PhysicalExamSectionData {
  max_score: number;
  note?: string;
  findings: Partial<Record<RegionKey, RegionFinding | VitalsFinding | ExtraFinding>>;
  related_topics?: TopicItem[];
  regions?: Record<string, ExamRegion>; // backward compat
}
```

**2. Full rewrite of `BodyMap.tsx`**

Port the v8 HTML SVG directly to React:
- Dark gradient background panel (`#0a2030` → `#0d3a55`)
- Base64 body image from the HTML (the `<image>` tag at line 236)
- General Appearance: teal pill above head with arrow
- Head/Neck: left-side label at head level
- Chest + Abdomen: white outlined boxes ON the body at correct anatomical positions
- Upper Limb: left-side label covering both arms
- Vitals: right-side label, teal tint on right arm
- Lower Limb: left-side label
- Misc: right-side dashed pill, always visible, activates when `extra` data exists
- No connector lines — just labels with invisible enlarged hit rects
- 3 states per region: default, active (teal), done (green) with CSS transitions
- Legend at bottom: Not examined / Selected / Revealed
- Data-driven: regions without findings data are hidden

**3. Full rewrite of `PhysicalExamSection.tsx`**

Port the v8 HTML layout:
- **Header**: Teal gradient bar with "Physical Examination" title + counter badge
- **Two-panel layout**: Figure panel (340px, dark bg) + Findings panel (white, flex-1)
- **Cards area**: One card per region present in data. 3 states:
  - Default: "Tap to examine" badge, collapsed
  - Open: "Examining…" badge, body visible with finding text + optional amber chapter ref
  - Done: "Examined ✓" badge, collapsed
- **Vitals card**: Special rendering with 2-column grid of vital chips (teal normal, red abnormal)
- **Topic strip**: Bottom of findings panel, pill buttons that open a custom modal (not shadcn Dialog)
- **Topic modal**: Fixed overlay with teal header, body text, amber quote block
- **Keep existing**: `findings_summary` textarea + submit button at bottom (our addition for scoring)
- Click logic: tap region on SVG or card → reveal + open. Tap again → collapse to done state.

**4. Update edge function prompt (`supabase/functions/generate-structured-case/index.ts`)**

Replace the `physical_examination` JSON schema in the prompt (lines 339-344) with:

```json
"physical_examination": {
  "findings": {
    "general":     { "text": "string", "ref": "string|null" },
    "head_neck":   { "text": "string", "ref": "string|null" },
    "vital_signs": { "vitals": [...], "text": "string", "ref": "string|null" },
    "chest":       { "text": "string", "ref": "string|null" },
    "upper_limbs": { "text": "string", "ref": "string|null" },
    "abdomen":     { "text": "string", "ref": "string|null" },
    "lower_limbs": { "text": "string", "ref": "string|null" },
    "extra":       { "label": "string", "text": "string", "ref": "string|null" }
  },
  "related_topics": [{ "key":"string", "label":"string", "title":"string", "chapter":"string", "body":"string", "quote":"string" }],
  "max_score": 15
}
```

**5. Update scoring prompt (`supabase/functions/score-case-answers/prompts.ts`)**

Update `physical_examination` case to reference `findings` (new key) instead of `regions`.

**6. Update CasePreviewEditor (`PhysicalExamEditor`)**

Update the editor component to work with the new `findings` record shape instead of `regions`.

### Files Summary

| File | Action |
|------|--------|
| `src/types/structuredCase.ts` | Add new types, update `PhysicalExamSectionData` |
| `src/components/clinical-cases/sections/BodyMap.tsx` | **Full rewrite** — v8 SVG with dark panel |
| `src/components/clinical-cases/sections/PhysicalExamSection.tsx` | **Full rewrite** — header, cards, topics |
| `supabase/functions/generate-structured-case/index.ts` | Update physical_examination schema |
| `supabase/functions/score-case-answers/prompts.ts` | Update to new data shape |
| `src/components/clinical-cases/CasePreviewEditor.tsx` | Update PhysicalExamEditor |

### Note on the body image
The v8 HTML embeds a base64 JPEG body image. This will be extracted and placed in `src/assets/body-figure.jpg` and imported in the component, rather than inlining the massive base64 string in JSX.

