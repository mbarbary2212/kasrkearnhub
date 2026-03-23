

## Refactor Year Pages to Card Grid with Module Images

### Overview
Replace the vertical list on all year pages with a responsive 2-column card grid (1 column on mobile). Year 5 modules (including cross-listed MED-422 and SUR-423) get the 6 uploaded images. Other year modules get colored gradient placeholders with the module title overlaid.

### Image Mapping (upload order)
1. `Gemini_Generated_Image_ytu22kytu22kytu2.png` → MED-422 (med-422)
2. `Gemini_Generated_Image_ytu22kytu22kytu2_1.png` → SUR-423 (sur-423)
3. `Gemini_Generated_Image_ytu22kytu22kytu2_2.png` → MED-522 (med-522)
4. `Gemini_Generated_Image_ytu22kytu22kytu2_3.png` → SUR-523 (sur-523)
5. `Gemini_Generated_Image_ytu22kytu22kytu2_4.png` → FML-520 (fml-520)
6. `Gemini_Generated_Image_ytu22kytu22kytu2_5.png` → MPC-526 (mpc-526)

### Changes

**1. Upload 6 images as CDN assets**
- Use `create_asset` for each uploaded image into `src/assets/modules/`

**2. Create `src/lib/moduleImages.ts`**
- Map module slugs to asset URLs: `med-422`, `sur-423`, `med-522`, `sur-523`, `fml-520`, `mpc-526`
- Export `getModuleImage(slug: string): string | undefined`
- Returns CDN URL for matched slugs, `undefined` for others

**3. Refactor `src/pages/YearPage.tsx` — modules section**
- Replace the `divide-y` vertical list with `grid grid-cols-1 md:grid-cols-2 gap-4`
- Each module renders as a `Card` with:
  - **Header**: `AspectRatio` (16/9) containing either the mapped image (`object-cover`) or a colored gradient placeholder with the module code displayed large and centered
  - **Body**: Module code + name as bold heading, description as muted subtitle
  - Hover effect: `hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300`
- Locked modules: same card but with reduced opacity and lock icon overlay
- Year 4 cross-listed note remains as italic text on relevant cards
- Loading skeleton: grid of card-shaped skeletons (image area + text lines)

**4. Placeholder design for modules without images (Years 1-4 except 422/423)**
- Gradient background using a hash of the module slug to pick from a set of 6-8 medical-themed gradients (deep blues, teals, purples, warm reds)
- Module code (e.g. "ANT-211") displayed large and centered in white text
- Subtle medical icon (Stethoscope) at low opacity in the corner

### Technical details
- Uses existing `Card`, `AspectRatio` components
- No database changes
- Easy to add more images later — just upload and add to the slug map

