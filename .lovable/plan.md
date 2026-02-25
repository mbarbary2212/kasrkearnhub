

## Plan: Promote Admin Panel to Header Navigation

### Problem
The "Admin Panel" link is buried inside the avatar dropdown menu, making it hard to find. Meanwhile, the "Home" text link in the header nav is redundant since clicking the KALM Hub logo already navigates home.

### Solution
**Replace the "Home" nav link with an "Admin Panel" button** in the header bar (visible only to admin users). This gives admins a prominent, always-visible entry point. Students see no change (the Home link was already redundant for them too, since the logo handles it).

### Changes

**`src/components/layout/MainLayout.tsx`**

1. **Header nav area (lines 142-151)**: Replace the "Home" text button with an "Admin Panel" button that is only visible to admin users. Style it with the Shield icon + a distinct color (e.g., `bg-primary/10 text-primary` pill/badge style) so it stands out as a control surface, not regular navigation.

2. **Mobile**: Show a compact Shield icon button for admins (visible on mobile too, not hidden behind `md:flex`).

3. **Avatar dropdown (lines 207-213)**: Keep the Admin Panel link in the dropdown as a secondary path, but the primary access is now the header button.

### Visual Result

```text
Header:
[KALM Logo]  [Trophy*]          [Admin Panel]  [Bell]  [Avatar]
                                 ↑ shield icon + text (desktop)
                                 ↑ shield icon only (mobile)
                                 * only for admins

* Trophy only for students
```

The button uses a visually distinct style (e.g., indigo/purple tint matching the admin role badge colors) with the Shield icon to clearly communicate it is an administrative action.

