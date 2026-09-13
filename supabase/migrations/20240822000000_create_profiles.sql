-- Be Reach: profiles テーブル + Auth 連携 + RLS
-- Migration: 20240822000000_create_profiles

-- ============================================================
-- profiles テーブル
-- auth.users.id と 1:1 で紐づく
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_username_format
    CHECK (username ~ '^[a-zA-Z0-9]{1,20}$'),
  CONSTRAINT profiles_username_unique UNIQUE (username)
);

CREATE INDEX idx_profiles_username ON public.profiles (username);

-- ============================================================
-- 新規ユーザー登録時に profiles を自動作成
-- user_metadata.username を使用（signUp 時に渡す）
-- SECURITY DEFINER: auth スキーマから public.profiles へ INSERT するため
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username TEXT;
BEGIN
  new_username := LOWER(TRIM(NEW.raw_user_meta_data->>'username'));

  IF new_username IS NULL OR new_username = '' THEN
    RAISE EXCEPTION 'username is required';
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, new_username, new_username);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS: Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 全員がプロフィールを閲覧可能（SNS なので公開プロフィール）
CREATE POLICY "profiles_select_all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT は trigger 経由のみ（直接 INSERT 不可）
-- UPDATE は本人のみ
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE は本人のみ
CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
