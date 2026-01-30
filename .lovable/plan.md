
# Fix: Add "Impersonate Student" Option to Admin Dropdown

## Problem
The impersonation modal (`ImpersonateStudentModal`) was created but never connected to the UI. Admins have no way to access the impersonation feature.

## Solution
Update `MainLayout.tsx` to add the "Impersonate Student" menu option for platform admins and super admins.

---

## Changes Required

### File: `src/components/layout/MainLayout.tsx`

**1. Add Import for ImpersonateStudentModal and Eye icon**

At the top of the file, add:
```tsx
import { ImpersonateStudentModal } from '@/components/admin/ImpersonateStudentModal';
import { Eye } from 'lucide-react';
```

**2. Add State for Modal Visibility**

Inside the component, after existing useState declarations (around line 40):
```tsx
const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
```

**3. Add Menu Item in Admin Dropdown**

In the admin section of the dropdown (after line 244, inside the `{isAdmin && ...}` block), add a new menu item for platform_admin and super_admin only:

```tsx
{(isPlatformAdmin || isSuperAdmin) && (
  <DropdownMenuItem onClick={() => setImpersonateModalOpen(true)}>
    <Eye className="mr-2 h-4 w-4" />
    Impersonate Student
  </DropdownMenuItem>
)}
```

**4. Render the Modal**

At the bottom of the component (before the closing `</div>`), add:
```tsx
{/* Impersonate Student Modal */}
<ImpersonateStudentModal 
  open={impersonateModalOpen} 
  onOpenChange={setImpersonateModalOpen} 
/>
```

---

## Result

After this fix:
- Platform Admins and Super Admins will see "Impersonate Student" in their avatar dropdown menu
- Clicking it opens the student picker modal
- After selecting and confirming a student, impersonation begins with the amber banner showing

---

## Visual Flow

```
Avatar Dropdown (Admin)
├── Home
├── Account
├── ──────────
├── Feedback & Inquiries
├── Activity Log
├── Impersonate Student  ← NEW (platform_admin/super_admin only)
├── Admin Panel
├── ──────────
└── Sign Out
```
