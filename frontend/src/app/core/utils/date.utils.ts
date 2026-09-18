/** Uppercase weekday from the user's local clock (e.g. "SUNDAY"). */
export function currentDayName(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

export function appDateString(date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = fmt.formatToParts(date);
  const d = parts.find(p => p.type === 'day')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const y = parts.find(p => p.type === 'year')?.value;
  return `${y}-${m}-${d}`;
}
