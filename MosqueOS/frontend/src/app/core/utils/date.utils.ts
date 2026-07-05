/** Uppercase weekday from the user's local clock (e.g. "SUNDAY"). */
export function currentDayName(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}
