
-- Be Reach: Workout（投稿と連動するトレーニング記録）
-- Migration: 20240911000000_workouts

-- ============================================================
-- workouts: Post と 1:1
-- ============================================================
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_user_trained_at
  ON public.workouts (user_id, trained_at DESC);

CREATE OR REPLACE FUNCTION public.set_workouts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workouts_set_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workouts_updated_at();

-- ============================================================
-- workout_body_parts（複数部位）
-- ============================================================
CREATE TABLE public.workout_body_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  body_part TEXT NOT NULL
    CHECK (body_part IN (
      'chest', 'back', 'legs', 'shoulders', 'arms',
      'abs', 'cardio', 'full_body', 'other'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_body_parts_unique UNIQUE (workout_id, body_part)
);

CREATE INDEX idx_workout_body_parts_workout_id
  ON public.workout_body_parts (workout_id);
CREATE INDEX idx_workout_body_parts_body_part
  ON public.workout_body_parts (body_part);

-- ============================================================
-- workout_exercises（種目・将来 weight/reps 拡張可）
-- ============================================================
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL
    CHECK (char_length(trim(exercise_name)) >= 1 AND char_length(exercise_name) <= 80),
  exercise_id UUID,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  sets INTEGER,
  reps INTEGER,
  weight_kg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_exercises_workout_id
  ON public.workout_exercises (workout_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_body_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts_select_own_or_friends"
  ON public.workouts FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.are_friends(auth.uid(), user_id)
  );

CREATE POLICY "workouts_insert_own"
  ON public.workouts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "workouts_update_own"
  ON public.workouts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_delete_own"
  ON public.workouts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "workout_body_parts_select_visible"
  ON public.workout_body_parts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
        AND (w.user_id = auth.uid() OR public.are_friends(auth.uid(), w.user_id))
    )
  );

CREATE POLICY "workout_body_parts_insert_own"
  ON public.workout_body_parts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_body_parts_delete_own"
  ON public.workout_body_parts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_select_visible"
  ON public.workout_exercises FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
        AND (w.user_id = auth.uid() OR public.are_friends(auth.uid(), w.user_id))
    )
  );

CREATE POLICY "workout_exercises_insert_own"
  ON public.workout_exercises FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_delete_own"
  ON public.workout_exercises FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

