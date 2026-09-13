import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/storage';
import type { Profile } from '@/types/database';
import type { TrainingGoalValue } from '@/constants/register-options';

export type ProfileUpdateInput = {
  display_name?: string | null;
  bio?: string;
  avatar_url?: string | null;
  birth_date?: string | null;
  gender?: Profile['gender'];
  gym_name?: string | null;
  gym_id?: string | null;
  training_experience?: Profile['training_experience'];
  onboarding_completed?: boolean;
  occupation?: string | null;
  instagram_username?: string | null;
  weekly_workout_goal?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  favorite_exercises?: string[];
  training_weekdays?: number[];
  training_time_of_day?: Profile['training_time_of_day'];
};

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error('プロフィールの更新に失敗しました');
  }

  return data;
}

export async function updateProfileWithAvatar(
  userId: string,
  localImageUri: string,
  profileInput: ProfileUpdateInput,
): Promise<Profile> {
  const avatarUrl = await uploadAvatar(userId, localImageUri);
  return updateProfile(userId, { ...profileInput, avatar_url: avatarUrl });
}

export async function replaceTrainingGoals(
  userId: string,
  goals: TrainingGoalValue[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('user_training_goals')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error('トレーニング目的の更新に失敗しました');
  }

  if (goals.length === 0) return;

  const { error: insertError } = await supabase.from('user_training_goals').insert(
    goals.map((goal) => ({ user_id: userId, goal })),
  );

  if (insertError) {
    throw new Error('トレーニング目的の保存に失敗しました');
  }
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('プロフィールの取得に失敗しました');
  }

  return data;
}
