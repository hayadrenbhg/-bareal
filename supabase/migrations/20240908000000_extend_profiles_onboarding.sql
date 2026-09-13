-- Be Reach: 登録オンボーディング用プロフィール拡張
-- Migration: 20240908000000_extend_profiles_onboarding

-- ============================================================
-- profiles 拡張（将来の gyms / gym_id に備え gym_name を保持）
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS gym_name TEXT,
  ADD COLUMN IF NOT EXISTS gym_id UUID,
  ADD COLUMN IF NOT EXISTS training_experience TEXT
    CHECK (
      training_experience IS NULL OR training_experience IN (
        'beginner',
        'under_6m',
        '6m_to_1y',
        '1_to_3y',
        '3_to_5y',
        'over_5y'
      )
    ),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 既存ユーザーはオンボーディング済み扱い（ホームに入れなくならないように）
UPDATE public.profiles
SET onboarding_completed = true;

-- ============================================================
-- トレーニング目的（複数選択）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_training_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal TEXT NOT NULL
    CHECK (goal IN (
      'hypertrophy',
      'strength',
      'diet',
      'health',
      'bodymake',
      'sports',
      'other'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_training_goals_unique UNIQUE (user_id, goal)
);

CREATE INDEX IF NOT EXISTS idx_user_training_goals_user_id
  ON public.user_training_goals (user_id);

ALTER TABLE public.user_training_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_training_goals_select_own"
  ON public.user_training_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_training_goals_insert_own"
  ON public.user_training_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_training_goals_delete_own"
  ON public.user_training_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- 未ログイン時のユーザー名重複チェック用
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = LOWER(TRIM(check_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;
