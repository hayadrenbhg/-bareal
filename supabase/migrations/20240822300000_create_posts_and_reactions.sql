-- Be Reach: posts + reactions + posts storage
-- Migration: 20240822300000_create_posts_and_reactions

-- ============================================================
-- posts
-- ============================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daily_event_id UUID,
  timing_status TEXT CHECK (timing_status IS NULL OR timing_status IN ('on_time', 'late')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JST 基準で 1ユーザー1日1投稿
CREATE UNIQUE INDEX posts_one_per_day_jst
  ON public.posts (
    user_id,
    ((posted_at AT TIME ZONE 'Asia/Tokyo')::date)
  );

CREATE INDEX idx_posts_user_id ON public.posts (user_id);
CREATE INDEX idx_posts_posted_at ON public.posts (posted_at DESC);
CREATE INDEX idx_posts_daily_event_id ON public.posts (daily_event_id);

-- ============================================================
-- reactions（1ユーザー1投稿につき1リアクション）
-- ============================================================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL
    CHECK (reaction_type IN ('fire', 'muscle', 'thumbs_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reactions_unique_user_post UNIQUE (post_id, user_id)
);

CREATE INDEX idx_reactions_post_id ON public.reactions (post_id);
CREATE INDEX idx_reactions_user_id ON public.reactions (user_id);

-- ============================================================
-- RLS: posts
-- ============================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_own_or_friends"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.are_friends(auth.uid(), user_id)
  );

CREATE POLICY "posts_insert_own"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_delete_own"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- RLS: reactions
-- ============================================================
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_visible_posts"
  ON public.reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.user_id = auth.uid()
          OR public.are_friends(auth.uid(), p.user_id)
        )
    )
  );

CREATE POLICY "reactions_insert_own"
  ON public.reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.user_id = auth.uid()
          OR public.are_friends(auth.uid(), p.user_id)
        )
    )
  );

CREATE POLICY "reactions_update_own"
  ON public.reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own"
  ON public.reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Storage: posts bucket
-- パス: {user_id}/{post_id}.jpg
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "posts_images_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'posts');

CREATE POLICY "posts_images_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "posts_images_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "posts_images_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
