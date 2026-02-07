import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  action: 'create' | 'delete';
  email?: string;
  password?: string;
  role?: 'platform_admin' | 'super_admin' | 'department_admin' | 'teacher' | 'student';
  full_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check caller is super_admin
    const { data: roleData } = await anonClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super_admin can manage test users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: RequestPayload = await req.json();

    // Service client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (payload.action === 'create') {
      // Validate email ends with .test
      if (!payload.email || !payload.email.endsWith('.test')) {
        return new Response(
          JSON.stringify({ error: 'Test user email must end with .test domain' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate password
      if (!payload.password || payload.password.length < 12) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 12 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate role
      const validRoles = ['platform_admin', 'super_admin', 'department_admin', 'teacher', 'student'];
      if (!payload.role || !validRoles.includes(payload.role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid role specified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already exists
      const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === payload.email);
      
      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Test user already exists', user_id: existingUser.id }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create user via Admin API
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true, // Auto-confirm for test users
        user_metadata: {
          full_name: payload.full_name || 'Test User (TEMPORARY)',
          is_test_user: true,
        },
      });

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError);
        return new Response(
          JSON.stringify({ error: createError?.message || 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The handle_new_user trigger should create profile and assign student role
      // But we need to update the role to the specified one

      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update role to specified role
      const { error: roleError } = await serviceClient
        .from('user_roles')
        .update({ role: payload.role })
        .eq('user_id', newUser.user.id);

      if (roleError) {
        console.error('Failed to update role:', roleError);
        // Try insert instead (in case trigger didn't run)
        await serviceClient
          .from('user_roles')
          .upsert({ user_id: newUser.user.id, role: payload.role });
      }

      // Update profile name
      const { error: profileError } = await serviceClient
        .from('profiles')
        .update({ full_name: payload.full_name || 'Test User (TEMPORARY)' })
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
      }

      // Log to audit
      await serviceClient
        .from('audit_log')
        .insert({
          actor_id: user.id,
          action: 'CREATE_TEST_USER',
          entity_type: 'test_user',
          entity_id: newUser.user.id,
          metadata: {
            email: payload.email,
            role: payload.role,
            created_by: user.email,
          },
        });

      console.log(`Test user created: ${payload.email} with role ${payload.role}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: newUser.user.id,
          email: payload.email,
          role: payload.role,
          message: 'Test user created successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (payload.action === 'delete') {
      // Validate email
      if (!payload.email || !payload.email.endsWith('.test')) {
        return new Response(
          JSON.stringify({ error: 'Can only delete users with .test domain email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user
      const { data: users } = await serviceClient.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email === payload.email);

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: 'Test user not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete user (cascades to profiles and user_roles)
      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(targetUser.id);

      if (deleteError) {
        console.error('Failed to delete user:', deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log to audit
      await serviceClient
        .from('audit_log')
        .insert({
          actor_id: user.id,
          action: 'DELETE_TEST_USER',
          entity_type: 'test_user',
          entity_id: targetUser.id,
          metadata: {
            email: payload.email,
            deleted_by: user.email,
          },
        });

      console.log(`Test user deleted: ${payload.email}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test user deleted successfully',
          deleted_user_id: targetUser.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "create" or "delete"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in manage-test-user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
