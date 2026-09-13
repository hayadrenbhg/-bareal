-- Be Reach: プロフィール拡張 + 投稿ピン留め
-- Migration: 20240908010000_profile_pins_and_public_fields

-- ============================================================
-- profiles: 公開プロフィール + 自分用設定
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS instagram_username TEXT,
  ADD COLUMN IF NOT EXISTS weekly_workout_goal INTEGER
    CHECK (weekly_workout_goal IS NULL OR (weekly_workout_goal >= 1 AND weekly_workout_goal <= 7)),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC
    CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm < 300)),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC
    CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 500)),
  ADD COLUMN IF NOT EXISTS favorite_exercises TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS training_weekdays INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS training_time_of_day TEXT
    CHECK (
      training_time_of_day IS NULL
      OR training_time_of_day IN ('morning', 'afternoon', 'evening', 'night', 'flexible')
    );

COMMENT ON COLUMN public.profiles.occupation IS '公開: 職業・所属';
COMMENT ON COLUMN public.profiles.instagram_username IS '公開: Instagram ユーザー名（@なし）';
COMMENT ON COLUMN public.profiles.weekly_workout_goal IS '公開可: 週の目標トレーニング回数';
COMMENT ON COLUMN public.profiles.height_cm IS '非公開想定: 身長';
COMMENT ON COLUMN public.profiles.weight_kg IS '非公開想定: 体重';

-- ============================================================
-- posts: ピン留め（最大3件・順序付き）
-- ============================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pin_order SMALLINT
    CHECK (pin_order IS NULL OR (pin_order >= 1 AND pin_order <= 3));

CREATE UNIQUE INDEX IF NOT EXISTS posts_user_pin_order_unique
  ON public.posts (user_id, pin_order)
  WHERE pin_order IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_user_pinned
  ON public.posts (user_id, pin_order)
  WHERE pin_order IS NOT NULL;
