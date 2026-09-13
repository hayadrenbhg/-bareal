import * as ImageManipulator from 'expo-image-manipulator';

const AVATAR_MAX_SIZE = 512;
const POST_MAX_SIZE = 1080;
const IMAGE_QUALITY = 0.8;

export type CompressedImage = {
  uri: string;
  width: number;
  height: number;
};

export async function compressImage(
  uri: string,
  maxWidth: number = AVATAR_MAX_SIZE,
): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

export async function compressPostImage(uri: string): Promise<CompressedImage> {
  return compressImage(uri, POST_MAX_SIZE);
}

export async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('画像の読み込みに失敗しました');
  }
  return response.arrayBuffer();
}
