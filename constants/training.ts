export type BodyPartKey =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'abs'
  | 'cardio'
  | 'full_body'
  | 'other';

export const BODY_PARTS: { key: BodyPartKey; label: string }[] = [
  { key: 'chest', label: '胸' },
  { key: 'back', label: '背中' },
  { key: 'legs', label: '脚' },
  { key: 'shoulders', label: '肩' },
  { key: 'arms', label: '腕' },
  { key: 'abs', label: '腹' },
  { key: 'cardio', label: '有酸素' },
  { key: 'full_body', label: '全身' },
  { key: 'other', label: 'その他' },
];

export const BODY_PART_LABEL: Record<BodyPartKey, string> = Object.fromEntries(
  BODY_PARTS.map((p) => [p.key, p.label]),
) as Record<BodyPartKey, string>;

/** 部位ごとの種目候補（任意選択用） */
export const EXERCISE_SUGGESTIONS: Record<BodyPartKey, string[]> = {
  chest: ['ベンチプレス', 'インクラインダンベルプレス', 'チェストプレス', 'ダンベルフライ'],
  back: ['デッドリフト', 'ラットプルダウン', 'ベントオーバーロウ', '懸垂'],
  legs: ['スクワット', 'レッグプレス', 'レッグカール', 'ルーマニアンデッドリフト'],
  shoulders: ['ショルダープレス', 'サイドレイズ', 'フロントレイズ', 'リアデルトフライ'],
  arms: ['バーベルカール', 'トライセプスプッシュダウン', 'ハンマーカール', 'ディップス'],
  abs: ['クランチ', 'レッグレイズ', 'プランク', 'アブローラー'],
  cardio: ['ランニング', 'バイク', 'ローイング', 'エアロバイク'],
  full_body: ['クリーン', 'スラスター', 'バーピー', 'ケトルベルスイング'],
  other: [],
};

export const WEEKLY_GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export function formatBodyPartsLabel(parts: BodyPartKey[]): string {
  return parts.map((p) => BODY_PART_LABEL[p] ?? p).join('・');
}
