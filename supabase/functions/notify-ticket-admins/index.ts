import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  type: "inquiry" | "feedback" | "reply" | "ticket_assigned";
  id?: string;
  threadType?: "inquiry" | "feedback";
  threadId?: string;
  module_id?: string | null;
  chapter_id?: string | null;
  topic_id?: string | null;
  category?: string;
  subject?: string;
  replyBy?: string;
  assignedTo?: string;
}

interface AdminToNotify {
  userId: string;
  level: "topic" | "chapter" | "module" | "platform" | "assigned";
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: NotifyRequest = await req.json();
    console.log("notify-ticket-admins called with:", body);

    // Input validation
    const validTypes = ["inquiry", "feedback", "reply", "ticket_assigned"];
    if (!validTypes.includes(body.type)) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID formats
    if (body.id && !isValidUUID(body.id)) {
      return new Response(JSON.stringify({ error: "Invalid ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Length caps for text fields
    if (body.subject && body.subject.length > 500) {
      body.subject = body.subject.substring(0, 500);
    }
    if (body.category && body.category.length > 100) {
      body.category = body.category.substring(0, 100);
    }

    const adminsToNotify: AdminToNotify[] = [];

    // Get module and chapter/topic info for context
    let moduleName = "";
    let chapterName = "";
    let topicName = "";
    let moduleId = body.module_id;
    let chapterId = body.chapter_id;
    let topicId = body.topic_id;

    // For reply type, look up the thread to get module/chapter/topic
    if (body.type === "reply" && body.threadId) {
      const table = body.threadType === "inquiry" ? "inquiries" : "item_feedback";
      const { data: threadData } = await supabase
        .from(table)
        .select("module_id, chapter_id, topic_id")
        .eq("id", body.threadId)
        .single();

      if (threadData) {
        moduleId = threadData.module_id;
        chapterId = threadData.chapter_id;
        topicId = threadData.topic_id;
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

    // Get chapter name if chapter_id exists
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

    // Get topic name if topic_id exists
    if (topicId) {
      const { data: topicData } = await supabase
        .from("topics")
        .select("name, module_id")
        .eq("id", topicId)
        .single();
      topicName = topicData?.name || "Unknown Topic";
      
      // If we have topic but not module, get module from topic
      if (!moduleId && topicData?.module_id) {
        moduleId = topicData.module_id;
        const { data: modData } = await supabase
          .from("modules")
          .select("name")
          .eq("id", moduleId)
          .single();
        moduleName = modData?.name || "Unknown Module";
      }
    }

    // 1. Find topic admins if topic_id exists
    if (topicId) {
      const { data: topicAdmins } = await supabase
        .from("topic_admins")
        .select("user_id")
        .eq("topic_id", topicId);

      if (topicAdmins) {
        for (const ta of topicAdmins) {
          adminsToNotify.push({ userId: ta.user_id, level: "topic" });
        }
      }
    }

    // 2. Find chapter/topic admins if chapter_id exists
    if (chapterId) {
      const { data: chapterAdmins } = await supabase
        .from("topic_admins")
        .select("user_id")
        .eq("chapter_id", chapterId);

      if (chapterAdmins) {
        for (const ta of chapterAdmins) {
          if (!adminsToNotify.find((a) => a.userId === ta.user_id)) {
            adminsToNotify.push({ userId: ta.user_id, level: "chapter" });
          }
        }
      }
    }

    // 3. Find module admins if module_id exists
    if (moduleId) {
      const { data: moduleAdmins } = await supabase
        .from("module_admins")
        .select("user_id")
        .eq("module_id", moduleId);

      if (moduleAdmins) {
        for (const ma of moduleAdmins) {
          if (!adminsToNotify.find((a) => a.userId === ma.user_id)) {
            adminsToNotify.push({ userId: ma.user_id, level: "module" });
          }
        }
      }
    }

    // 4. Always notify platform admins and super admins
    const { data: platformAdmins } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["platform_admin", "super_admin"]);

    if (platformAdmins) {
      for (const pa of platformAdmins) {
        if (!adminsToNotify.find((a) => a.userId === pa.user_id)) {
          adminsToNotify.push({ userId: pa.user_id, level: "platform" });
        }
      }
    }

    // For reply type, exclude the person who replied from notifications
    let filteredAdmins = body.type === "reply" && body.replyBy
      ? adminsToNotify.filter((a) => a.userId !== body.replyBy)
      : adminsToNotify;

    // Handle ticket_assigned type - only notify assignee
    if (body.type === "ticket_assigned" && body.assignedTo) {
      filteredAdmins = [{ userId: body.assignedTo, level: "assigned" }];
    }

    console.log(`Notifying ${filteredAdmins.length} admins`);

    // Build notification content based on type
    let notificationType = "";
    let title = "";
    let message = "";
    const entityType = body.threadType || (body.type === "inquiry" ? "inquiry" : "feedback");
    const entityId = body.threadId || body.id;

    // Build location context - prefer topic over chapter
    const locationContext = topicName 
      ? `${moduleName} > ${topicName}`
      : chapterName 
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
    } else if (body.type === "ticket_assigned") {
      notificationType = "ticket_assigned";
      title = "Ticket Assigned to You";
      message = `You've been assigned a ${body.threadType || 'ticket'} about ${locationContext}`;
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
        topic_id: topicId,
        module_name: moduleName,
        chapter_name: chapterName,
        topic_name: topicName,
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
