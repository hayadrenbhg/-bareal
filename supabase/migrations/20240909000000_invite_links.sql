-- Be Reach: 招待リンク
-- Migration: 20240909000000_invite_links

CREATE TABLE public.invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  used_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT invite_links_token_unique UNIQUE (token)
);

CREATE INDEX idx_invite_links_user_id ON public.invite_links (user_id);
CREATE INDEX idx_invite_links_token_active
  ON public.invite_links (token)
  WHERE is_active = true;

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- 本人のみ自分のリンクを閲覧・作成・更新
CREATE POLICY "invite_links_select_own"
  ON public.invite_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "invite_links_insert_own"
  ON public.invite_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invite_links_update_own"
  ON public.invite_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 招待プレビュー（ログイン不要・公開プロフィール最小限）
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token TEXT)
RETURNS TABLE (
  token TEXT,
  inviter_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link public.invite_links%ROWTYPE;
  prof public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO link
  FROM public.invite_links
  WHERE invite_links.token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      p_token, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      false, 'not_found'::TEXT;
    RETURN;
  END IF;

  IF link.is_active IS NOT TRUE THEN
    RETURN QUERY SELECT
      link.token, link.user_id, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      false, 'inactive'::TEXT;
    RETURN;
  END IF;

  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RETURN QUERY SELECT
      link.token, link.user_id, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      false, 'expired'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = link.user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      link.token, link.user_id, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      false, 'inviter_missing'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    link.token,
    prof.id,
    prof.username,
    prof.display_name,
    prof.avatar_url,
    true,
    NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(TEXT) TO anon, authenticated;

-- ============================================================
-- 招待を承認して友達成立（accepted）
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
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'unauthenticated');
  END IF;

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

  -- 既存関係（双方向）
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
      -- どちら向きでも accepted に更新
      UPDATE public.friendships
      SET status = 'accepted', updated_at = now()
      WHERE id = existing.id
      RETURNING id INTO new_id;

      UPDATE public.invite_links
      SET used_count = used_count + 1
      WHERE id = link.id;

      RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'friendship_id', new_id);
    END IF;

    -- rejected → 削除して新規
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
