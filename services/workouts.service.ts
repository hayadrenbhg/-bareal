import { AppConfig } from '@/constants/config';
import {
  BODY_PART_LABEL,
  type BodyPartKey,
  formatBodyPartsLabel,
} from '@/constants/training';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export type WorkoutExercise = {
  name: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};

export type WorkoutParticipant = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url'
>;

export type WorkoutSummary = {
  id: string;
  postId?: string | null;
  trainedAt: string;
  bodyParts: BodyPartKey[];
  exercises: string[];
  exerciseDetails: WorkoutExercise[];
  participants: WorkoutParticipant[];
  bodyPartsLabel: string;
  imageUrl?: string | null;
};

export type WorkoutProfileStats = {
  weekStart: string;
  weekDates: string[];
  monthCount: number;
  bodyPartCounts: Partial<Record<BodyPartKey, number>>;
  weeklyGoal: number | null;
  weeklyStreak: number;
};

export type ExerciseInput = {
  name: string;
  sets?: number | null;
  reps?: number | null;
  weightKg?: number | null;
};

function asBodyPart(value: string): BodyPartKey | null {
  if (value in BODY_PART_LABEL) return value as BodyPartKey;
  return null;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatExerciseLine(ex: WorkoutExercise): string {
  const bits: string[] = [ex.name];
  if (ex.weightKg != null) bits.push(`${ex.weightKg}kg`);
  if (ex.reps != null) bits.push(`×${ex.reps}`);
  if (ex.sets != null) bits.push(`×${ex.sets}set`);
  return bits.join(' ');
}

export function mapWorkoutRow(row: unknown): WorkoutSummary | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as {
    id?: string;
    post_id?: string | null;
    trained_at?: string;
    image_url?: string | null;
    posts?: { image_url?: string } | { image_url?: string }[] | null;
    body_parts?: { body_part: string }[] | null;
    exercises?: {
      exercise_name: string;
      sort_order?: number;
      sets?: number | null;
      reps?: number | null;
      weight_kg?: number | null;
    }[] | null;
    workout_body_parts?: { body_part: string }[] | null;
    workout_exercises?: {
      exercise_name: string;
      sort_order?: number;
      sets?: number | null;
      reps?: number | null;
      weight_kg?: number | null;
    }[] | null;
    participants?: {
      user_id?: string;
      profile?: Profile | Profile[] | null;
    }[] | null;
    workout_participants?: {
      user_id?: string;
      profile?: Profile | Profile[] | null;
    }[] | null;
  };

  if (!r.id || !r.trained_at) return null;

  const partRows = r.body_parts ?? r.workout_body_parts ?? [];
  const exerciseRows = [...(r.exercises ?? r.workout_exercises ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  const bodyParts = partRows
    .map((p) => asBodyPart(p.body_part))
    .filter((p): p is BodyPartKey => !!p);

  const exerciseDetails: WorkoutExercise[] = exerciseRows
    .map((e) => ({
      name: e.exercise_name.trim(),
      sets: e.sets ?? null,
      reps: e.reps ?? null,
      weightKg: e.weight_kg != null ? Number(e.weight_kg) : null,
    }))
    .filter((e) => !!e.name);

  const participantRows = r.participants ?? r.workout_participants ?? [];
  const participants: WorkoutParticipant[] = participantRows
    .map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      if (!profile) return null;
      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    })
    .filter((p): p is WorkoutParticipant => !!p);

  const postImage = Array.isArray(r.posts) ? r.posts[0]?.image_url : r.posts?.image_url;

  return {
    id: r.id,
    postId: r.post_id ?? null,
    trainedAt: r.trained_at,
    bodyParts,
    exercises: exerciseDetails.map((e) => e.name),
    exerciseDetails,
    participants,
    bodyPartsLabel: formatBodyPartsLabel(bodyParts),
    imageUrl: r.image_url ?? postImage ?? null,
  };
}

