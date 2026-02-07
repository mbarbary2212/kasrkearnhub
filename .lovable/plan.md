
# Create Temporary Test Admin Account & Run Comprehensive Tests

## Security Assessment

Creating a temporary test account is **safe** if done correctly:

| Risk | Mitigation |
|------|------------|
| Account left active | Will delete immediately after testing |
| Weak password | Using strong 24-character password |
| Privilege escalation | Using same secure role pattern as existing admins |
| Activity logging | All actions logged in audit trail |

---

## Phase 1: Create Edge Function for Test User Management

Create a new edge function `manage-test-user` that:

1. **Verifies caller is super_admin** (using JWT validation)
2. **Creates user** via Supabase Admin API (`supabase.auth.admin.createUser`)
3. **Assigns role** to `user_roles` table
4. **Creates profile** entry
5. **Can also delete** the test user when done

```typescript
// supabase/functions/manage-test-user/index.ts
// POST { action: 'create' | 'delete', email, password, role }
// Returns: { success: true, user_id: '...' }
```

### Security Measures:
- Only super_admins can call this function
- Emails must end with `.test` domain
- All operations logged to audit trail
- Password validated for minimum complexity

---

## Phase 2: Create the Test Account

Call the edge function to create:

| Field | Value |
|-------|-------|
| Email | `test-platform-admin@kasralainy.test` |
| Password | Auto-generated strong password |
| Role | `platform_admin` |
| Full Name | `Test Platform Admin (TEMPORARY)` |

---

## Phase 3: Run Comprehensive Tests

Once the account is created, I will:

### 3.1 Login & Navigation Tests
- Log in with the test account
- Verify admin panel access
- Check all major navigation routes

### 3.2 Surgery Module Tests (Chapter-Based)
- Navigate to Surgery module
- View chapter content (lectures, MCQs, flashcards)
- Test feedback submission from chapter page
- Verify feedback has `chapter_id` populated
- Test inquiry submission

### 3.3 Pharmacology Module Tests (Topic-Based)
- Navigate to Pharmacology module
- View topic content (lectures, MCQs, flashcards)
- Test feedback submission from topic page
- Verify feedback has `topic_id` populated
- Test inquiry submission

### 3.4 Admin Panel Tests
- User management tab
- Announcements tab
- Question analytics
- Integrity checks
- Module admin assignments

### 3.5 Student Dashboard Tests
- View student dashboard
- Check progress tracking
- Verify study plan features

### 3.6 Database Integrity Verification
- Check `topic_id` population in:
  - `item_feedback` table
  - `inquiries` table
  - `study_resources` table
  - `question_attempts` table
  - `user_flashcard_stars` table
- Verify RLS policies work correctly for topic admins

---

## Phase 4: Delete Test Account

After all tests complete, immediately run:

```sql
-- Edge function will execute this via Admin API
DELETE FROM auth.users 
WHERE email = 'test-platform-admin@kasralainy.test';
-- Cascade automatically removes profile and role
```

---

## Files to Create/Modify

### New Files
- `supabase/functions/manage-test-user/index.ts` - Edge function for safe test user management

### No Production Code Changes
- This is purely for testing purposes
- All changes are in test infrastructure

---

## Test Report

At the end, I will provide a comprehensive report with:
- Screenshots of each test step
- Console logs and errors found
- Database verification results
- Network request analysis
- Issues discovered (if any)
- Recommendations for fixes

---

## Summary

This plan creates a secure, temporary test account with full audit logging, runs comprehensive end-to-end tests across both chapter-based (Surgery) and topic-based (Pharmacology) modules, and then immediately deletes the test account. The edge function ensures only super_admins can create test accounts and restricts emails to a `.test` domain for safety.
