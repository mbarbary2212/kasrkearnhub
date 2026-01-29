
# Student UI Enhancement Plan: Quick Wins + High-Impact Gamification

## Summary

This plan enhances the student-facing UI with visual interest and engagement through two phases:

1. **Quick Wins**: Color-coded content type accents and enhanced hover animations
2. **High Impact**: Circular progress gauges and gamification elements (streak heat map, animated progress)

---

## Phase 1: Color-Coded Content Type Accents

### Design System: Content Type Color Tokens

Add semantic CSS custom properties to identify content types visually:

| Content Type | Color | HSL Value |
|--------------|-------|-----------|
| MCQ | Blue | `hsl(199 89% 48%)` (primary) |
| OSCE/Practical | Teal | `hsl(172 66% 50%)` |
| Flashcards | Purple | `hsl(262 83% 58%)` |
| Matching | Orange | `hsl(25 95% 53%)` |
| Essays | Indigo | `hsl(240 60% 55%)` |
| Clinical Cases | Emerald | `hsl(158 64% 45%)` (accent) |
| Videos | Rose | `hsl(350 89% 60%)` |

### Implementation: Left Border Accent on Cards

Each card component will receive a colored left border (4px) based on content type:

**Files to Update:**
- `src/components/content/McqCard.tsx` - Add `border-l-4 border-l-primary` 
- `src/components/content/OsceQuestionCard.tsx` - Add `border-l-4 border-l-medical-teal`
- `src/components/study/FlashcardDeck.tsx` - Add `border-l-4 border-l-medical-purple`
- `src/components/content/MatchingQuestionCard.tsx` - Add `border-l-4 border-l-medical-orange`
- `src/components/content/EssayList.tsx` (essay cards) - Add `border-l-4 border-l-indigo-500`
- `src/components/clinical-cases/ClinicalCaseCard.tsx` - Add `border-l-4 border-l-accent`
- `src/components/content/VideoCard.tsx` - Add `border-l-4 border-l-rose-500`

### Implementation: Enhanced Hover Animations

Add subtle scale and shadow transitions to make cards feel interactive:

**New utility classes in `src/index.css`:**
```css
.card-interactive {
  @apply transition-all duration-200 ease-out;
}

.card-interactive:hover {
  @apply shadow-lg scale-[1.01] -translate-y-0.5;
}
```

**Apply to all content cards for a consistent interactive feel.**

---

## Phase 2: Circular Progress Gauges (Dashboard)

### New Component: `CircularProgress.tsx`

A reusable SVG-based radial progress indicator with animated fill:

**Features:**
- Configurable size (sm: 64px, md: 96px, lg: 128px)
- Animated stroke-dashoffset on mount
- Center label with percentage or custom content
- Color theming based on value ranges (green > 70%, amber 40-70%, red < 40%)
- Optional glow effect for 100% completion

**File:** `src/components/ui/circular-progress.tsx`

```text
Visual representation:

   ┌─────────────┐
   │    ╭───╮    │
   │   ╱ 75% ╲   │  <- Animated arc with gradient
   │  │       │  │
   │   ╲     ╱   │
   │    ╰───╯    │
   │  Readiness  │  <- Label below
   └─────────────┘
```

### Update: `DashboardStatusStrip.tsx`

Replace the large text-based percentage with the new circular progress component:

**Before:**
- Text: "75%" in large font with icon box

**After:**
- Animated circular gauge with 75% arc fill
- Color-coded (green for good, amber for moderate, red for low)
- Subtle glow effect when at 100%

### Implementation: Exam Readiness Gauge

- Replace the `TrendingUp` icon box with `CircularProgress`
- Size: `md` (96px)
- Show percentage in center
- Add entrance animation (scale-in + fade-in)

### Implementation: Coverage Progress Ring

- Convert the linear progress bar to a circular mini-ring (size `sm`)
- Keep the linear bar as secondary indicator below
- Add animated fill effect

---

## Phase 3: Study Streak Heat Map Calendar

### New Component: `StreakHeatMap.tsx`

A 7-week (49 days) grid showing daily study activity:

**Features:**
- 7 columns (Mon-Sun) x 7 rows (weeks)
- Color intensity based on activity level (0-4 scale)
- Tooltip on hover showing date and activity count
- Current day highlighted with ring
- Streak fire emoji for active streaks

