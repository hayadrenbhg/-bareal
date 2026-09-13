import { getTimingStatus, getTodayJstDateString } from '@/utils/post-timing';

describe('getTimingStatus', () => {
  const notify = new Date('2026-08-26T12:00:00+09:00');

  it('marks on_time within threshold', () => {
    const posted = new Date('2026-08-26T12:30:00+09:00');
    expect(getTimingStatus(notify, posted, 60)).toBe('on_time');
  });

  it('marks late after threshold', () => {
    const posted = new Date('2026-08-26T13:01:00+09:00');
    expect(getTimingStatus(notify, posted, 60)).toBe('late');
  });

  it('marks on_time when posted before notification', () => {
    const posted = new Date('2026-08-26T11:00:00+09:00');
    expect(getTimingStatus(notify, posted, 60)).toBe('on_time');
  });
});

describe('getTodayJstDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(getTodayJstDateString(new Date('2026-08-26T01:00:00+09:00'))).toBe(
      '2026-08-26',
    );
  });
});
