

# Add Global "Credits" Footer

## Credits List (alphabetical by first name, polished role titles)

| Name | Role |
|------|------|
| Dr. Ahmed Mansour | Concept & Vision |
| Dr. Basma | Content Management |
| Dr. Marwa Mostafa | Interactive Cases |
| Dr. Mohab Mohamed | UI Design |
| Dr. Mohamed Amro | Design, Code Review & Security |
| Dr. Mohamed Elbarbary | Concept & Design Lead |
| Dr. Mohamed Khaled Maslouh | MCQ Development |
| Dr. Mohamed Lotfy | Flashcards Development |
| Dr. Omar | Testing & Concept Design |
| Dr. Soha Elmorsy | Concept & Vision |

## Implementation

### 1. New Component: `src/components/layout/AppCredits.tsx`
- A small text line: **"Built with ❤️ by the KALM Hub Team"** with a clickable **"Credits"** link
- Clicking "Credits" opens a **Popover** listing all contributors with names and roles in a clean two-column layout
- Subtle styling: `text-xs text-muted-foreground`, centered, with slight top border
- Positioned at the bottom of the main content area (not fixed/sticky — scrolls with content)

### 2. Modify: `src/components/layout/MainLayout.tsx`
- Import `AppCredits` and render it inside `<main>` after `{children}`, so it appears at the bottom of every page's content
- Only show for authenticated users (not on auth/splash pages)

### Design
```text
─────────────────────────────────
  [page content ends here]

  Built with ❤️ by the KALM Hub Team · Credits
─────────────────────────────────
```

Clicking "Credits" opens a popover:
```text
┌─────────────────────────────┐
│  The KALM Hub Team          │
│                             │
│  Dr. Ahmed Mansour          │
│  Concept & Vision           │
│                             │
│  Dr. Mohamed Elbarbary      │
│  Concept & Design Lead      │
│  ...                        │
└─────────────────────────────┘
```

## Files

| File | Change |
|------|--------|
| `src/components/layout/AppCredits.tsx` | New — credit line + popover with team list |
| `src/components/layout/MainLayout.tsx` | Render `<AppCredits />` after children inside main |

