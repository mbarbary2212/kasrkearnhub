

## Enable Global API Key Fallback for All Admins

### Problem
Dr. Basma (Platform Admin) cannot generate content because `allow_admin_fallback_to_global_key` is set to `false` in `ai_platform_settings`. Since she has no personal API key, the system blocks her.

### Fix
Update the single row in `ai_platform_settings` to set `allow_admin_fallback_to_global_key = true`. This is a data-only change — no code or schema modifications needed.

**SQL:**
```sql
UPDATE ai_platform_settings SET allow_admin_fallback_to_global_key = true WHERE id = 1;
```

After this, all admins without a personal key will fall back to your global Gemini API key and can generate content immediately.

### Optional improvement
Surface the actual error message in the UI instead of showing a generic "No items generated" when the key policy blocks a user. This would help future debugging but is not required for the immediate fix.

