const LOCALE = 'en-US';
/**
 * Events happen in the Philippines, so show their times in Philippine time
 * no matter what time zone the phone is set to.
 */
const TIME_ZONE = 'Asia/Manila';

/** "Sat, Oct 10, 2026" */
export function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

/** "8:00 AM" */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
}

/** "8:00 AM – 5:00 PM" */
export function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** { month: 'OCT', day: '10' } for the date tile on event covers. */
export function dateTileParts(iso: string) {
  const date = new Date(iso);
  return {
    month: date.toLocaleDateString(LOCALE, { month: 'short', timeZone: TIME_ZONE }).toUpperCase(),
    day: date.toLocaleDateString(LOCALE, { day: 'numeric', timeZone: TIME_ZONE }),
  };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
