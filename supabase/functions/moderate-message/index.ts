import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Moderating message ${messageId}: ${content.substring(0, 100)}...`);

    // Call OpenAI Moderation API (free endpoint)
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content }),
    });

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();
      console.error('OpenAI Moderation API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Moderation service unavailable', flagged: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    console.log('Moderation result:', JSON.stringify(result));

    const flagged = result.flagged;
    const categories = result.categories;
    const scores = result.category_scores;

    // Determine reason if flagged
    let reason = null;
    if (flagged) {
      const flaggedCategories = Object.entries(categories)
        .filter(([_, value]) => value === true)
        .map(([key]) => key);
      reason = `Content flagged for: ${flaggedCategories.join(', ')}`;
    }

    // If messageId provided, update the message in database
    if (messageId && flagged) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('discussion_messages')
        .update({
          moderation_status: 'flagged',
          moderation_reason: reason,
          moderation_scores: scores,
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message:', updateError);
      } else {
        console.log(`Message ${messageId} flagged in database`);

        // Notify admins about flagged content
        const { data: message } = await supabase
          .from('discussion_messages')
          .select('user_id, thread_id')
          .eq('id', messageId)
          .single();

        if (message) {
          // Get all platform admins
          const { data: admins } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['super_admin', 'platform_admin']);

          if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
              recipient_id: admin.user_id,
              type: 'discussion_content_flagged',
              title: 'Discussion Content Flagged',
              message: `A discussion message was automatically flagged: ${reason}`,
              entity_type: 'discussion_message',
              entity_id: messageId,
              metadata: { 
                thread_id: message.thread_id,
                user_id: message.user_id,
                reason,
                scores 
              },
            }));

            await supabase.from('admin_notifications').insert(notifications);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        flagged, 
        categories, 
        scores,
        reason 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in moderate-message function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, flagged: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
