// ============================================
// Shared authentication / authorization helper
// for Supabase Edge Functions.
//
// Why this exists:
// Several functions are declared `verify_jwt = false` in supabase/config.toml,
// which means the Supabase gateway does NOT check the caller's JWT. Any check
// inside the handler is therefore the ONLY protection. A recurring bug in this
// codebase was:
//
//     const authHeader = req.headers.get('Authorization');
//     if (authHeader) { ...validate... }        // <-- skipped entirely when absent
//
// which lets an anonymous caller through by simply omitting the header.
//
// Use `requireUser()` / `requireRole()` instead. Both FAIL CLOSED: any error,
// missing env var, or unexpected state results in denial, never access.
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AuthedUser = { id: string; email?: string | null };

export type AuthFailure = { ok: false; response: Response };
export type AuthSuccess = { ok: true; user: AuthedUser; role: string | null };
export type AuthResult = AuthSuccess | AuthFailure;

/** Roles that may perform administrative actions. Keep in sync with the app. */
export const ADMIN_ROLES = [
  'admin',
  'department_admin',
  'platform_admin',
  'super_admin',
] as const;

/** Roles allowed to author or edit teaching content. */
export const CONTENT_ROLES = ['teacher', ...ADMIN_ROLES] as const;

function deny(
  status: number,
  error: string,
  corsHeaders: Record<string, string>,
): AuthFailure {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }),
  };
}

/**
 * Require a valid, non-anonymous JWT.
 *
 * Returns `{ ok: true, user, role }` on success, or `{ ok: false, response }`
 * carrying a ready-to-return 401. Callers MUST check `ok` before proceeding:
 *
 *     const auth = await requireUser(req, corsHeaders);
 *     if (!auth.ok) return auth.response;
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  // No header, or not a Bearer token → deny. This is the bug this helper exists to prevent.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return deny(401, 'unauthorized', corsHeaders);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  // Fail closed if the function is misconfigured — never fall through to "allow".
  if (!supabaseUrl || !anonKey) {
    console.error('[require-auth] SUPABASE_URL or SUPABASE_ANON_KEY missing — denying request');
    return deny(500, 'auth_misconfigured', corsHeaders);
  }

  try {
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await anonClient.auth.getUser();
    if (error || !data?.user) {
      return deny(401, 'unauthorized', corsHeaders);
    }

    // Reject Supabase anonymous sign-ins, which are authenticated but not real users.
    if ((data.user as { is_anonymous?: boolean }).is_anonymous === true) {
      return deny(401, 'unauthorized', corsHeaders);
    }

    // Look up the caller's role using the SAME anon-scoped client, so RLS on
    // user_roles still applies. A null role is not an error — plain students
    // may have no row.
    let role: string | null = null;
    try {
      const { data: roleRow } = await anonClient
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();
      role = (roleRow as { role?: string } | null)?.role ?? null;
    } catch (_e) {
      role = null;
    }

    return { ok: true, user: { id: data.user.id, email: data.user.email }, role };
  } catch (e) {
    console.error('[require-auth] unexpected error, denying request:', e);
    return deny(401, 'unauthorized', corsHeaders);
  }
}

/**
 * Require a valid JWT AND membership of one of `allowedRoles`.
 *
 *     const auth = await requireRole(req, corsHeaders, ADMIN_ROLES);
 *     if (!auth.ok) return auth.response;
 */
export async function requireRole(
  req: Request,
  corsHeaders: Record<string, string>,
  allowedRoles: readonly string[],
): Promise<AuthResult> {
  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth;

  if (!auth.role || !allowedRoles.includes(auth.role)) {
    return deny(403, 'forbidden', corsHeaders);
  }

  return auth;
}

/**
 * Confirm that `attemptId` in `table` belongs to `userId`.
 * Admins bypass the check. Uses the service-role client supplied by the caller,
 * because the row may not be readable under the student's own RLS policies.
 *
 * Fails closed: a missing row or a query error returns false.
 */
export async function assertOwnsRow(
  serviceClient: { from: (t: string) => any },
  table: string,
  rowId: string,
  userId: string,
  callerRole: string | null,
): Promise<boolean> {
  if (callerRole && (ADMIN_ROLES as readonly string[]).includes(callerRole)) return true;

  try {
    const { data, error } = await serviceClient
      .from(table)
      .select('user_id')
      .eq('id', rowId)
      .maybeSingle();

    if (error || !data) return false;
    return (data as { user_id?: string }).user_id === userId;
  } catch (e) {
    console.error(`[require-auth] ownership check failed on ${table}:`, e);
    return false;
  }
}
