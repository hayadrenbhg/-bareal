-- Be Reach: daily_events + user_push_tokens
-- Migration: 20240822400000_create_daily_events_and_push

CREATE TABLE public.daily_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL UNIQUE,
  notification_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_events_notification_time
  ON public.daily_events (notification_time);

ALTER TABLE public.daily_events ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーは閲覧のみ（作成は Service Role / Edge Function）
CREATE POLICY "daily_events_select_authenticated"
  ON public.daily_events
  FOR SELECT
  TO authenticated
  USING (true);

-- posts.daily_event_id FK（posts 作成後に追加）
ALTER TABLE public.posts
  ADD CONSTRAINT posts_daily_event_id_fkey
  FOREIGN KEY (daily_event_id)
  REFERENCES public.daily_events(id)
  ON DELETE SET NULL;

-- ============================================================
-- user_push_tokens（複数端末対応）
-- ============================================================
CREATE TABLE public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_push_tokens_token_unique UNIQUE (expo_push_token)
);

CREATE INDEX idx_user_push_tokens_user_id
  ON public.user_push_tokens (user_id);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_select_own"
  ON public.user_push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own"
  ON public.user_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own"
  ON public.user_push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own"
  ON public.user_push_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_push_token_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_push_tokens_set_updated_at
  BEFORE UPDATE ON public.user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_push_token_updated_at();

-- ============================================================
-- 今日の daily_event を取得（なければ NULL）
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_today_daily_event()
RETURNS SETOF public.daily_events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.daily_events
  WHERE event_date = (now() AT TIME ZONE 'Asia/Tokyo')::date
  LIMIT 1;
$$;
