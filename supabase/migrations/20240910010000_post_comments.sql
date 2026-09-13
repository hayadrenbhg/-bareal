-- Be Reach: 投稿コメント
-- Migration: 20240910010000_post_comments

CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT post_comments_content_length
    CHECK (char_length(content) >= 1 AND char_length(content) <= 200)
);

CREATE INDEX idx_post_comments_post_created
  ON public.post_comments (post_id, created_at ASC);

CREATE INDEX idx_post_comments_user_id
  ON public.post_comments (user_id);

CREATE OR REPLACE FUNCTION public.set_post_comments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_comments_set_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_post_comments_updated_at();

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 投稿を見られる人だけコメント閲覧
CREATE POLICY "post_comments_select_visible_posts"
  ON public.post_comments
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

-- 投稿を見られる本人としてのみ投稿
CREATE POLICY "post_comments_insert_own_on_visible_posts"
  ON public.post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.user_id = auth.uid()
          OR public.are_friends(auth.uid(), p.user_id)
        )
    )
  );

-- 本人のみ更新（MVPでは未使用だが将来の編集用）
CREATE POLICY "post_comments_update_own"
  ON public.post_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- コメント著者 または 投稿者 が削除可
CREATE POLICY "post_comments_delete_author_or_post_owner"
  ON public.post_comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- 通知タイプに comment を追加
-- ============================================================
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'reaction',
    'daily_event',
    'comment'
  ));

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, message)
    VALUES (
      post_owner,
      NEW.user_id,
      'comment',
      NEW.post_id,
      '投稿にコメントがありました'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_comments_notify
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();
