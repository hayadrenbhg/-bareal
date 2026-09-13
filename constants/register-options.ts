/** 登録フロー用の候補定義（表示ラベル ↔ 保存値） */

export const GENDER_OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]['value'];

/** 将来 gyms テーブルへ接続しやすいよう key を持つ */
export const GYM_OPTIONS = [
  { key: 'anytime', label: 'エニタイムフィットネス' },
  { key: 'goldsgym', label: 'ゴールドジム' },
  { key: 'fitplace', label: 'FIT PLACE' },
  { key: 'chocozap', label: 'chocoZAP' },
  { key: 'university', label: '大学のジム' },
  { key: 'home', label: '自宅' },
  { key: 'other', label: 'その他' },
] as const;

export type GymOptionKey = (typeof GYM_OPTIONS)[number]['key'];

export const TRAINING_EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'これから始める' },
  { value: 'under_6m', label: '6か月未満' },
  { value: '6m_to_1y', label: '6か月〜1年' },
  { value: '1_to_3y', label: '1〜3年' },
  { value: '3_to_5y', label: '3〜5年' },
  { value: 'over_5y', label: '5年以上' },
] as const;

export type TrainingExperienceValue =
  (typeof TRAINING_EXPERIENCE_OPTIONS)[number]['value'];

export const TRAINING_GOAL_OPTIONS = [
  { value: 'hypertrophy', label: '筋肥大' },
  { value: 'strength', label: '筋力アップ' },
  { value: 'diet', label: 'ダイエット' },
  { value: 'health', label: '健康維持' },
  { value: 'bodymake', label: 'ボディメイク' },
  { value: 'sports', label: 'スポーツパフォーマンス' },
  { value: 'other', label: 'その他' },
] as const;

export type TrainingGoalValue = (typeof TRAINING_GOAL_OPTIONS)[number]['value'];