**Visual representation:**
```text
     M  T  W  T  F  S  S
    ┌──┬──┬──┬──┬──┬──┬──┐
W1  │░░│██│██│░░│██│  │  │
W2  │██│██│██│██│██│░░│  │
W3  │░░│██│██│██│██│██│░░│
W4  │██│██│░░│██│██│░░│  │
W5  │██│██│██│░░│  │  │  │
W6  │██│██│██│██│█▓│  │  │ <- Today
W7  │  │  │  │  │  │  │  │
    └──┴──┴──┴──┴──┴──┴──┘
    
    Empty  ░ Light  █ Medium  ██ Heavy
```

**File:** `src/components/dashboard/StreakHeatMap.tsx`

### Update: `DashboardStatusStrip.tsx`

Add the heat map as an expandable section below the Study Streak metric:

- Click on Study Streak card to expand/collapse heat map
- Shows activity pattern at a glance
- Encourages daily engagement through visual feedback

---

## Phase 4: Progress Map Visual Enhancement

### Update: `DashboardProgressMap.tsx`

Enhance the chapter rows with:

1. **Mastery stars** (1-5) based on completion quality
2. **Color-coded status icons** with subtle pulse animation for in-progress
3. **Mini progress arc** instead of linear bar
4. **Hover effect** with slight lift and shadow

**Visual enhancement:**
```text
Before:
○ Ch. 1: Introduction         [████████░░] 80%

After:
⭐⭐⭐ Ch. 1: Introduction    ╭80%╮  →
                              ╰──╯
```

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/circular-progress.tsx` | Reusable circular progress gauge |
| `src/components/dashboard/StreakHeatMap.tsx` | 7-week activity calendar |

## Files to Update

| File | Changes |
|------|---------|
| `src/index.css` | Add content type color tokens, `.card-interactive` utility |
| `tailwind.config.ts` | Add new keyframes for `pulse-glow`, `progress-fill` |
| `src/components/content/McqCard.tsx` | Add blue left border accent, hover animation |
| `src/components/content/OsceQuestionCard.tsx` | Add teal left border accent, hover animation |
| `src/components/study/FlashcardDeck.tsx` | Add purple left border accent, hover animation |
| `src/components/content/MatchingQuestionCard.tsx` | Add orange left border accent, hover animation |
| `src/components/content/EssayList.tsx` | Add indigo left border to essay cards, hover animation |
| `src/components/clinical-cases/ClinicalCaseCard.tsx` | Add emerald left border accent, hover animation |
| `src/components/content/VideoCard.tsx` | Add rose left border accent, hover animation |
| `src/components/dashboard/DashboardStatusStrip.tsx` | Replace text % with CircularProgress, add StreakHeatMap toggle |
| `src/components/dashboard/DashboardProgressMap.tsx` | Add mastery stars, enhanced hover states |

---

## Technical Details

### CSS Custom Properties for Content Types

Add to `:root` in `src/index.css`:
```css
--content-mcq: 199 89% 48%;
--content-osce: 172 66% 50%;
--content-flashcard: 262 83% 58%;
--content-matching: 25 95% 53%;
--content-essay: 240 60% 55%;
--content-case: 158 64% 45%;
--content-video: 350 89% 60%;
```

### Circular Progress Animation

Add keyframe to `tailwind.config.ts`:
```typescript
"progress-fill": {
  "0%": { strokeDashoffset: "100" },
  "100%": { strokeDashoffset: "var(--progress-value)" }
}
```

### Card Hover Transition

The `.card-interactive` class provides:
- 200ms ease-out transition
- 1% scale increase on hover
- 0.5px upward translation
- Enhanced shadow depth

### StreakHeatMap Data Structure

```typescript
interface DayActivity {
  date: string; // ISO date
  activityCount: number; // 0-10+ scale
  level: 0 | 1 | 2 | 3 | 4; // Computed intensity
}
```

The heat map will query the existing `user_activity_log` or session tracking data to populate the calendar.

---

## Implementation Order

1. **CSS Foundation**: Add content type tokens and utility classes to `src/index.css`
2. **Tailwind Config**: Add new animation keyframes
3. **CircularProgress Component**: Create the reusable gauge component
4. **Card Accents**: Update all content cards with left border accents and hover effects
5. **StreakHeatMap Component**: Create the activity calendar
6. **Dashboard Integration**: Update DashboardStatusStrip with circular progress and heat map
7. **Progress Map Enhancement**: Add mastery indicators and improved hover states

---

## Expected Visual Impact

- **Immediate Recognition**: Students can identify content types at a glance by card accent color
- **Interactive Feel**: Cards respond to hover with subtle movement, feeling more "alive"
- **Progress Motivation**: Circular gauges provide satisfying visual feedback on completion
- **Daily Engagement**: Heat map encourages maintaining streaks through visual gamification
- **Achievement Pride**: Mastery stars on chapters provide a sense of accomplishment
