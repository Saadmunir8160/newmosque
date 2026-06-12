import { NextPrayer, PrayerTimesDaily } from '../models';

export interface PrayerSlot {
  name: string;
  start: string;
  jamaat: string;
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

/** Parse "HH:mm:ss" to total seconds since midnight (Europe/London local). */
export function timeToSeconds(t: string): number {
  const [h, m, s = '0'] = t.split(':');
  return +h * 3600 + +m * 60 + +s;
}

export function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function resolveNextPrayer(times: PrayerTimesDaily): NextPrayer {
  const now = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const slots = getPrayerSlots(times);

  for (const p of slots) {
    if (timeToSeconds(p.jamaat) > nowSec) {
      return { name: p.name, start: p.start, jamaat: p.jamaat };
    }
  }
  return { name: 'Fajr (tomorrow)', start: times.fajrStart, jamaat: times.fajrJamaat };
}

export function countdownToJamaat(jamaat: string): string {
  const now = new Date();
  const targetSec = timeToSeconds(jamaat);
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
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

/** Next upcoming Jumuah jamaat on Fridays; empty when not Friday or all slots passed. */
export function resolveJumuahCountdowns(
  slots: { slotNumber: number; jamaatTime: string }[]
): JumuahSlotCountdown[] {
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let nextFound = false;

  return [...slots]
    .sort((a, b) => timeToSeconds(a.jamaatTime) - timeToSeconds(b.jamaatTime))
    .map(slot => {
      const upcoming = isFriday && !nextFound && timeToSeconds(slot.jamaatTime) > nowSec;
      if (upcoming) nextFound = true;
      return {
        slotNumber: slot.slotNumber,
        jamaatTime: slot.jamaatTime,
        countdown: isFriday ? countdownToJamaat(slot.jamaatTime) : '',
        active: upcoming,
      };
    });
}

export function nextJumuahCountdown(
  slots: { slotNumber: number; jamaatTime: string }[]
): { slotNumber: number; jamaatTime: string; countdown: string } | null {
  const list = resolveJumuahCountdowns(slots);
  return list.find(s => s.active) ?? null;
}
