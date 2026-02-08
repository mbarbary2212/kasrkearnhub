import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface UserToInvite {
  email: string;
  full_name: string;
  role?: string;
  request_type?: string;
}

interface InviteResult {
  email: string;
  status: 'success' | 'error';
  message: string;
  invited_at?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const resendReplyTo = Deno.env.get('RESEND_REPLY_TO');
    const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://www.kalmhub.com';

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    if (!resendFromEmail) {
      throw new Error('RESEND_FROM_EMAIL is not configured');
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create client with user's auth for permission check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the calling user
    const { data: { user: caller }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !caller) {
      throw new Error('Invalid authentication');
    }

    // Check if caller is platform_admin or super_admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['platform_admin', 'super_admin']);

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      throw new Error('Failed to verify permissions');
    }

    if (!roles || roles.length === 0) {
      throw new Error('Unauthorized: Only platform admins can provision users');
    }

    const { action, user, users, source } = await req.json();

    if (action === 'invite-single') {
      if (!user || !user.email || !user.full_name) {
        throw new Error('Missing required user data');
      }

      const result = await inviteUser(
        supabaseAdmin, 
        user, 
        resendApiKey, 
        resendFromEmail, 
        resendReplyTo,
        publicAppUrl,
        caller.id,
        source || 'direct'
      );

      return new Response(
        JSON.stringify({ success: result.status === 'success', ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'invite-bulk') {
      if (!users || !Array.isArray(users) || users.length === 0) {
        throw new Error('Missing or invalid users array');
      }

      const results: InviteResult[] = [];
      
      for (const u of users) {
        if (!u.email || !u.full_name) {
          results.push({
            email: u.email || 'unknown',
            status: 'error',
            message: 'Missing required fields (email or full_name)',
          });
          continue;
        }

        const result = await inviteUser(
          supabaseAdmin,
          u,
          resendApiKey,
          resendFromEmail,
          resendReplyTo,
          publicAppUrl,
          caller.id,
          source || 'direct'
        );
        results.push(result);
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use "invite-single" or "invite-bulk"');

  } catch (error: any) {
    console.error('Error in provision-user:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function inviteUser(
  supabaseAdmin: any,
  user: UserToInvite,
  resendApiKey: string,
  resendFromEmail: string,
  resendReplyTo: string | undefined,
  publicAppUrl: string,
  adminId: string,
  source: string
): Promise<InviteResult> {
  const email = user.email.trim().toLowerCase();
  const fullName = user.full_name.trim();
  const role = user.role || 'student';

  try {
    // Try to create the user first - if it fails with "already registered", we know they exist
    let userId: string;
    let isNewUser = false;
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      // Check if user already exists
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists') ||
          createError.status === 422) {
        // User exists - find them via listUsers (filtering by email)
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error('Error listing users:', listError);
          throw new Error('Failed to lookup existing user');
        }
        
        const existingUser = listData.users.find(
          (u: any) => u.email?.toLowerCase() === email
        );
        
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        
        userId = existingUser.id;
        console.log(`User ${email} already exists with id ${userId}`);
      } else {
        console.error('Error creating user:', createError);
        throw new Error(createError.message);
      }
    } else {
      userId = newUser.user.id;
      isNewUser = true;
      console.log(`Created new user ${email} with id ${userId}`);
    }

    // Generate appropriate link based on user status:
    // - 'invite' for new users (account activation)
    // - 'recovery' for existing users (password reset)
    const linkType = isNewUser ? 'invite' : 'recovery';
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: linkType,
      email,
      options: {
        redirectTo: `${publicAppUrl}/auth?view=change-password`,
      },
    });

    if (linkError) {
      console.error('Error generating link:', linkError);
      throw new Error(linkError.message);
    }

    const inviteLink = linkData.properties.action_link;
    console.log(`Generated invite link for ${email}`);

    // Send email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Welcome to KALM Hub</h1>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hello ${fullName},</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">You are receiving this email because your access request to KALM Hub has been approved by the administration.</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Click the button below to set your password and activate your account:</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" 
         style="display: inline-block; padding: 14px 28px; 
                background-color: #4f46e5; color: white; 
                text-decoration: none; border-radius: 8px;
                font-weight: 500; font-size: 16px;">
        Set your password
      </a>
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Or copy this link into your browser:<br>
      <a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
      If you did not request this, you can safely ignore this email.
    </p>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;">
      KALM Hub — Kasr Al-Ainy Learning & Mentorship Hub
    </p>
  </div>
</body>
</html>`;

    const emailText = `Hello ${fullName},

You are receiving this email because your access request to KALM Hub has been approved by the administration.

Click the link below to set your password and activate your account:
${inviteLink}

If you did not request this, you can safely ignore this email.

KALM Hub — Kasr Al-Ainy Learning & Mentorship Hub`;

    const resendPayload: any = {
      from: resendFromEmail,
      to: [email],
      subject: 'Your KALM Hub access is approved — set your password',
      html: emailHtml,
      text: emailText,
    };

    if (resendReplyTo) {
      resendPayload.reply_to = resendReplyTo;
    }

    console.log(`Sending email via Resend - From: ${resendFromEmail}, To: ${email}`);
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    console.log(`Resend API response status: ${resendResponse.status}`);

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend error:', resendError);
      throw new Error(`Failed to send email: ${resendError}`);
    }

    const resendData = await resendResponse.json();
    console.log(`Email sent to ${email}, Resend ID: ${resendData.id}`);

    // Update user role if needed (only if user was just created or role differs)
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!existingRole) {
      // Create role
      await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        role: role,
      });
    }

    // Log to audit_log
    await supabaseAdmin.from('audit_log').insert({
      actor_id: adminId,
      action: 'USER_INVITED',
      entity_type: 'user',
      entity_id: userId,
      metadata: {
        email,
        full_name: fullName,
        role,
        is_new_user: isNewUser,
        link_type: linkType,
        source,
      },
    });

    return {
      email,
      status: 'success',
      message: isNewUser 
        ? 'Invitation email sent to new user' 
        : 'Password reset email sent to existing user',
      invited_at: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`Error inviting ${email}:`, error);
    return {
      email,
      status: 'error',
      message: error.message || 'Unknown error',
    };
  }
}
