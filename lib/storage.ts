import { supabase } from '@/lib/supabase';
import { compressImage, compressPostImage, uriToArrayBuffer } from '@/utils/image';

const AVATAR_BUCKET = 'avatars';
const POSTS_BUCKET = 'posts';

function getAvatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

function getPostPath(userId: string, postId: string): string {
  return `${userId}/${postId}.jpg`;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const compressed = await compressImage(localUri);
  const arrayBuffer = await uriToArrayBuffer(compressed.uri);
  const path = getAvatarPath(userId);

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new Error('画像のアップロードに失敗しました');
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([getAvatarPath(userId)]);

  if (error) {
    throw new Error('画像の削除に失敗しました');
  }
}

export async function uploadPostImage(
  userId: string,
  postId: string,
  localUri: string,
): Promise<string> {
  const compressed = await compressPostImage(localUri);
  const arrayBuffer = await uriToArrayBuffer(compressed.uri);
  const path = getPostPath(userId, postId);

  const { error } = await supabase.storage.from(POSTS_BUCKET).upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new Error('投稿画像のアップロードに失敗しました');
  }

  const { data } = supabase.storage.from(POSTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deletePostImage(userId: string, postId: string): Promise<void> {
  await supabase.storage.from(POSTS_BUCKET).remove([getPostPath(userId, postId)]);
}
