-- Be Reach: 1日2投稿 + post_mentions
-- Migration: 20240910000000_posts_daily_limit_and_mentions

-- ============================================================
-- 1日2投稿（Asia/Tokyo）: UNIQUE 1件制約を外し、トリガーで上限2
-- ============================================================
DROP INDEX IF EXISTS public.posts_one_per_day_jst;

CREATE OR REPLACE FUNCTION public.enforce_posts_daily_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  post_day DATE;
  cnt INTEGER;
BEGIN
  post_day := (NEW.posted_at AT TIME ZONE 'Asia/Tokyo')::date;

  SELECT COUNT(*) INTO cnt
  FROM public.posts
  WHERE user_id = NEW.user_id
    AND (posted_at AT TIME ZONE 'Asia/Tokyo')::date = post_day
    AND id IS DISTINCT FROM NEW.id;

  IF cnt >= 2 THEN
    RAISE EXCEPTION 'posts_daily_limit_jst'
      USING ERRCODE = 'check_violation';
  END IF;

  IF char_length(COALESCE(NEW.caption, '')) > 100 THEN
    RAISE EXCEPTION 'posts_caption_too_long'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_enforce_daily_limit ON public.posts;
CREATE TRIGGER posts_enforce_daily_limit
  BEFORE INSERT OR UPDATE OF posted_at, user_id, caption
  ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_posts_daily_limit();

-- 今日の投稿数（JST）
CREATE OR REPLACE FUNCTION public.count_posts_today_jst(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.posts
  WHERE user_id = COALESCE(p_user_id, auth.uid())
    AND (posted_at AT TIME ZONE 'Asia/Tokyo')::date
      = (now() AT TIME ZONE 'Asia/Tokyo')::date;
$$;

GRANT EXECUTE ON FUNCTION public.count_posts_today_jst(UUID) TO authenticated;

-- ============================================================
-- post_mentions
-- ============================================================
CREATE TABLE public.post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT post_mentions_unique_pair UNIQUE (post_id, mentioned_user_id)
);

CREATE INDEX idx_post_mentions_post_id ON public.post_mentions (post_id);
CREATE INDEX idx_post_mentions_mentioned_user_id
  ON public.post_mentions (mentioned_user_id);

CREATE OR REPLACE FUNCTION public.enforce_post_mention_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  author_id UUID;
  mention_count INTEGER;
BEGIN
  SELECT user_id INTO author_id
  FROM public.posts
  WHERE id = NEW.post_id;

  IF author_id IS NULL THEN
    RAISE EXCEPTION 'post_mentions_post_missing'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.mentioned_user_id = author_id THEN
    RAISE EXCEPTION 'post_mentions_no_self'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT public.are_friends(author_id, NEW.mentioned_user_id) THEN
    RAISE EXCEPTION 'post_mentions_not_friends'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO mention_count
  FROM public.post_mentions
  WHERE post_id = NEW.post_id
    AND id IS DISTINCT FROM NEW.id;

  IF mention_count >= 5 THEN
    RAISE EXCEPTION 'post_mentions_limit'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_mentions_enforce_rules ON public.post_mentions;
CREATE TRIGGER post_mentions_enforce_rules
  BEFORE INSERT OR UPDATE
  ON public.post_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_mention_rules();

ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

-- 投稿が見える人だけメンションも見える
CREATE POLICY "post_mentions_select_visible_posts"
  ON public.post_mentions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.user_id = auth.uid()
          OR public.are_friends(auth.uid(), p.user_id)
        )
    )
  );

-- 投稿者のみ、かつ友達のみ追加可
CREATE POLICY "post_mentions_insert_own_post_friends"
  ON public.post_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.user_id = auth.uid()
    )
    AND public.are_friends(auth.uid(), mentioned_user_id)
    AND auth.uid() <> mentioned_user_id
  );

CREATE POLICY "post_mentions_delete_own_post"
  ON public.post_mentions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.user_id = auth.uid()
    )
  );