-- ============================================================
-- 投稿に紐づく Workout を一括作成（原子性）
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_workout_for_post(
  p_post_id UUID,
  p_body_parts TEXT[],
  p_exercises TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  post_row public.posts%ROWTYPE;
  new_id UUID;
  part TEXT;
  ex TEXT;
  idx INTEGER := 0;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_body_parts IS NULL OR array_length(p_body_parts, 1) IS NULL THEN
    RAISE EXCEPTION 'body_parts_required';
  END IF;

  IF array_length(p_body_parts, 1) > 5 THEN
    RAISE EXCEPTION 'body_parts_limit';
  END IF;

  SELECT * INTO post_row FROM public.posts WHERE id = p_post_id;
  IF NOT FOUND OR post_row.user_id <> me THEN
    RAISE EXCEPTION 'post_not_owned';
  END IF;

  IF EXISTS (SELECT 1 FROM public.workouts WHERE post_id = p_post_id) THEN
    RAISE EXCEPTION 'workout_exists';
  END IF;

  INSERT INTO public.workouts (user_id, post_id, trained_at)
  VALUES (me, p_post_id, post_row.posted_at)
  RETURNING id INTO new_id;

  FOREACH part IN ARRAY p_body_parts LOOP
    IF part NOT IN (
      'chest', 'back', 'legs', 'shoulders', 'arms',
      'abs', 'cardio', 'full_body', 'other'
    ) THEN
      RAISE EXCEPTION 'invalid_body_part';
    END IF;
    INSERT INTO public.workout_body_parts (workout_id, body_part)
    VALUES (new_id, part)
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF p_exercises IS NOT NULL THEN
    FOREACH ex IN ARRAY p_exercises LOOP
      ex := trim(ex);
      IF ex = '' THEN
        CONTINUE;
      END IF;
      IF char_length(ex) > 80 THEN
        RAISE EXCEPTION 'exercise_name_too_long';
      END IF;
      IF idx >= 8 THEN
        EXIT;
      END IF;
      INSERT INTO public.workout_exercises (workout_id, exercise_name, sort_order)
      VALUES (new_id, ex, idx);
      idx := idx + 1;
    END LOOP;
  END IF;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workout_for_post(UUID, TEXT[], TEXT[]) TO authenticated;

-- ============================================================
-- 既存 posts を workouts にバックフィル（部位なしでも週次集計可能）
-- ============================================================
INSERT INTO public.workouts (user_id, post_id, trained_at)
SELECT p.user_id, p.id, p.posted_at
FROM public.posts p
WHERE NOT EXISTS (
  SELECT 1 FROM public.workouts w WHERE w.post_id = p.id
);

-- ============================================================
-- プロフィール用集計 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_workout_profile_stats(
  p_user_id UUID,
  p_week_start DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  week_start DATE;
  month_start TIMESTAMPTZ;
  month_count INTEGER;
  week_dates TEXT[];
  body_counts JSONB;
  goal INTEGER;
  streak INTEGER := 0;
  w DATE;
  cnt INTEGER;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_user_id <> me AND NOT public.are_friends(me, p_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_week_start IS NULL THEN
    week_start := date_trunc(
      'week',
      (now() AT TIME ZONE 'Asia/Tokyo')
    )::date;
  ELSE
    week_start := p_week_start;
  END IF;

  month_start := date_trunc(
    'month',
    (now() AT TIME ZONE 'Asia/Tokyo')
  ) AT TIME ZONE 'Asia/Tokyo';

  SELECT COUNT(*)::INTEGER INTO month_count
  FROM public.workouts
  WHERE user_id = p_user_id
    AND trained_at >= month_start;

  SELECT COALESCE(array_agg(d ORDER BY d), '{}') INTO week_dates
  FROM (
    SELECT DISTINCT ((trained_at AT TIME ZONE 'Asia/Tokyo')::date)::TEXT AS d
    FROM public.workouts
    WHERE user_id = p_user_id
      AND (trained_at AT TIME ZONE 'Asia/Tokyo')::date >= week_start
      AND (trained_at AT TIME ZONE 'Asia/Tokyo')::date < week_start + 7
  ) s;

  SELECT COALESCE(jsonb_object_agg(body_part, c), '{}'::jsonb)
  INTO body_counts
  FROM (
    SELECT bp.body_part, COUNT(*)::INTEGER AS c
    FROM public.workout_body_parts bp
    JOIN public.workouts w ON w.id = bp.workout_id
    WHERE w.user_id = p_user_id
      AND (w.trained_at AT TIME ZONE 'Asia/Tokyo')::date >= week_start
      AND (w.trained_at AT TIME ZONE 'Asia/Tokyo')::date < week_start + 7
    GROUP BY bp.body_part
  ) t;

  SELECT weekly_workout_goal INTO goal
  FROM public.profiles
  WHERE id = p_user_id;

  IF goal IS NOT NULL AND goal > 0 THEN
    w := week_start;
    -- 今週が未達成なら、前週から数える
    SELECT COUNT(*)::INTEGER INTO cnt
    FROM public.workouts
    WHERE user_id = p_user_id
      AND (trained_at AT TIME ZONE 'Asia/Tokyo')::date >= w
      AND (trained_at AT TIME ZONE 'Asia/Tokyo')::date < w + 7;

    IF cnt < goal THEN
      w := w - 7;
    END IF;

    LOOP
      SELECT COUNT(*)::INTEGER INTO cnt
      FROM public.workouts
      WHERE user_id = p_user_id
        AND (trained_at AT TIME ZONE 'Asia/Tokyo')::date >= w
        AND (trained_at AT TIME ZONE 'Asia/Tokyo')::date < w + 7;

      EXIT WHEN cnt < goal;
      streak := streak + 1;
      w := w - 7;
      EXIT WHEN streak >= 104;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'week_start', week_start,
    'week_dates', to_jsonb(week_dates),
    'month_count', month_count,
    'body_part_counts', body_counts,
    'weekly_goal', goal,
    'weekly_streak', streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workout_profile_stats(UUID, DATE) TO authenticated;
