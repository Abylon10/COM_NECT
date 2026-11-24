/**
 * In-app notifications. With the backend these become push notifications
 * (expo-notifications, proposed); the rules for who gets what stay here.
 */

import { formatTime } from '@/utils/format';

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  events,
  newId,
  notificationSettingsByUser,
  notificationsByUser,
  notifyChange,
  requireUserId,
  rsvpsByUser,
} from './db';
import type { AppNotification, NotificationKind, NotificationSettings } from './types';

function settingsFor(userId: string): NotificationSettings {
  return notificationSettingsByUser.get(userId) ?? DEFAULT_NOTIFICATION_SETTINGS;
}

function listFor(userId: string) {
  if (!notificationsByUser.has(userId)) notificationsByUser.set(userId, []);
  return notificationsByUser.get(userId)!;
}

/**
 * Adds a notification for each user whose settings allow `setting`.
 * Pass `null` as the setting for notifications that are always delivered.
 */
export function deliver(
  userIds: Iterable<string>,
  setting: keyof NotificationSettings | null,
  notification: { kind: NotificationKind; title: string; body: string; eventId?: string }
) {
  const createdAt = new Date().toISOString();
  for (const userId of userIds) {
    if (setting && !settingsFor(userId)[setting]) continue;
    listFor(userId).unshift({ ...notification, id: newId('ntf'), createdAt, read: false });
  }
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * "Tomorrow" reminders for events the user is Going to. Generated when the
 * list is read; with the backend a scheduled job would send these.
 */
function addDueReminders(userId: string, now = Date.now()) {
  if (!settingsFor(userId).reminders) return;
  const list = listFor(userId);
  rsvpsByUser.get(userId)?.forEach((response, eventId) => {
    if (response !== 'going') return;
    const event = events.find((e) => e.id === eventId);
    if (!event || event.status === 'cancelled') return;
    const startsIn = Date.parse(event.startAt) - now;
    if (startsIn <= 0 || startsIn > DAY * 1.5) return;
    const id = `rem-${eventId}-${event.startAt}`;
    if (list.some((n) => n.id === id)) return;
    list.unshift({
      id,
      eventId,
      kind: 'reminder',
      title: 'Coming up soon',
      body: `${event.title} starts at ${formatTime(event.startAt)} at ${event.venue}.`,
      createdAt: new Date(now).toISOString(),
      read: false,
    });
  });
}

export async function getNotifications(): Promise<AppNotification[]> {
  const userId = requireUserId();
  addDueReminders(userId);
  return [...listFor(userId)];
}

export async function markNotificationsRead(): Promise<void> {
  listFor(requireUserId()).forEach((n) => (n.read = true));
  notifyChange();
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return { ...settingsFor(requireUserId()) };
}

export async function updateNotificationSettings(
  update: Partial<NotificationSettings>
): Promise<void> {
  const userId = requireUserId();
  notificationSettingsByUser.set(userId, { ...settingsFor(userId), ...update });
  notifyChange();
}
