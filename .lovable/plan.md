
# Fix User Approval & Add More Role Options

## ✅ COMPLETED

### Issue 1: Invite Failure - FIXED
The edge function `provision-user` was using a non-existent API method `getUserByEmail()`.

**Solution**: Changed to try-create approach - attempt to create user first, then handle "already registered" error by using `listUsers()` to find existing user.

### Issue 2: Limited Role Options - FIXED
Added more role options to the approval dropdown:
- Student
- Teacher  
- Topic Admin
- Department Admin
- Platform Admin

Note: `super_admin` is intentionally excluded (manual DB assignment only).

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/provision-user/index.ts` | Fixed user lookup - uses try-create with fallback to listUsers |
| `src/components/admin/AccountsTab.tsx` | Added topic_admin, department_admin, platform_admin to role dropdown |
