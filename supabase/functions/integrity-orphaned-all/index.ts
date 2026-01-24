import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All supported content types for orphan checks
type OrphanCheckType = 
  | "mcqs" 
  | "mcq_sets" 
  | "essays" 
  | "osce" 
  | "flashcards" 
  | "lectures" 
  | "matching" 
  | "case_scenarios" 
  | "clinical_cases" 
  | "study_resources";

interface CheckConfig {
  table: string;
  hasIsDeleted: boolean;
  previewField: string;
  label: string;
}

const checkConfigs: Record<OrphanCheckType, CheckConfig> = {
  mcqs: { 
    table: "mcqs", 
    hasIsDeleted: false, 
    previewField: "question",
    label: "MCQ"
  },
  mcq_sets: { 
    table: "mcq_sets", 
    hasIsDeleted: true, 
    previewField: "title",
    label: "MCQ Set"
  },
  essays: { 
    table: "essays", 
    hasIsDeleted: true, 
    previewField: "title",
    label: "Essay"
  },
  osce: { 
    table: "osce_questions", 
    hasIsDeleted: true, 
    previewField: "patient_history",
    label: "OSCE"
  },
  flashcards: { 
    table: "flashcards", 
    hasIsDeleted: true, 
    previewField: "front",
    label: "Flashcard"
  },
  lectures: { 
    table: "lectures", 
    hasIsDeleted: true, 
    previewField: "title",
    label: "Lecture"
  },
  matching: { 
    table: "matching_questions", 
    hasIsDeleted: true, 
    previewField: "instruction",
    label: "Matching Question"
  },
  case_scenarios: { 
    table: "case_scenarios", 
    hasIsDeleted: true, 
    previewField: "title",
    label: "Case Scenario"
  },
  clinical_cases: { 
    table: "clinical_cases", 
    hasIsDeleted: true, 
    previewField: "title",
    label: "Clinical Case"
  },
  study_resources: { 
    table: "study_resources", 
    hasIsDeleted: true, 
    previewField: "title",
    label: "Study Resource"
  },
};

interface OrphanedLocation {
  id: string;
  preview: string;
  orphaned_chapter_id: string;
  module_id: string | null;
  module_title: string | null;
}

interface OrphanCheckResult {
  type: string;
  severity: "critical" | "warning" | "ok";
  count: number;
  description: string;
  locations: OrphanedLocation[];
  checkedAt: string;
}

// Generic item type for dynamic table access
interface ContentItem {
  id: string;
  chapter_id: string | null;
  module_id?: string | null;
  // Dynamic fields for preview
  question?: string;
  title?: string;
  patient_history?: string;
  front?: string;
  instruction?: string;
  is_deleted?: boolean;
}

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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const checkType = body.checkType as OrphanCheckType | undefined;

    if (!checkType || !checkConfigs[checkType]) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid checkType. Must be one of: " + Object.keys(checkConfigs).join(", ") 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = checkConfigs[checkType];

    // Fetch all valid chapter IDs from module_chapters
    const { data: chapters, error: chapterError } = await supabase
      .from("module_chapters")
      .select("id");

    if (chapterError) {
      throw new Error(`Failed to fetch chapters: ${chapterError.message}`);
    }

    const validChapterIds = new Set(chapters?.map(c => c.id) || []);

    // Fetch modules for location info
    const { data: modules } = await supabase
      .from("modules")
      .select("id, title");

    const moduleMap = new Map<string, string>(modules?.map(m => [m.id, m.title]) || []);

    // Query table dynamically using RPC or direct query
    // We need to build a select string that includes the preview field
    const selectFields = `id, chapter_id, module_id, ${config.previewField}`;
    
    // deno-lint-ignore no-explicit-any
    let query: any = supabase
      .from(config.table)
      .select(selectFields)
      .not("chapter_id", "is", null);

    // Add is_deleted filter if applicable
    if (config.hasIsDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data: items, error: itemError } = await query;

    if (itemError) {
      throw new Error(`Failed to fetch ${config.label}s: ${itemError.message}`);
    }

    // Cast items to our generic type
    const typedItems = (items || []) as ContentItem[];

    // Detect orphaned items (chapter_id not in valid chapters)
    const orphanedItems = typedItems.filter(item => {
      const chapterId = item.chapter_id;
      return chapterId && !validChapterIds.has(chapterId);
    });

    // Helper to get preview text from item
    const getPreview = (item: ContentItem): string => {
      const previewField = config.previewField as keyof ContentItem;
      const value = item[previewField];
      if (typeof value === "string") {
        return value.slice(0, 60);
      }
      return "";
    };

    // Build locations array
    const locations: OrphanedLocation[] = orphanedItems.slice(0, 50).map(item => ({
      id: item.id,
      preview: getPreview(item),
      orphaned_chapter_id: item.chapter_id!,
      module_id: item.module_id || null,
      module_title: item.module_id ? moduleMap.get(item.module_id) || null : null,
    }));

    // Build result
    const result: OrphanCheckResult = {
      type: `orphaned_${checkType}`,
      severity: orphanedItems.length > 0 ? "critical" : "ok",
      count: orphanedItems.length,
      description: orphanedItems.length > 0
        ? `${orphanedItems.length} ${config.label.toLowerCase()}${orphanedItems.length !== 1 ? 's' : ''} reference chapters that no longer exist`
        : `All ${config.label.toLowerCase()}s with chapter references are valid`,
      locations,
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
    console.error("Integrity orphaned-all error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
