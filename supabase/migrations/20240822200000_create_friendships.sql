-- Be Reach: friendships テーブル + RLS
-- Migration: 20240822200000_create_friendships

-- ============================================================
-- friendships
-- requester = 申請した人 / addressee = 申請された人
-- status: pending → accepted / rejected
-- ============================================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester_status
  ON public.friendships (requester_id, status);

CREATE INDEX idx_friendships_addressee_status
  ON public.friendships (addressee_id, status);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.set_friendships_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_set_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_friendships_updated_at();

-- ============================================================
-- 友達判定ヘルパー（投稿フィードの RLS でも再利用）
-- SECURITY DEFINER: 呼び出し元の RLS に依存せず判定できる
-- ============================================================
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = user_a AND f.addressee_id = user_b)
        OR
        (f.requester_id = user_b AND f.addressee_id = user_a)
      )
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 当事者のみ閲覧可能
CREATE POLICY "friendships_select_participants"
  ON public.friendships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
  );

-- 申請は自分から相手へだけ
CREATE POLICY "friendships_insert_as_requester"
  ON public.friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
  );

-- 承認/拒否は申請された側のみ（pending → accepted/rejected）
CREATE POLICY "friendships_update_addressee"
  ON public.friendships
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = addressee_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = addressee_id
    AND status IN ('accepted', 'rejected')
  );

-- 当事者は削除可能（申請キャンセル・友達解除）
CREATE POLICY "friendships_delete_participants"
  ON public.friendships
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = addressee_id
  );
