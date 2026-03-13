

# Fix: Notification Badges — Tooltip Doesn't Work on Mobile

## Problem
Radix UI `Tooltip` is hover-only. On touch devices (mobile/tablet), there's no hover event, so the message never appears. This affects both the Lovable preview and production.

## Solution
Replace the `Tooltip` with a `Popover` (click/tap-triggered). This works on all platforms — mobile, tablet, and desktop. The same guidance message appears when the user taps or clicks the badges.

## Change — `src/pages/Home.tsx`

**Lines 192-214**: Swap `TooltipProvider > Tooltip > TooltipTrigger > TooltipContent` with `Popover > PopoverTrigger > PopoverContent`.

- Update imports: add `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`
- Remove `TooltipProvider, Tooltip, TooltipTrigger, TooltipContent` imports if unused elsewhere (they're still used for the "Explore App Structure" button, so keep them)
- The `PopoverContent` will show the same text: "Go to your module to check your messages"

Single block replacement, no other files changed.

