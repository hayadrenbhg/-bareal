/** アプリ全体の設定値 — ハードコードを避け、ここで一元管理 */

export const AppConfig = {
  /** 日次投稿制限・daily_event の基準タイムゾーン（暫定: 日本向け） */
  timezone: 'Asia/Tokyo',

  /** 1日あたりの最大投稿数（DBトリガーと一致させる） */
  maxPostsPerDay: 2,

  /** 通知から何分以内を ON TIME とするか（Phase 2 で使用） */
  onTimeThresholdMinutes: 60,

  /** ユーザー名: 英数字のみ、最大文字数 */
  username: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9]+$/,
  },

  /** パスワード最小文字数 */
  passwordMinLength: 8,

  /** プロフィール */
  profile: {
    displayNameMaxLength: 30,
    bioMaxLength: 160,
  },

  /** 問い合わせ・審査用（公開後に実在アドレスへ差し替え） */
  supportEmail: 'support@bereach.app',

  /**
   * App Store 提出用の公開 URL。
   * 独自ドメイン公開後に差し替える。当面はアプリ内 /legal を正本とする。
   */
  legal: {
    privacyPath: '/legal/privacy',
    termsPath: '/legal/terms',
    privacyUrl: 'https://bereach.app/legal/privacy',
    termsUrl: 'https://bereach.app/legal/terms',
  },

  /** 投稿 */
  post: {
    captionMaxLength: 100,
    maxMentions: 5,
    commentMaxLength: 200,
    commentsPageSize: 20,
    maxBodyParts: 5,
    maxExercises: 8,
  },
} as const;
