-- Be Reach: 招待リンクの軽いレート制限
-- Migration: 20240909010000_invite_rate_limits

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 招待試行ログ（悪用・連打対策の最小構成）
CREATE TABLE IF NOT EXISTS public.invite_accept_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_accept_attempts_user_created
  ON public.invite_accept_attempts (user_id, created_at DESC);

ALTER TABLE public.invite_accept_attempts ENABLE ROW LEVEL SECURITY;

-- 本人は自分の試行のみ閲覧（デバッグ用）。書き込みは RPC のみ
CREATE POLICY "invite_accept_attempts_select_own"
  ON public.invite_accept_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- accept_invite: 1ユーザーあたり直近1分で20回まで
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  link public.invite_links%ROWTYPE;
  existing public.friendships%ROWTYPE;
  new_id UUID;
  recent_count INTEGER;
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'unauthenticated');
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.invite_accept_attempts
  WHERE user_id = me
    AND created_at > now() - interval '1 minute';

  IF recent_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'rate_limited');
  END IF;

  INSERT INTO public.invite_accept_attempts (user_id, token)
  VALUES (me, p_token);

  SELECT * INTO link
  FROM public.invite_links
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND OR link.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid');
  END IF;

  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'status', 'expired');
  END IF;

  IF link.user_id = me THEN
    RETURN jsonb_build_object('ok', false, 'status', 'self');
  END IF;

  SELECT * INTO existing
  FROM public.friendships
  WHERE
    (requester_id = link.user_id AND addressee_id = me)
    OR (requester_id = me AND addressee_id = link.user_id)
  LIMIT 1;

  IF FOUND THEN
    IF existing.status = 'accepted' THEN
      RETURN jsonb_build_object('ok', true, 'status', 'already_friends', 'friendship_id', existing.id);
    END IF;

    IF existing.status = 'pending' THEN
      UPDATE public.friendships
      SET status = 'accepted', updated_at = now()
      WHERE id = existing.id
      RETURNING id INTO new_id;

      UPDATE public.invite_links
      SET used_count = used_count + 1
      WHERE id = link.id;

      RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'friendship_id', new_id);
    END IF;

    DELETE FROM public.friendships WHERE id = existing.id;
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (link.user_id, me, 'accepted')
  RETURNING id INTO new_id;

  UPDATE public.invite_links
  SET used_count = used_count + 1
  WHERE id = link.id;

  RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'friendship_id', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

-- ============================================================
-- 招待リンク再発行 RPC（1ユーザーあたり1時間に5回まで）
-- ============================================================
CREATE OR REPLACE FUNCTION public.regenerate_invite_link(
  p_expires_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  recent_count INTEGER;
  new_token TEXT;
  new_expires TIMESTAMPTZ;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_expires_days IS NOT NULL AND (p_expires_days < 1 OR p_expires_days > 365) THEN
    RAISE EXCEPTION 'invalid_expires_days';
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.invite_links
  WHERE user_id = me
    AND created_at > now() - interval '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  UPDATE public.invite_links
  SET is_active = false
  WHERE user_id = me
    AND is_active = true;

  -- 32 bytes → hex 64 chars（推測困難な乱数）
  new_token := encode(extensions.gen_random_bytes(32), 'hex');

  IF p_expires_days IS NULL THEN
    new_expires := NULL;
  ELSE
    new_expires := now() + make_interval(days => p_expires_days);
  END IF;

  INSERT INTO public.invite_links (user_id, token, expires_at, is_active)
  VALUES (me, new_token, new_expires, true);

  RETURN QUERY SELECT new_token, new_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_invite_link(INTEGER) TO authenticated;

-- 有効リンク取得 or なければ作成（再発行と同じレート制限の土台）
CREATE OR REPLACE FUNCTION public.get_or_create_invite_link(
  p_expires_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  existing public.invite_links%ROWTYPE;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO existing
  FROM public.invite_links
  WHERE user_id = me
    AND is_active = true
    AND (invite_links.expires_at IS NULL OR invite_links.expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT existing.token, existing.expires_at;
    RETURN;
  END IF;

  -- 期限切れ・無効のみなら再発行ロジックへ
  RETURN QUERY
  SELECT r.token, r.expires_at
  FROM public.regenerate_invite_link(p_expires_days) AS r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_invite_link(INTEGER) TO authenticated;