export async function createWorkoutForPost(input: {
  postId: string;
  bodyParts: BodyPartKey[];
  exercises?: ExerciseInput[];
  participantIds?: string[];
}): Promise<string> {
  const parts = Array.from(new Set(input.bodyParts));
  if (parts.length === 0) {
    throw new Error('トレーニング部位を選んでください');
  }
  if (parts.length > AppConfig.post.maxBodyParts) {
    throw new Error(`部位は${AppConfig.post.maxBodyParts}つまでです`);
  }

  const seen = new Set<string>();
  const exercisesPayload = (input.exercises ?? [])
    .map((e) => ({
      name: e.name.trim(),
      sets: parseOptionalNumber(e.sets),
      reps: parseOptionalNumber(e.reps),
      weight_kg: parseOptionalNumber(e.weightKg),
    }))
    .filter((e) => {
      if (!e.name || seen.has(e.name)) return false;
      seen.add(e.name);
      return true;
    })
    .slice(0, AppConfig.post.maxExercises);

  const participantIds = Array.from(
    new Set((input.participantIds ?? []).filter(Boolean)),
  ).slice(0, AppConfig.post.maxMentions);

  const { data, error } = await supabase.rpc('create_workout_for_post', {
    p_post_id: input.postId,
    p_body_parts: parts,
    p_exercises: exercisesPayload,
    p_participant_ids: participantIds,
  });

  if (error) {
    if (error.message.includes('body_parts_required')) {
      throw new Error('トレーニング部位を選んでください');
    }
    throw new Error('トレーニング記録の保存に失敗しました');
  }

  return data as string;
}

export async function fetchWorkoutProfileStats(
  userId: string,
): Promise<WorkoutProfileStats> {
  const { data, error } = await supabase.rpc('get_workout_profile_stats', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error('トレーニング集計の取得に失敗しました');
  }

  const row = data as {
    week_start?: string;
    week_dates?: string[];
    month_count?: number;
    body_part_counts?: Record<string, number>;
    weekly_goal?: number | null;
    weekly_streak?: number;
  };

  const bodyPartCounts: Partial<Record<BodyPartKey, number>> = {};
  Object.entries(row.body_part_counts ?? {}).forEach(([key, value]) => {
    const part = asBodyPart(key);
    if (part) bodyPartCounts[part] = value;
  });

  return {
    weekStart: row.week_start ?? '',
    weekDates: row.week_dates ?? [],
    monthCount: row.month_count ?? 0,
    bodyPartCounts,
    weeklyGoal: row.weekly_goal ?? null,
    weeklyStreak: row.weekly_streak ?? 0,
  };
}

export async function fetchWorkoutHistory(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<WorkoutSummary[]> {
  const limit = options?.limit ?? 30;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from('workouts')
    .select(
      `
      id,
      post_id,
      trained_at,
      body_parts:workout_body_parts(body_part),
      exercises:workout_exercises(exercise_name, sort_order, sets, reps, weight_kg),
      participants:workout_participants(
        user_id,
        profile:profiles!workout_participants_user_id_fkey(
          id, username, display_name, avatar_url
        )
      ),
      posts!workouts_post_id_fkey(image_url)
    `,
    )
    .eq('user_id', userId)
    .order('trained_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error('トレーニング履歴の取得に失敗しました');
  }

  return (data ?? [])
    .map((row) => mapWorkoutRow(row))
    .filter((w): w is WorkoutSummary => !!w);
}

/** フォールバック: 期間内の trained_at 一覧 */
export async function fetchWeeklyTrainedAts(
  userId: string,
  sinceIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('trained_at')
    .eq('user_id', userId)
    .gte('trained_at', sinceIso);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => row.trained_at);
}

export function remainingToGoal(count: number, goal: number | null): string | null {
  if (goal == null) return null;
  if (count >= goal) return '今週の目標達成';
  return `あと${goal - count}回`;
}
