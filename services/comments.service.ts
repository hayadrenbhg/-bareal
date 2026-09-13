import { AppConfig } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

function mapCommentError(message: string): string {
  if (message.includes('post_comments_content_length')) {
    return `コメントは1〜${AppConfig.post.commentMaxLength}文字にしてください`;
  }
  return 'コメントの処理に失敗しました';
}

function mapRow(row: {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile: unknown;
}): PostComment {
  const profile = row.profile as PostComment['profile'];
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile,
  };
}

export async function fetchComments(
  postId: string,
  options?: { limit?: number; offset?: number },
): Promise<PostComment[]> {
  const limit = options?.limit ?? AppConfig.post.commentsPageSize;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from('post_comments')
    .select(
      `
      id,
      post_id,
      user_id,
      content,
      created_at,
      updated_at,
      profile:profiles!post_comments_user_id_fkey(
        id, username, display_name, avatar_url
      )
    `,
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error('コメントの取得に失敗しました');
  }

  return (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function createComment(input: {
  postId: string;
  userId: string;
  content: string;
}): Promise<PostComment> {
  const content = input.content.trim();
  if (!content) {
    throw new Error('コメントを入力してください');
  }
  if (content.length > AppConfig.post.commentMaxLength) {
    throw new Error(
      `コメントは${AppConfig.post.commentMaxLength}文字以内にしてください`,
    );
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      content,
    })
    .select(
      `
      id,
      post_id,
      user_id,
      content,
      created_at,
      updated_at,
      profile:profiles!post_comments_user_id_fkey(
        id, username, display_name, avatar_url
      )
    `,
    )
    .single();

  if (error) {
    throw new Error(mapCommentError(error.message));
  }

  return mapRow(data as Parameters<typeof mapRow>[0]);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error('コメントの削除に失敗しました');
  }
}
