import { AppConfig } from '@/constants/config';

export type TimingStatus = 'on_time' | 'late';

/**
 * 通知時刻と投稿時刻の差から ON TIME / LATE を判定
 * 閾値は AppConfig.onTimeThresholdMinutes（デフォルト60分）
 */
export function getTimingStatus(
  notificationTime: Date | string,
  postedAt: Date | string,
  thresholdMinutes: number = AppConfig.onTimeThresholdMinutes,
): TimingStatus {
  const notify = typeof notificationTime === 'string'
    ? new Date(notificationTime)
    : notificationTime;
  const posted = typeof postedAt === 'string' ? new Date(postedAt) : postedAt;

  const diffMs = posted.getTime() - notify.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  // 通知前の投稿も ON TIME 扱い（通知を待たずに投稿した場合）
  if (diffMinutes <= thresholdMinutes) {
    return 'on_time';
  }

  return 'late';
}

/** JST の今日の日付文字列 YYYY-MM-DD */
export function getTodayJstDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AppConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 投稿時刻を相対表示 */
export function formatPostTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: AppConfig.timezone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** コメント用の相対時刻（〜前 / 昨日 / 日付） */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'たった今';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;

  const today = getTodayJstDateString(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = getTodayJstDateString(yesterdayDate);
  const day = getTodayJstDateString(date);

  if (day === yesterday) return '昨日';
  if (day === today) return formatPostTime(iso);

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: AppConfig.timezone,
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}
