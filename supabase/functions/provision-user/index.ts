import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function mapToBrevoPayload(params: { toEmail: string; toName: string; subject: string; html: string; text?: string }) {
  return {
    sender: { name: 'SurgTeach', email: 'no-reply@kalmhub.com' },
    to: [{ email: params.toEmail, name: params.toName }],
    subject: params.subject,
    htmlContent: params.html,
    ...(params.text ? { textContent: params.text } : {}),
  };
}

async function sendWithBrevoFallback(params: {
  resendApiKey: string;
  resendPayload: any;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.resendPayload),
    });

    if (resendRes.ok) {
      const resendData = await resendRes.json();
      console.log(`Email sent via Resend to ${params.toEmail}, ID: ${resendData.id}`);
      return;
    }

    const errText = await resendRes.text();
    if (resendRes.status === 429 || resendRes.status === 403) {
      console.warn(`Resend returned ${resendRes.status}, falling back to Brevo: ${errText}`);
    } else {
      console.warn(`Resend error (${resendRes.status}), falling back to Brevo: ${errText}`);
    }
  } catch (err) {
    console.warn('Resend threw an error, falling back to Brevo:', err);
  }

  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  if (!brevoApiKey) {
    throw new Error('Resend failed and BREVO_API_KEY is not configured');
  }

  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapToBrevoPayload(params)),
  });

  if (!brevoRes.ok) {
    const brevoErr = await brevoRes.text();
    console.error('Brevo also failed:', brevoErr);
    throw new Error(`Both Resend and Brevo failed. Brevo error: ${brevoErr}`);
  }

  console.log(`Email sent via Brevo fallback to ${params.toEmail}`);
}

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
        JSON.stringify({ 
          success: result.status === 'success', 
          error: result.status === 'error' ? result.message : undefined,
          ...result 
        }),
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

    if (action === 'check-invite-status') {
      if (!users || !Array.isArray(users) || users.length === 0) {
        throw new Error('Missing or invalid users (emails) array');
      }

      // Look up each email in auth.users
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listError) {
        throw new Error('Failed to list users');
      }

      const authUserMap = new Map<string, { confirmed_at: string | null; last_sign_in_at: string | null }>();
      listData.users.forEach((u: any) => {
        if (u.email) {
          authUserMap.set(u.email.toLowerCase(), {
            confirmed_at: u.email_confirmed_at || u.confirmed_at || null,
            last_sign_in_at: u.last_sign_in_at || null,
          });
        }
      });

      const statuses = users.map((email: string) => {
        const info = authUserMap.get(email.toLowerCase());
        if (!info) {
          return { email, account_status: 'not_registered', last_sign_in_at: null };
        }
        if (info.last_sign_in_at) {
          return { email, account_status: 'active', last_sign_in_at: info.last_sign_in_at };
        }
        if (info.confirmed_at) {
          return { email, account_status: 'registered', last_sign_in_at: null };
        }
        return { email, account_status: 'not_registered', last_sign_in_at: null };
      });

      return new Response(
        JSON.stringify({ success: true, statuses }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'set-password') {
      if (!user || !user.email || !user.password) {
        throw new Error('Missing required fields: email and password');
      }

      const email = user.email.trim().toLowerCase();
      const password = user.password;

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Check caller is super_admin only
      const isSuperAdmin = roles.some((r: any) => r.role === 'super_admin');
      if (!isSuperAdmin) {
        throw new Error('Unauthorized: Only super admins can set user passwords');
      }

      // Find the user
const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) throw new Error('Failed to list users');

      const targetUser = listData.users.find((u: any) => u.email?.toLowerCase() === email);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Update the password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        password,
        email_confirm: true,
      });

      if (updateError) {
        console.error('Error setting password:', updateError);
        throw new Error(updateError.message);
      }

      // Log to audit
      await supabaseAdmin.from('audit_log').insert({
        actor_id: caller.id,
        action: 'PASSWORD_SET_BY_ADMIN',
        entity_type: 'user',
        entity_id: targetUser.id,
        metadata: { email, set_by: caller.id },
      });

      console.log(`Password set for ${email} by admin ${caller.id}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Password set successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-email') {
      if (!user || !user.user_id || !user.new_email) {
        throw new Error('Missing required fields: user_id and new_email');
      }

      const newEmail = user.new_email.trim().toLowerCase();
      const targetUserId = user.user_id;

      // Update email in auth.users
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        email: newEmail,
        email_confirm: true,
      });

      if (updateError) {
        console.error('Error updating email:', updateError);
        throw new Error(updateError.message);
      }

      // Update email in profiles table
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', targetUserId);

      if (profileError) {
        console.error('Error updating profile email:', profileError);
        // Don't throw - auth email was already updated
      }

      // Log to audit
      await supabaseAdmin.from('audit_log').insert({
        actor_id: caller.id,
        action: 'EMAIL_UPDATED_BY_ADMIN',
        entity_type: 'user',
        entity_id: targetUserId,
        metadata: { new_email: newEmail, updated_by: caller.id },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Email updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset-password') {
      if (!user || !user.email) {
        throw new Error('Missing required field: email');
      }

      const email = user.email.trim().toLowerCase();

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${publicAppUrl}/auth?view=change-password`,
        },
      });

      if (linkError) {
        console.error('Error generating recovery link:', linkError);
        throw new Error(linkError.message);
      }

      const resetLink = linkData.properties.action_link;
      const fullName = user.full_name || email;

      // Send email via Resend
      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">Password Reset</h1>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hello ${fullName},</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">A password reset was requested for your account by an administrator.</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Click the button below to reset your password:</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">Reset your password</a>
    </p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      Or copy this link into your browser:<br>
      <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
    <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;">KALM Hub — Knowledge, Assessment, Learning & Mentorship Hub</p>
  </div>
