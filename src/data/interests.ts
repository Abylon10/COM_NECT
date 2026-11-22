import { interestsByUser, notifyChange, requireUserId } from './db';
import type { CommunityEvent, InterestOption, UserInterests } from './types';

/** Interests residents can pick. Each maps to event categories and keywords. */
export const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'sports', label: 'Sports', emoji: '🏀', categories: ['sports'], keywords: ['run', 'league', 'basketball', 'volleyball'] },
  { id: 'music', label: 'Music and Entertainment', emoji: '🎵', categories: ['cultural'], keywords: ['music', 'concert', 'band', 'dance'] },
  { id: 'festivals', label: 'Festivals and Celebrations', emoji: '🎉', categories: [], keywords: ['festival', 'fiesta', 'celebration', 'night'] },
  { id: 'education', label: 'Education and Seminars', emoji: '📚', categories: ['educational'], keywords: ['seminar', 'workshop', 'training', 'scholarship'] },
  { id: 'community', label: 'Community Activities', emoji: '🤝', categories: ['youth', 'volunteer'], keywords: ['community', 'barangay', 'youth'] },
  { id: 'religious', label: 'Religious Activities', emoji: '⛪', categories: [], keywords: ['mass', 'church', 'prayer', 'chapel'] },
  { id: 'environment', label: 'Environmental Activities', emoji: '🌱', categories: [], keywords: ['cleanup', 'clean-up', 'mangrove', 'tree', 'coastal'] },
  { id: 'government', label: 'Government Programs', emoji: '🏛️', categories: [], keywords: ['municipal', 'scholarship', 'program', 'office'] },
  { id: 'business', label: 'Business and Livelihood', emoji: '💼', categories: [], keywords: ['livelihood', 'business', 'entrepreneur', 'market'] },
];

const EMPTY: UserInterests = { selected: [], custom: [] };

export function interestsFor(userId: string): UserInterests {
  return interestsByUser.get(userId) ?? EMPTY;
}

/** True if the event fits any of the user's interests. */
export function matchesInterests(event: CommunityEvent, interests: UserInterests) {
  const text = `${event.title} ${event.description}`.toLowerCase();
  const options = INTEREST_OPTIONS.filter((o) => interests.selected.includes(o.id));
  return (
    options.some(
      (o) => o.categories.includes(event.category) || o.keywords.some((k) => text.includes(k))
    ) || interests.custom.some((c) => c.trim() && text.includes(c.trim().toLowerCase()))
  );
}

export async function getMyInterests(): Promise<UserInterests> {
  const { selected, custom } = interestsFor(requireUserId());
  return { selected: [...selected], custom: [...custom] };
}

export async function setMyInterests(interests: UserInterests): Promise<void> {
  const custom = [
    ...new Set(interests.custom.map((c) => c.trim()).filter((c) => c.length > 0 && c.length <= 30)),
  ];
  interestsByUser.set(requireUserId(), {
    selected: interests.selected.filter((id) => INTEREST_OPTIONS.some((o) => o.id === id)),
    custom,
  });
  notifyChange();
}
