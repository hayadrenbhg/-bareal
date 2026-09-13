-- Be Reach: Workout 履歴拡張（participants + exercise details RPC）
-- Migration: 20240911010000_workout_details_and_participants

-- ============================================================
-- workout_participants（合トレ仲間・将来拡張用）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_participants_unique UNIQUE (workout_id, user_id),
  CONSTRAINT workout_participants_no_owner CHECK (true)
);

CREATE INDEX IF NOT EXISTS idx_workout_participants_workout_id
  ON public.workout_participants (workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_participants_user_id
  ON public.workout_participants (user_id);

ALTER TABLE public.workout_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_participants_select_visible"
  ON public.workout_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
        AND (w.user_id = auth.uid() OR public.are_friends(auth.uid(), w.user_id))
    )
  );

CREATE POLICY "workout_participants_insert_own"
  ON public.workout_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
    AND public.are_friends(auth.uid(), user_id)
    AND auth.uid() <> user_id
  );

CREATE POLICY "workout_participants_delete_own"
  ON public.workout_participants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );

-- 既存 post_mentions → workout_participants へバックフィル（テーブルがある場合のみ）
DO $$
BEGIN
  IF to_regclass('public.post_mentions') IS NOT NULL THEN
    INSERT INTO public.workout_participants (workout_id, user_id)
    SELECT w.id, pm.mentioned_user_id
    FROM public.workouts w
    JOIN public.post_mentions pm ON pm.post_id = w.post_id
    WHERE public.are_friends(w.user_id, pm.mentioned_user_id)
      AND w.user_id <> pm.mentioned_user_id
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- create_workout_for_post を拡張
-- p_exercises: [{ "name": "...", "sets": 3, "reps": 8, "weight_kg": 60 }]
-- ============================================================
DROP FUNCTION IF EXISTS public.create_workout_for_post(UUID, TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION public.create_workout_for_post(
  p_post_id UUID,
  p_body_parts TEXT[],
  p_exercises JSONB DEFAULT '[]'::JSONB,
  p_participant_ids UUID[] DEFAULT '{}'::UUID[]
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
  ex JSONB;
  ex_name TEXT;
  idx INTEGER := 0;
  participant UUID;
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

  IF p_exercises IS NOT NULL AND jsonb_typeof(p_exercises) = 'array' THEN
    FOR ex IN SELECT * FROM jsonb_array_elements(p_exercises)
    LOOP
      IF idx >= 8 THEN
        EXIT;
      END IF;

      ex_name := trim(COALESCE(ex->>'name', ''));
      IF ex_name = '' THEN
        CONTINUE;
      END IF;
      IF char_length(ex_name) > 80 THEN
        RAISE EXCEPTION 'exercise_name_too_long';
      END IF;

      INSERT INTO public.workout_exercises (
        workout_id,
        exercise_name,
        sort_order,
        sets,
        reps,
        weight_kg
      )
      VALUES (
        new_id,
        ex_name,
        idx,
        CASE
          WHEN (ex->>'sets') ~ '^[0-9]+$' THEN (ex->>'sets')::INTEGER
          ELSE NULL
        END,
        CASE
          WHEN (ex->>'reps') ~ '^[0-9]+$' THEN (ex->>'reps')::INTEGER
          ELSE NULL
        END,
        CASE
          WHEN (ex->>'weight_kg') ~ '^[0-9]+(\.[0-9]+)?$' THEN (ex->>'weight_kg')::NUMERIC
          ELSE NULL
        END
      );
      idx := idx + 1;
    END LOOP;
  END IF;

  IF p_participant_ids IS NOT NULL THEN
    FOREACH participant IN ARRAY p_participant_ids LOOP
      IF participant = me THEN
        CONTINUE;
      END IF;
      IF NOT public.are_friends(me, participant) THEN
        CONTINUE;
      END IF;
      INSERT INTO public.workout_participants (workout_id, user_id)
      VALUES (new_id, participant)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workout_for_post(UUID, TEXT[], JSONB, UUID[]) TO authenticated;

-- 互換: 旧 TEXT[] exercises 呼び出しはアプリ側で移行済み想定
