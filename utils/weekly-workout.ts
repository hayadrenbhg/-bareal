import { AppConfig } from '@/constants/config';

/** JST の週（月曜始まり）で各曜日に投稿があるかを返す */
export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeeklyWorkoutDay = {
  key: WeekdayKey;
  label: string;
  dateKey: string;
  workout: 0 | 1;
};

export type WeeklyWorkoutSummary = {
  days: WeeklyWorkoutDay[];
  count: number;
  goal: number | null;
};

const WEEKDAY_LABELS: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: '月' },
  { key: 'tue', label: '火' },
  { key: 'wed', label: '水' },
  { key: 'thu', label: '木' },
  { key: 'fri', label: '金' },
  { key: 'sat', label: '土' },
  { key: 'sun', label: '日' },
];

function formatJstDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AppConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 今日を含む週の月曜 00:00（JST基準のカレンダー日）を Date で返す */
function getMondayOfCurrentWeekJst(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AppConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';

  // JST カレンダー日を UTC noon で表現し日付ずれを避ける
  const cursor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = map[weekday] ?? 0;
  cursor.setUTCDate(cursor.getUTCDate() - offset);
  return cursor;
}

export function buildWeeklyWorkoutSummary(
  postedAts: string[],
  goal: number | null = null,
  now = new Date(),
): WeeklyWorkoutSummary {
  const monday = getMondayOfCurrentWeekJst(now);
  const postedKeys = new Set(
    postedAts.map((iso) => formatJstDateKey(new Date(iso))),
  );

  const days: WeeklyWorkoutDay[] = WEEKDAY_LABELS.map((item, index) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + index);
    const dateKey = formatJstDateKey(d);
    return {
      key: item.key,
      label: item.label,
      dateKey,
      workout: postedKeys.has(dateKey) ? 1 : 0,
    };
  });

  return {
    days,
    count: days.reduce((sum, d) => sum + d.workout, 0),
    goal,
  };
}
