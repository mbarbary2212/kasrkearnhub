

# Increase Glowing Ring Size

Increase the `box-shadow` spread radius on all four pulse-ring keyframes so the glow is more visible across desktop, tablet, and mobile.

## Changes — `tailwind.config.ts`

Current spread values → new values:

| Animation | Current 70% spread | New 70% spread |
|---|---|---|
| `pulse-ring` | 8px | 14px |
| `pulse-ring-green` | 8px | 14px |
| `pulse-ring-blue` | 8px | 14px |
| `pulse-ring-amber` | 10px | 16px |

Also bump the initial glow opacity from `0.6` to `0.7` for stronger visibility at the start of each pulse cycle.

No other files need changes — the animations are already applied in `HistoryTakingSection.tsx`.