</body>
</html>`;

      const resendPayload: any = {
        from: resendFromEmail,
        to: [email],
        subject: 'Reset your KALM Hub password',
        html: emailHtml,
        text: `Hello ${fullName},\n\nA password reset was requested for your account.\n\nClick this link to reset your password: ${resetLink}\n\nKALM Hub`,
      };

      if (resendReplyTo) {
        resendPayload.reply_to = resendReplyTo;
      }

      await sendWithBrevoFallback({
        resendApiKey: resendApiKey!,
        resendPayload: resendPayload,
        toEmail: email,
        toName: fullName,
        subject: 'Reset your KALM Hub password',
        html: emailHtml,
        text: resendPayload.text,
      });

      await supabaseAdmin.from('audit_log').insert({
        actor_id: caller.id,
        action: 'PASSWORD_RESET_EMAIL_SENT',
        entity_type: 'user',
        entity_id: user.user_id || null,
        metadata: { email, sent_by: caller.id },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete-user') {
      if (!user || !user.user_id) {
        throw new Error('Missing required field: user_id');
      }

      const targetUserId = user.user_id;

      // Only soft delete is supported -- deactivates the account
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          status: 'removed',
          status_reason: user.reason || 'Deactivated by admin',
          status_updated_at: new Date().toISOString(),
          status_updated_by: caller.id,
        })
        .eq('id', targetUserId);

      if (error) throw new Error(error.message);

      await supabaseAdmin.from('admin_actions').insert({
        admin_user_id: caller.id,
        target_user_id: targetUserId,
        action: 'SOFT_DELETE',
        reason: user.reason || 'Deactivated by admin',
      });

      return new Response(
        JSON.stringify({ success: true, message: 'User deactivated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-user') {
      if (!user || !user.email || !user.full_name) {
        throw new Error('Missing required fields: email and full_name');
      }

      // Only super_admin can create users directly
      const isSuperAdmin = roles.some((r: any) => r.role === 'super_admin');
      if (!isSuperAdmin) {
        throw new Error('Unauthorized: Only super admins can create users directly');
      }

      const email = user.email.trim().toLowerCase();
      const fullName = user.full_name.trim();
      const role = user.role || 'student';
      const yearId = user.year_id || null;

      // Generate a random temporary password
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
      let tempPassword = '';
      const array = new Uint8Array(12);
      crypto.getRandomValues(array);
      for (let i = 0; i < 12; i++) {
        tempPassword += chars[array[i] % chars.length];
      }

      // Check if user already exists
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      // Create user in auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw new Error(createError.message);
      }

      // Update profile
      await supabaseAdmin.from('profiles').update({
        full_name: fullName,
        email,
        year_id: yearId,
      }).eq('id', newUser.user.id);

      // Set role (trigger creates default 'student', update if different)
      if (role !== 'student') {
        await supabaseAdmin.from('user_roles')
          .update({ role })
          .eq('user_id', newUser.user.id);
      }

      // Audit log
      await supabaseAdmin.from('audit_log').insert({
        actor_id: caller.id,
        action: 'USER_CREATED_BY_ADMIN',
        entity_type: 'user',
        entity_id: newUser.user.id,
        metadata: { email, role, year_id: yearId, created_by: caller.id },
      });

      console.log(`User ${email} created by admin ${caller.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User created successfully',
          temp_password: tempPassword,
          user_id: newUser.user.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use "invite-single", "invite-bulk", "check-invite-status", "set-password", "update-email", "reset-password", "delete-user", or "create-user"');

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
    
    let linkData: any;
    try {
      const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: linkType,
        email,
        options: {
          redirectTo: `${publicAppUrl}/auth?view=change-password`,
        },
      });

      if (linkError) {
        throw linkError;
      }
      linkData = data;
    } catch (linkErr: any) {
      const errMsg = linkErr?.message || String(linkErr);
      if (errMsg.includes('User exists but could not be found')) {
        console.warn(`generateLink(${linkType}) failed for ${email} with conflicted-state error, falling back to magiclink`);
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${publicAppUrl}/auth?view=change-password`,
          },
        });
        if (fallbackError) {
          console.error('Magiclink fallback also failed:', fallbackError);
          throw new Error(fallbackError.message);
        }
        linkData = fallbackData;
      } else {
        throw new Error(errMsg);
      }
    }

    const inviteLink = linkData.properties.action_link;
    console.log(`Generated invite link for ${email}`);

    // Determine email content based on scenario
    let emailSubject: string;
    let emailHeading: string;
    let emailIntro: string;
    let emailAction: string;

    if (!isNewUser) {
      // Existing user - password reset
      emailSubject = 'Reset your KALM Hub password';
      emailHeading = 'Password Reset';
      emailIntro = 'A password reset was requested for your account.';
      emailAction = 'Reset your password';
    } else if (source === 'access_request') {
      // New user from approved access request
      emailSubject = 'Your KALM Hub access is approved — set your password';
      emailHeading = 'Welcome to KALM Hub';
      emailIntro = 'Your access request to KALM Hub has been approved by the administration.';
      emailAction = 'Set your password';
    } else {
      // New user from direct invitation
      emailSubject = "You're invited to KALM Hub — set your password";
      emailHeading = 'Welcome to KALM Hub';
      emailIntro = 'You have been invited to join KALM Hub.';
      emailAction = 'Set your password';
    }

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
    <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">${emailHeading}</h1>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hello ${fullName},</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">${emailIntro}</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Click the button below to ${emailAction.toLowerCase()}:</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${inviteLink}" 
         style="display: inline-block; padding: 14px 28px; 
                background-color: #4f46e5; color: white; 
                text-decoration: none; border-radius: 8px;
                font-weight: 500; font-size: 16px;">
        ${emailAction}
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
      KALM Hub — Knowledge, Assessment, Learning & Mentorship Hub
    </p>
  </div>
</body>
</html>`;

    const emailText = `Hello ${fullName},

${emailIntro}

Click the link below to ${emailAction.toLowerCase()}:
${inviteLink}

If you did not request this, you can safely ignore this email.

KALM Hub — Knowledge, Assessment, Learning & Mentorship Hub`;

    const resendPayload: any = {
      from: resendFromEmail,
      to: [email],
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    };

    if (resendReplyTo) {
      resendPayload.reply_to = resendReplyTo;
    }

    console.log(`Sending email - From: ${resendFromEmail}, To: ${email}`);
    
    await sendWithBrevoFallback({
      resendApiKey,
      resendPayload: resendPayload,
      toEmail: email,
      toName: fullName,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    console.log(`Email sent to ${email}`);

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
