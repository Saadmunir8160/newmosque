import { NextPrayer, PrayerTimesDaily } from '../models';

export const DEFAULT_PRAYER_TIMEZONE = 'Europe/London';

export interface PrayerSlot {
  name: string;
  start: string;
  jamaat: string;
}

export interface ZonedNow {
  hours: number;
  minutes: number;
  seconds: number;
  /** Seconds since midnight in the target timezone. */
  totalSeconds: number;
  /** 0=Sunday … 6=Saturday in the target timezone. */
  dayOfWeek: number;
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Current clock parts in a mosque timezone (default Europe/London). */
export function nowInTimezone(timeZone: string = DEFAULT_PRAYER_TIMEZONE): ZonedNow {
  const tz = timeZone?.trim() || DEFAULT_PRAYER_TIMEZONE;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    }).formatToParts(new Date());

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
    const hours = Number(get('hour'));
    const minutes = Number(get('minute'));
    const seconds = Number(get('second'));
    const dayOfWeek = WEEKDAY_TO_INDEX[get('weekday')] ?? new Date().getDay();
    return {
      hours,
      minutes,
      seconds,
      totalSeconds: hours * 3600 + minutes * 60 + seconds,
      dayOfWeek,
    };
  } catch {
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      totalSeconds: now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds(),
      dayOfWeek: now.getDay(),
    };
  }
}

export function getPrayerSlots(times: PrayerTimesDaily): PrayerSlot[] {
  return [
    { name: 'Fajr', start: times.fajrStart, jamaat: times.fajrJamaat },
    { name: 'Dhuhr', start: times.dhuhrStart, jamaat: times.dhuhrJamaat },
    { name: 'Asr', start: times.asrStart, jamaat: times.asrJamaat },
    { name: 'Maghrib', start: times.maghribStart, jamaat: times.maghribJamaat },
    { name: 'Isha', start: times.ishaStart, jamaat: times.ishaJamaat }
  ];
}

/** Parse "HH:mm:ss" to total seconds since midnight. */
export function timeToSeconds(t: string): number {
  const [h, m, s = '0'] = (t || '0:0:0').split(':');
  return +h * 3600 + +m * 60 + +s;
}

export function formatTime12(t: string): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function resolveNextPrayer(
  times: PrayerTimesDaily,
  timeZone: string = DEFAULT_PRAYER_TIMEZONE,
): NextPrayer {
  const nowSec = nowInTimezone(timeZone).totalSeconds;
  const slots = getPrayerSlots(times);

  for (const p of slots) {
    if (timeToSeconds(p.jamaat) > nowSec) {
      return { name: p.name, start: p.start, jamaat: p.jamaat };
    }
  }
  return { name: 'Fajr (tomorrow)', start: times.fajrStart, jamaat: times.fajrJamaat };
}

export function countdownToJamaat(
  jamaat: string,
  timeZone: string = DEFAULT_PRAYER_TIMEZONE,
): string {
  const targetSec = timeToSeconds(jamaat);
  const nowSec = nowInTimezone(timeZone).totalSeconds;
  let diff = targetSec - nowSec;
  if (diff < 0) diff += 24 * 3600;

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface JumuahSlotCountdown {
  slotNumber: number;
  jamaatTime: string;
  countdown: string;
  active: boolean;
}

/** Next upcoming Jumuah jamaat on Fridays (in mosque timezone). */
export function resolveJumuahCountdowns(
  slots: { slotNumber: number; jamaatTime: string }[],
  timeZone: string = DEFAULT_PRAYER_TIMEZONE,
): JumuahSlotCountdown[] {
  const zoned = nowInTimezone(timeZone);
  const isFriday = zoned.dayOfWeek === 5;
  const nowSec = zoned.totalSeconds;
  let nextFound = false;

  return [...slots]
    .sort((a, b) => timeToSeconds(a.jamaatTime) - timeToSeconds(b.jamaatTime))
    .map(slot => {
      const upcoming = isFriday && !nextFound && timeToSeconds(slot.jamaatTime) > nowSec;
      if (upcoming) nextFound = true;
      return {
        slotNumber: slot.slotNumber,
        jamaatTime: slot.jamaatTime,
        countdown: isFriday ? countdownToJamaat(slot.jamaatTime, timeZone) : '',
        active: upcoming,
      };
    });
}

export function nextJumuahCountdown(
  slots: { slotNumber: number; jamaatTime: string }[],
  timeZone: string = DEFAULT_PRAYER_TIMEZONE,
): { slotNumber: number; jamaatTime: string; countdown: string } | null {
  const list = resolveJumuahCountdowns(slots, timeZone);
  return list.find(s => s.active) ?? null;
}

/** Prayer period currently in effect (by adhān start times). */
export function getActivePrayerName(
  times: PrayerTimesDaily,
  timeZone: string = DEFAULT_PRAYER_TIMEZONE,
): string {
  const nowSec = nowInTimezone(timeZone).totalSeconds;
  const slots = getPrayerSlots(times);
  let active = 'Isha';
  for (const p of slots) {
    if (nowSec < timeToSeconds(p.start)) break;
    active = p.name;
  }
  return active;
}

export function formatHijriDate(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      calendar: 'islamic-umalqura',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      calendar: 'islamic',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}

export function getIslamicMonth(date = new Date()): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US-u-ca-islamic', { month: 'numeric' }).format(date),
    10
  );
}

export function isRamadan(date = new Date()): boolean {
  return getIslamicMonth(date) === 9;
}

/** Minutes before adhān — common last-minute Suhoor cutoff. */
export function suhoorEndTime(fajrStart: string, minutesBefore = 10): string {
  const sec = Math.max(0, timeToSeconds(fajrStart) - minutesBefore * 60);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}
