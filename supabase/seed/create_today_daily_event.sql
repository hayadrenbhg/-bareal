-- 開発用: 今日の daily_event をすぐ作る（通知時刻 = 今）
-- SQL Editor で実行すると、この後の投稿が ON TIME / LATE 判定対象になる

INSERT INTO public.daily_events (event_date, notification_time)
VALUES (
  (now() AT TIME ZONE 'Asia/Tokyo')::date,
  now()
)
ON CONFLICT (event_date)
DO UPDATE SET notification_time = EXCLUDED.notification_time
RETURNING *;
