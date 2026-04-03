

# Unify Admin Learning Navigation with Student Behavior

## Problem
Admin "Learning" tab navigates to `/admin/learning` (module browser) instead of showing the section submenu (Resources/Interactive/Practice/Test) like students. Admin has no way to reach chapter sections from the sidebar without manually editing the URL.

## Changes

### 1. Admin "Learning" tab → same behavior as student
**Files:** `StudentSidebar.tsx`, `MobileBottomNav.tsx`

Remove the admin-specific overrides that short-circuit Learning to `/admin/learning`. Instead, let the existing student logic run for admins too:
- On a chapter/topic page → show submenu (Resources, Interactive, Practice, Test)
- Not on a chapter page → resume last position or go to dashboard

**StudentSidebar.tsx (~lines 132-157):**
- Remove the `if (isAdmin) return location.pathname === '/admin/learning'` active-state override for Learning
- Remove the `if (item.id === 'learning' && isAdmin) navigate('/admin/learning')` click handler
- Let the existing student Learning logic handle both roles

**MobileBottomNav.tsx (~lines 38-41, 139-140):**
- Change admin Learning tab from `path: '/admin/learning'` to `action: 'learning'` (same as student)
- Remove admin-specific active-state check for Learning

### 2. Admin Dashboard → 60/40 layout with modules + admin intel
**File:** `AdminDashboard.tsx`

Restructure the admin dashboard to mirror the student home's split layout:
- **Left 60%**: Module browser (year selector, module cards — pulled from AdminLearningPage logic)
- **Right 40%**: Admin intelligence panel (Alerts & Attention, Content Health, Quick Actions — condensed from current accordion sections)

This means importing the year/module data hooks (`useYears`, `useAllModulesWithPermissions`) into AdminDashboard and rendering the module grid on the left, while moving the existing alert/health/activity sections into a sticky right panel.

### 3. Update "Browse modules" link
**File:** `AdminDashboard.tsx`

The Quick Actions "Browse modules" button currently navigates to `/admin/learning`. Since the module browser will now be on the dashboard itself, either remove this button or scroll to the modules section.

### 4. Keep `/admin/learning` route as fallback
No route removal — `AdminLearningPage` stays accessible for direct URL access, but it's no longer the primary navigation target.

## Summary of file changes

| File | Change |
|------|--------|
| `StudentSidebar.tsx` | Remove 3 admin-specific Learning overrides |
| `MobileBottomNav.tsx` | Change admin Learning tab to use submenu sheet |
| `AdminDashboard.tsx` | Add 60/40 layout: modules (left) + admin intel (right) |

