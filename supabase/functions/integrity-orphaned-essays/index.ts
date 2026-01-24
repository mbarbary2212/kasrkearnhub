import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the Authorization header to verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const adminRoles = ["super_admin", "platform_admin", "admin", "department_admin", "topic_admin"];
    if (!roleData || !adminRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch essays with chapter_id (not null, not deleted)
    // Only select id and chapter_id - no large text fields
    const { data: essays, error: essayError } = await supabase
      .from("essays")
      .select("id, chapter_id")
      .not("chapter_id", "is", null)
      .eq("is_deleted", false);

    if (essayError) {
      throw new Error(`Failed to fetch essays: ${essayError.message}`);
    }

    // Fetch all valid chapter IDs from module_chapters
    const { data: chapters, error: chapterError } = await supabase
      .from("module_chapters")
      .select("id");

    if (chapterError) {
      throw new Error(`Failed to fetch chapters: ${chapterError.message}`);
    }

    // Create a Set of valid chapter IDs for O(1) lookup
    const validChapterIds = new Set(chapters?.map(c => c.id) || []);

    // Detect orphaned essays (chapter_id not in valid chapters)
    const orphanedEssays = essays?.filter(essay => !validChapterIds.has(essay.chapter_id)) || [];

    // Build response
    const result = {
      type: "orphaned_essays",
      severity: orphanedEssays.length > 0 ? "critical" : "ok",
      count: orphanedEssays.length,
      description: orphanedEssays.length > 0
        ? `${orphanedEssays.length} essay${orphanedEssays.length !== 1 ? 's' : ''} reference chapters that no longer exist`
        : "All essays with chapter references are valid",
      affectedIds: orphanedEssays.map(essay => essay.id),
      checkedAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("Integrity orphaned essays error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
