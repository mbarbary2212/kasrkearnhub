import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================
// AES-256-GCM Encryption/Decryption
// ============================================

function getEncryptionKey(): string {
  // Use GOOGLE_API_KEY as the encryption seed (it's already a secret)
  // This avoids needing a separate encryption secret
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Encryption key not available");
  return key;
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("admin-api-key-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  // Combine IV + ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertext: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Exported for use by other edge functions (generate-content-from-pdf)
 */
export { decrypt };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authenticate user
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userId = userData.user.id;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // Check user is at least an admin role
  const { data: roleData } = await serviceClient
    .from("user_roles").select("role").eq("user_id", userId).single();

  if (!roleData || !["platform_admin", "super_admin", "department_admin", "admin", "teacher"].includes(roleData.role)) {
    return jsonResponse({ error: "Forbidden - admin access required" }, 403);
  }

  try {
    if (req.method === "GET") {
      // Return key metadata only (never the full key)
      const { data } = await serviceClient
        .from("admin_api_keys")
        .select("user_id, provider, key_hint, created_at, updated_at, revoked_at")
        .eq("user_id", userId)
        .single();

      return jsonResponse({
        has_key: !!data && !data.revoked_at,
        key_hint: data?.key_hint || null,
        provider: data?.provider || null,
        created_at: data?.created_at || null,
        revoked: !!data?.revoked_at,
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { api_key, provider = "gemini" } = body;

      if (!api_key || typeof api_key !== "string" || api_key.length < 10) {
        return jsonResponse({ error: "Invalid API key" }, 400);
      }

      // Encrypt the key
      const encrypted = await encrypt(api_key);
      const hint = api_key.slice(-4);

      // Upsert (replace if exists)
      const { error } = await serviceClient
        .from("admin_api_keys")
        .upsert({
          user_id: userId,
          provider,
          api_key_encrypted: encrypted,
          key_hint: hint,
          updated_at: new Date().toISOString(),
          revoked_at: null,
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Failed to save API key:", error.message);
        return jsonResponse({ error: "Failed to save API key" }, 500);
      }

      return jsonResponse({ success: true, key_hint: hint, provider });
    }

    if (req.method === "DELETE") {
      // Soft-revoke the key
      const { error } = await serviceClient
        .from("admin_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to revoke API key:", error.message);
        return jsonResponse({ error: "Failed to revoke API key" }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("Error in manage-admin-api-key:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
