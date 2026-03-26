

## Move "Online Now" indicator to the header

**What changes:**
A small live-updating pill in the header showing the number of users currently online, visible to all logged-in users. Remove the "Online Now" card from the Home dashboard and Module dashboard stat rows.

**Icon suggestion:** Use the `Users` icon from lucide-react — it's clean and universally understood for "people online."

**Design:** A compact pill/badge next to the ThemeToggle:
```text
[ 👤 3 ]   ☀️   🔔   (Avatar)
```
- Small rounded-full pill: `Users` icon (14px) + count number
- Subtle styling: `bg-green-500/10 text-green-600` with a tiny green dot to indicate "live"
- Updates in real-time via the existing `usePresence()` hook

**Files to edit:**

1. **`src/components/layout/MainLayout.tsx`**
   - Import `Users` from lucide-react and `usePresence` from PresenceContext
   - Add a small pill element in the header's right section (before ThemeToggle), showing `onlineCount` with the `Users` icon
   - Only render when user is logged in

2. **`src/pages/Home.tsx`**
   - Remove the "Online Now" `<Card>` from the stats row
   - Remove unused `onlineCount` / `usePresence` import if no longer needed

3. **`src/components/module/ModuleDashboard.tsx`**
   - Remove the "Online Now" `<Card>` from the stats row
   - Remove unused `onlineCount` / `usePresence` import if no longer needed

