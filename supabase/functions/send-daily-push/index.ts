// Edge Function: daily_event の時刻になったら全ユーザーに Push 送信
// Deploy: supabase functions deploy send-daily-push

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 2 * 60 * 1000);

    const { data: events, error: eventError } = await supabase
      .from('daily_events')
      .select('*')
      .gte('notification_time', windowStart.toISOString())
      .lte('notification_time', windowEnd.toISOString());

    if (eventError) throw eventError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no event in window' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = events[0];

    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token, user_id');

    if (tokenError) throw tokenError;

    const messages = (tokens ?? []).map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: 'Be Reach',
      body: '今すぐトレーニングを投稿しよう！',
      data: { screen: 'post', dailyEventId: event.id },
    }));

    // 通知レコードも作成
    if (tokens && tokens.length > 0) {
      await supabase.from('notifications').insert(
        tokens.map((t) => ({
          user_id: t.user_id,
          type: 'daily_event',
          message: '今日の投稿タイムです！',
        })),
      );
    }

    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, sent, eventId: event.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
