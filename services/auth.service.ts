import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import type { SignInInput, SignUpInput } from '@/types/app';

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  if (message.includes('User already registered')) {
    return 'このメールアドレスは既に登録されています';
  }
  if (message.includes('duplicate key') || message.includes('profiles_username_key')) {
    return 'このユーザー名は既に使用されています';
  }
  if (message.includes('Email not confirmed')) {
    return 'メールアドレスの確認が完了していません';
  }
  return '認証エラーが発生しました。もう一度お試しください';
}

export async function signUp({ username, email, password }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { username: username.trim().toLowerCase() },
    },
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error('ログアウトに失敗しました');
  }
}

/** 本人のアカウントと関連データを削除する（App Store 要件） */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) {
    throw new Error('アカウントの削除に失敗しました');
  }
  // ユーザー削除後はセッションが無効なので、失敗しても無視する
  await supabase.auth.signOut().catch(() => undefined);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('プロフィールの取得に失敗しました');
  }

  return data;
}

/** 登録前のユーザー名重複チェック */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  const { data, error } = await supabase.rpc('is_username_available', {
    check_username: normalized,
  });

  if (error) {
    throw new Error('ユーザー名の確認に失敗しました');
  }

  return data === true;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error('セッションの取得に失敗しました');
  }
  return data.session;
}
