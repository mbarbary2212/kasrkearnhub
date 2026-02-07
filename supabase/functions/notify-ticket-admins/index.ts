import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  type: "inquiry" | "feedback" | "reply";
  id?: string;
  threadType?: "inquiry" | "feedback";
  threadId?: string;
  module_id?: string | null;
  chapter_id?: string | null;
  category?: string;
  subject?: string;
  replyBy?: string;
}

interface AdminToNotify {
  userId: string;
  level: "chapter" | "module" | "platform";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyRequest = await req.json();
    console.log("notify-ticket-admins called with:", body);

    const adminsToNotify: AdminToNotify[] = [];

    // Get module and chapter info for context
    let moduleName = "";
    let chapterName = "";
    let moduleId = body.module_id;
    let chapterId = body.chapter_id;

    // For reply type, look up the thread to get module/chapter
    if (body.type === "reply" && body.threadId) {
      const table = body.threadType === "inquiry" ? "inquiries" : "item_feedback";
      const { data: threadData } = await supabase
        .from(table)
        .select("module_id, chapter_id")
        .eq("id", body.threadId)
        .single();

      if (threadData) {
        moduleId = threadData.module_id;
        chapterId = threadData.chapter_id;
      }
    }

    // Get module name
    if (moduleId) {
      const { data: moduleData } = await supabase
        .from("modules")
        .select("name")
        .eq("id", moduleId)
        .single();
      moduleName = moduleData?.name || "Unknown Module";
    }

    // Get chapter name
    if (chapterId) {
      const { data: chapterData } = await supabase
        .from("module_chapters")
        .select("title, module_id")
        .eq("id", chapterId)
        .single();
      chapterName = chapterData?.title || "Unknown Chapter";
      
      // If we have chapter but not module, get module from chapter
      if (!moduleId && chapterData?.module_id) {
        moduleId = chapterData.module_id;
        const { data: modData } = await supabase
          .from("modules")
          .select("name")
          .eq("id", moduleId)
          .single();
        moduleName = modData?.name || "Unknown Module";
      }
    }

    // 1. Find chapter/topic admins if chapter_id exists
    if (chapterId) {
      const { data: topicAdmins } = await supabase
        .from("topic_admins")
        .select("user_id")
        .eq("chapter_id", chapterId);

      if (topicAdmins) {
        for (const ta of topicAdmins) {
          adminsToNotify.push({ userId: ta.user_id, level: "chapter" });
        }
      }
    }

    // 2. Find module admins if module_id exists
    if (moduleId) {
      const { data: moduleAdmins } = await supabase
        .from("module_admins")
        .select("user_id")
        .eq("module_id", moduleId);

      if (moduleAdmins) {
        for (const ma of moduleAdmins) {
          // Avoid duplicates
          if (!adminsToNotify.find((a) => a.userId === ma.user_id)) {
            adminsToNotify.push({ userId: ma.user_id, level: "module" });
          }
        }
      }
    }

    // 3. Always notify platform admins and super admins
    const { data: platformAdmins } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["platform_admin", "super_admin"]);

    if (platformAdmins) {
      for (const pa of platformAdmins) {
        // Avoid duplicates
        if (!adminsToNotify.find((a) => a.userId === pa.user_id)) {
          adminsToNotify.push({ userId: pa.user_id, level: "platform" });
        }
      }
    }

    // For reply type, exclude the person who replied from notifications
    const filteredAdmins = body.type === "reply" && body.replyBy
      ? adminsToNotify.filter((a) => a.userId !== body.replyBy)
      : adminsToNotify;

    console.log(`Notifying ${filteredAdmins.length} admins`);

    // Build notification content based on type
    let notificationType = "";
    let title = "";
    let message = "";
    const entityType = body.threadType || (body.type === "inquiry" ? "inquiry" : "feedback");
    const entityId = body.threadId || body.id;

    const locationContext = chapterName 
      ? `${moduleName} > ${chapterName}`
      : moduleName || "General";

    if (body.type === "inquiry") {
      notificationType = "new_inquiry";
      title = "New Question";
      message = `A student asked a question about ${locationContext}: "${body.subject || "No subject"}"`;
    } else if (body.type === "feedback") {
      notificationType = "new_feedback";
      title = "New Feedback";
      message = `New ${body.category || "feedback"} received for ${locationContext}`;
    } else if (body.type === "reply") {
      // Get replier name
      let replierName = "An admin";
      if (body.replyBy) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", body.replyBy)
          .single();
        replierName = profile?.full_name || profile?.email || "An admin";
      }

      notificationType = body.threadType === "inquiry" ? "inquiry_reply" : "feedback_reply";
      title = body.threadType === "inquiry" ? "Question Reply" : "Feedback Reply";
      message = `${replierName} replied to a ${body.threadType} about ${locationContext}`;
    }

    // Insert notifications for all admins
    const notifications = filteredAdmins.map((admin) => ({
      recipient_id: admin.userId,
      type: notificationType,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        module_id: moduleId,
        chapter_id: chapterId,
        module_name: moduleName,
        chapter_name: chapterName,
        admin_level: admin.level,
        category: body.category,
        subject: body.subject,
      },
    }));

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("admin_notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: filteredAdmins.length,
        admins: filteredAdmins.map((a) => a.userId),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in notify-ticket-admins:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
