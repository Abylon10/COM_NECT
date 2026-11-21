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

// ---------------------------------------------------------------------------
// Editing dates in Philippine time
// ---------------------------------------------------------------------------
// Forms work with plain "YYYY-MM-DD" and "HH:MM" strings in Philippine time,
// so the phone's own time zone never shifts what the organizer picked.

const MANILA_OFFSET = '+08:00';

function manilaParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/** ISO timestamp → { date: "2026-10-10", time: "08:00" } in Philippine time. */
export function toManilaParts(iso: string) {
  return manilaParts(new Date(iso));
}

/** "2026-10-10" + "08:00" (Philippine time) → ISO timestamp. */
export function fromManilaParts(date: string, time: string) {
  return `${date}T${time}:00${MANILA_OFFSET}`;
}

/** Today's date in Philippine time, "YYYY-MM-DD". */
export function todayInManila() {
  return manilaParts(new Date()).date;
}

/** "2026-10-10" → "Sat, Oct 10, 2026" */
export function formatDateOnly(date: string) {
  return formatEventDate(fromManilaParts(date, '12:00'));
}

/** "08:00" → "8:00 AM" */
export function formatTimeOnly(time: string) {
  return formatTime(fromManilaParts('2026-01-01', time));
}

/** "Updated 3h ago" style label for notifications. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatEventDate(iso);
}
