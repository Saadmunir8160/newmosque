import { resolveNextPrayer, DEFAULT_PRAYER_TIMEZONE, countdownToJamaat } from './prayer.utils';
import { PrayerTimesDaily } from '../models';

describe('Prayer Utils', () => {
  const todayTimes: PrayerTimesDaily = {
    id: 1, mosqueId: 1, date: '2026-09-03',
    fajrStart: '05:00', fajrJamaat: '05:20',
    dhuhrStart: '13:00', dhuhrJamaat: '13:30',
    asrStart: '16:00', asrJamaat: '16:30',
    maghribStart: '19:00', maghribJamaat: '19:10',
    ishaStart: '21:00', ishaJamaat: '21:30'
  };

  const tomorrowTimes: PrayerTimesDaily = {
    id: 2, mosqueId: 1, date: '2026-09-04',
    fajrStart: '05:10', fajrJamaat: '05:30',
    dhuhrStart: '13:00', dhuhrJamaat: '13:30',
    asrStart: '16:00', asrJamaat: '16:30',
    maghribStart: '19:00', maghribJamaat: '19:10',
    ishaStart: '21:00', ishaJamaat: '21:30'
  };

  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('Normal daytime: resolves Asr between Dhuhr and Asr', () => {
    jasmine.clock().mockDate(new Date('2026-09-03T15:00:00Z'));
    const next = resolveNextPrayer(todayTimes, DEFAULT_PRAYER_TIMEZONE, tomorrowTimes);
    expect(next.name).toBe('Asr');
    expect(next.jamaat).toBe('16:30');
  });

  it('After Isha: resolves tomorrow Fajr using tomorrow values', () => {
    jasmine.clock().mockDate(new Date('2026-09-03T22:00:00Z'));
    const next = resolveNextPrayer(todayTimes, DEFAULT_PRAYER_TIMEZONE, tomorrowTimes);
    expect(next.name).toBe('Fajr (tomorrow)');
    expect(next.start).toBe('05:10'); // from tomorrow
    expect(next.jamaat).toBe('05:30'); // from tomorrow
  });

  it('After Isha: fallback to today values if tomorrow missing', () => {
    jasmine.clock().mockDate(new Date('2026-09-03T22:00:00Z'));
    const next = resolveNextPrayer(todayTimes, DEFAULT_PRAYER_TIMEZONE, null);
    expect(next.name).toBe('Fajr (tomorrow)');
    expect(next.start).toBe('05:00'); // fallback to today
    expect(next.jamaat).toBe('05:20'); // fallback to today
  });
});
