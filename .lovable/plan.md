## Move Chapter Progress Into the Header Row

### Concept

Instead of a separate `ChapterProgressBar` block below the header, embed a compact progress indicator directly in the header breadcrumb — next to the online icon. The progress shown changes based on the active section:

- **Resources** tab → e.g. Video progress (e.g., a mini progress ring)
- Interactive tab → e.g. pathways progress (e.g., a mini progress ring)
- **Practice** tab →e.g Mcq progress (e.g., `8/12 completed`)
- **Interactive** / **Test** → Overall progress percentage

This keeps the header as a single source of navigation .

### Layout

```text
[← Back]  [All Sections ▾]  [Videos ▾]  ●48%  ·····  [Ask Coach]
```

The progress indicator would be a small circular ring or a compact pill showing the relevant percentage and count.

### Changes

**File: `src/pages/ChapterPage.tsx**`

1. **Remove the standalone `ChapterProgressBar**` block (lines 635-647) from below the header
2. **Add a compact progress pill** after the content dropdown in the header row, showing:
  - When `activeSection === 'resources'`: video progress % + `videosCompleted/videosTotal`
  - When `activeSection === 'practice'`: practice progress % + `practiceCompleted/practiceTotal`  
  - Otherwise: overall `totalProgress%`
3. Style it as a small pill with a tiny circular progress indicator (CSS `conic-gradient` ring) + text label

**File: `src/components/content/ChapterProgressPill.tsx**` (new)

A lightweight component that renders:

- A 20px circular progress ring (using `conic-gradient`)
- A label like "48%" or "3/5"
- Themed color matching the active section (green for high progress, amber for mid, etc.)
- Tooltip on hover showing the full breakdown (Practice 60% weight, Video 40% weight)

### Props

```typescript
interface ChapterProgressPillProps {
  activeSection: string;
  totalProgress: number;
  practiceProgress: number;
  videoProgress: number;
  practiceCompleted: number;
  practiceTotal: number;
  videosCompleted: number;
  videosTotal: number;
  isLoading?: boolean;
}
```

### Visual Design

- Circular ring: 20-24px, color transitions from gray → amber → green based on %
- Compact enough to sit inline in the header without bloating it
- On mobile, shows just the ring; on desktop, adds the text label
- Click/hover reveals the full breakdown tooltip (replaces the old collapsible)