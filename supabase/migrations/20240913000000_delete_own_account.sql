-- Be Reach: 本人によるアカウント削除（App Store 要件）
-- Migration: 20240913000000_delete_own_account

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- 本人フォルダの画像を削除（avatars / posts）
  DELETE FROM storage.objects
  WHERE bucket_id IN ('avatars', 'posts')
    AND (storage.foldername(name))[1] = me::text;

  -- auth.users 削除 → profiles ほか CASCADE
  DELETE FROM auth.users WHERE id = me;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
