// Edge Function: 毎日のランダム通知時刻を作成（全ユーザー共通）
// Deploy: supabase functions deploy create-daily-event
// Cron: 毎日 00:05 JST などで実行

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

    // JST の今日
    const now = new Date();
    const eventDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    // 通知時刻: 今日 9:00〜21:00 JST のランダム
    const startHour = 9;
    const endHour = 21;
    const randomHour =
      startHour + Math.floor(Math.random() * (endHour - startHour));
    const randomMinute = Math.floor(Math.random() * 60);

    const notificationTime = new Date(
      `${eventDate}T${String(randomHour).padStart(2, '0')}:${String(randomMinute).padStart(2, '0')}:00+09:00`,
    );

    const { data, error } = await supabase
      .from('daily_events')
      .upsert(
        {
          event_date: eventDate,
          notification_time: notificationTime.toISOString(),
        },
        { onConflict: 'event_date' },
      )
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, event: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
