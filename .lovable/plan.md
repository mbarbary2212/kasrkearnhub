

# Enhance Examiner Avatar Presentation — Both Screens

## Problem
The examiner avatar currently appears too small across the case UI:
- **Intro screen** (`VirtualPatientPage`): w-16 h-16 (64px) — cramped next to metadata
- **Case runner** (`StructuredCaseRunner`): No avatar in the header at all
- **History Taking section**: w-12 h-12 (48px) in text mode, w-24 h-24 in chat/voice mode

The avatar images are detailed and look good at larger sizes but lose impact when constrained to small circles.

---

## Solution: Prominent Examiner Banner

### 1. Case Intro Screen (`VirtualPatientPage.tsx`)

Replace the current compact avatar+title row with a **hero-style examiner banner**:

- Large avatar: **w-24 h-24** (96px) with a subtle ring/glow border (`ring-4 ring-primary/20`)
- Centered layout above the title and metadata
- Examiner name displayed prominently below the avatar
- Badges (level, Interactive Case) move below the name
- Chief complaint card stays as-is

```text
┌─────────────────────────────────────┐
│         ┌──────────┐                │
│         │  Avatar  │  96px circle   │
│         │  (large) │  with ring     │
│         └──────────┘                │
│       Dr. Ahmed Hassan              │
│    [Intermediate] [Interactive]     │
│                                     │
│    Case Title (xl text)             │
│    Sections: 8  •  ~15 min          │
├─────────────────────────────────────┤
│    Chief Complaint box              │
│    Start Interactive Case button    │
└─────────────────────────────────────┘
```

### 2. Case Runner Header (`StructuredCaseRunner.tsx`)

Add the examiner avatar to the progress header card, giving the student a persistent visual anchor:

- Add a **w-10 h-10** avatar to the left of the case title in the progress header
- Shows the examiner alongside the stethoscope icon and title

```text
┌─────────────────────────────────────────┐
│ (Avatar 40px) Case Title    ⏱ 3min [X] │
│ ████████████░░░░░░ progress bar         │
│ Section 3 of 8          5/8 completed   │
└─────────────────────────────────────────┘
```

### 3. History Taking Section (`HistoryTakingSection.tsx`)

Increase the text-mode examiner avatar from **w-12 h-12 → w-16 h-16** so it matches the impact of the chat/voice mode avatars (which are already w-24 h-24).

---

## Files Modified (3 files)

| File | Change |
|------|--------|
| `src/pages/VirtualPatientPage.tsx` | Restructure CardHeader to centered hero layout with w-24 h-24 avatar, ring border, name below |
| `src/components/clinical-cases/StructuredCaseRunner.tsx` | Add examiner avatar (w-10 h-10) next to case title in progress header |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Increase text-mode avatar from w-12 h-12 to w-16 h-16 |

