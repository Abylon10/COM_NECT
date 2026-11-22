/**
 * In-memory mock database. Only the modules in src/data/ touch it; screens
 * call their functions instead. When the backend (Supabase, proposed) is
 * adopted, these tables become real database tables and this file goes away.
 *
 * Everything resets when the app reloads.
 */

import { fromManilaParts, todayInManila } from '@/utils/format';

import type {
  AppNotification,
  CommunityEvent,
  Coordinates,
  EventReport,
  Feedback,
  Membership,
  NotificationSettings,
  Organization,
  OrganizerApplication,
  Profile,
  RsvpResponse,
  UserInterests,
} from './types';

// ---------------------------------------------------------------------------
// Dates relative to today, so the demo always has upcoming and past events
// ---------------------------------------------------------------------------

function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

/** Philippine time, `days` from today. */
export function at(days: number, time: string) {
  return fromManilaParts(addDays(todayInManila(), days), time);
}

// ---------------------------------------------------------------------------
// Places (approximate coordinates, for the demo map)
// ---------------------------------------------------------------------------

/** Biliran's municipalities with approximate town-center coordinates. */
export const MUNICIPALITIES: { name: string; center: Coordinates }[] = [
  { name: 'Almeria', center: { latitude: 11.62, longitude: 124.38 } },
  { name: 'Biliran', center: { latitude: 11.466, longitude: 124.474 } },
  { name: 'Cabucgayan', center: { latitude: 11.474, longitude: 124.575 } },
  { name: 'Caibiran', center: { latitude: 11.572, longitude: 124.582 } },
  { name: 'Culaba', center: { latitude: 11.657, longitude: 124.541 } },
  { name: 'Kawayan', center: { latitude: 11.68, longitude: 124.357 } },
  { name: 'Maripipi', center: { latitude: 11.778, longitude: 124.349 } },
  { name: 'Naval', center: { latitude: 11.561, longitude: 124.397 } },
];

/** Approximate spots for the barangays used in the mock data. */
export const PLACES: Record<string, Coordinates> = {
  'Brgy. Atipolo, Naval': { latitude: 11.585, longitude: 124.389 },
  'Brgy. Caraycaray, Naval': { latitude: 11.548, longitude: 124.402 },
  'Brgy. Larrazabal, Naval': { latitude: 11.566, longitude: 124.405 },
  'Brgy. P.I. Garcia, Naval': { latitude: 11.556, longitude: 124.398 },
  'Brgy. Santissimo Rosario, Naval': { latitude: 11.562, longitude: 124.395 },
  // Other towns (one or two spots each, for the map demo)
  'Brgy. Talahid, Almeria': { latitude: 11.632, longitude: 124.372 },
  'Brgy. Poblacion, Kawayan': { latitude: 11.679, longitude: 124.359 },
  'Brgy. Ungale, Kawayan': { latitude: 11.700, longitude: 124.368 },
  'Brgy. Ol-og, Maripipi': { latitude: 11.784, longitude: 124.343 },
  'Brgy. Poblacion, Culaba': { latitude: 11.656, longitude: 124.542 },
  'Brgy. Palengke, Caibiran': { latitude: 11.571, longitude: 124.580 },
  'Brgy. Libtong, Cabucgayan': { latitude: 11.476, longitude: 124.571 },
  'Brgy. Poblacion, Biliran': { latitude: 11.467, longitude: 124.473 },
  'Brgy. Busali, Biliran': { latitude: 11.455, longitude: 124.490 },
};

/** Best-known map position for a location string. */
export function coordinatesFor(location: string): Coordinates {
  if (PLACES[location]) return PLACES[location];
  const town = MUNICIPALITIES.find((m) => location.toLowerCase().includes(m.name.toLowerCase()));
  return town?.center ?? MUNICIPALITIES.find((m) => m.name === 'Naval')!.center;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const organizations: Organization[] = [
  {
    id: 'org-sk-naval',
    name: 'SK Federation of Naval',
    description: 'Sangguniang Kabataan federation coordinating youth programs across Naval.',
    contactInfo: 'sk.naval@example.com · 0917 000 0001',
    isVerified: true,
  },
  {
    id: 'org-coastal',
    name: 'Biliran Coastal Volunteers',
    description: 'Residents and students keeping Biliran shorelines clean since 2019.',
    contactInfo: 'coastalvolunteers@example.com',
    isVerified: true,
  },
  {
    id: 'org-hoops',
    name: 'Naval Inter-Barangay Hoops League',
    description: 'Community basketball league for barangay teams in Naval.',
    contactInfo: 'Facebook: Naval Hoops League',
    isVerified: true,
  },
  {
    id: 'org-compsoc',
    name: 'NSU Computer Society',
    description: 'Student organization running free tech workshops for the community.',
    contactInfo: 'compsoc@example.com',
    isVerified: true,
  },
  {
    id: 'org-kultura',
    name: 'Kultura Biliran Arts Collective',
    description: 'Local artists, dancers, and musicians promoting Biliranon culture.',
    contactInfo: 'kulturabiliran@example.com',
    isVerified: true,
  },
  {
    id: 'org-youth-office',
    name: 'Naval Youth Development Office',
    description: 'Municipal office handling scholarships, trainings, and youth services.',
    contactInfo: 'Municipal Hall, 2nd floor · (053) 000 0000',
    isVerified: true,
  },
  {
    id: 'org-tourism',
    name: 'Biliran Provincial Tourism Office',
    description: 'Promotes festivals, heritage sites and eco-tourism across all eight towns of Biliran.',
    contactInfo: 'tourism.biliran@example.com · (053) 000 0101',
    isVerified: true,
  },
  {
    id: 'org-sk-province',
    name: 'SK Provincial Federation of Biliran',
    description: 'Federation of all Sangguniang Kabataan councils in the province.',
    contactInfo: 'sk.biliranprovince@example.com',
    isVerified: true,
  },
  {
    id: 'org-redcross-youth',
    name: 'Biliran Red Cross Youth',
    description: 'Youth volunteers supporting blood drives and disaster preparedness.',
    contactInfo: 'rcy.biliran@example.com',
    isVerified: true,
  },
];

type EventSeed = Omit<CommunityEvent, 'coordinates' | 'updatedAt' | 'photos'> & { updatedDaysAgo: number };

const eventSeeds: EventSeed[] = [
  {
    id: 'evt-youth-summit',
    organizationId: 'org-sk-naval',
    title: 'Youth Leadership Summit',
    description:
      'A one-day summit for young leaders aged 15–24. Talks from local officials and student leaders, workshops on project planning and public speaking, and a networking lunch.',
    category: 'youth',
    startAt: at(1, '08:00'),
    endAt: at(1, '17:00'),
    venue: 'NSU Gymnasium',
    location: 'Brgy. Caraycaray, Naval',
    registrationInfo:
      'Free. Pre-register at your barangay SK office or through the SK Federation page. Bring a valid school or government ID.',
    status: 'scheduled',
    goingCount: 48,
    interestedCount: 31,
    updatedDaysAgo: 5,
  },
  {
    id: 'evt-scholarship-info',
    organizationId: 'org-youth-office',
    title: 'Scholarship Info Session',
    description:
      'Learn about municipal and provincial scholarship programs: who can apply, required documents, and deadlines. Q&A with the scholarship coordinator.',
    category: 'educational',
    startAt: at(4, '14:00'),
    endAt: at(4, '16:00'),
    venue: 'Municipal Session Hall',
    location: 'Brgy. P.I. Garcia, Naval',
    registrationInfo: 'Walk-in, no registration needed. Seats are first come, first served.',
    status: 'scheduled',
    goingCount: 22,
    interestedCount: 40,
    updatedDaysAgo: 3,
  },
  {
    id: 'evt-coastal-cleanup',
    organizationId: 'org-coastal',
    title: 'Coastal Cleanup Drive',
    description:
      'Join us in cleaning up the Atipolo shoreline. Volunteers are grouped into teams; trash is sorted for recycling. Snacks provided after the cleanup.',
    category: 'volunteer',
    startAt: at(7, '06:00'),
    endAt: at(7, '10:00'),
    venue: 'Atipolo Shoreline (meet at Barangay Hall)',
    location: 'Brgy. Atipolo, Naval',
    registrationInfo:
      'Sign up on arrival. Bring gloves, a water bottle, and wear closed shoes. Volunteer certificates available for students.',
    status: 'scheduled',
    goingCount: 35,
    interestedCount: 18,
    updatedDaysAgo: 6,
  },
  {
    id: 'evt-fun-run',
    organizationId: 'org-redcross-youth',
    title: 'Run for a Cause 5K',
    description: 'A 5K fun run raising funds for disaster preparedness kits for coastal barangays.',
    category: 'sports',
    startAt: at(8, '05:30'),
    endAt: at(8, '08:30'),
    venue: 'Naval Town Plaza',
    location: 'Brgy. Santissimo Rosario, Naval',
    registrationInfo: 'Registration fee ₱150 includes race bib and shirt.',
    status: 'cancelled',
    statusNote: 'Cancelled due to the weather advisory. Registration fees will be refunded.',
    goingCount: 60,
    interestedCount: 25,
    updatedDaysAgo: 1,
  },
  {
    id: 'evt-hoops-opening',
    organizationId: 'org-hoops',
    title: 'Inter-Barangay League Opening Day',
    description:
      'Opening ceremony and first games of the Inter-Barangay Basketball League. Team parade, muse presentation, then back-to-back games.',
    category: 'sports',
    startAt: at(12, '15:00'),
    endAt: at(12, '21:00'),
    venue: 'Naval Town Plaza Covered Court',
    location: 'Brgy. Santissimo Rosario, Naval',
    registrationInfo: 'Free admission for spectators. Team registration is closed for this season.',
    status: 'scheduled',
    goingCount: 120,
    interestedCount: 64,
    updatedDaysAgo: 10,
  },
  {
    id: 'evt-coding-workshop',
    organizationId: 'org-compsoc',
    title: 'Build Your First App Workshop',
    description:
      'A hands-on beginner workshop on building a simple mobile app. No experience needed. Mentors from the NSU Computer Society will guide each table.',
    category: 'educational',
    startAt: at(16, '13:00'),
    endAt: at(16, '17:00'),
    venue: 'NSU ICT Laboratory',
    location: 'Brgy. Caraycaray, Naval',
    registrationInfo:
      'Limited to 40 participants. Register through the Computer Society page. Bring a laptop if you have one; a few units are available.',
    status: 'scheduled',
    goingCount: 29,
    interestedCount: 52,
    updatedDaysAgo: 4,
  },
  {
    id: 'evt-cultural-night',
    organizationId: 'org-kultura',
    title: 'Biliranon Cultural Night',
    description:
      'An evening of traditional dance, live music, and spoken word by local artists. Food stalls from Naval home businesses.',
    category: 'cultural',
    startAt: at(21, '18:00'),
    endAt: at(21, '22:00'),
    venue: 'Provincial Capitol Grounds',
    location: 'Brgy. Larrazabal, Naval',
    registrationInfo: 'Free and open to all. Bring your own mat or chair.',
    status: 'postponed',
    statusNote: 'Moved from its original date because of rain. See the new date above.',
    goingCount: 75,
    interestedCount: 90,
    updatedDaysAgo: 2,
  },
  {
    id: 'evt-blood-drive',
    organizationId: 'org-redcross-youth',
    title: 'Community Blood Donation Drive',
    description: 'Donate blood and help save lives. Medical screening is done on-site before donation.',
    category: 'volunteer',
    startAt: at(28, '08:00'),
    endAt: at(28, '15:00'),
    venue: 'Barangay Hall',
    location: 'Brgy. Larrazabal, Naval',
    registrationInfo:
      'Donors must be 18–65 years old and at least 50 kg. Eat a full meal and get enough sleep the night before.',
    status: 'scheduled',
    goingCount: 41,
    interestedCount: 27,
    updatedDaysAgo: 7,
  },
  // Events in the other towns, so the map has pins across the island.
  {
    id: 'evt-almeria-cleanup',
    organizationId: 'org-coastal',
    title: 'Agta Beach Cleanup',
    description:
      'Morning cleanup of Agta Beach with the Almeria barangay council. Trash is sorted for recycling, followed by a short talk on keeping the coast clean.',
    category: 'volunteer',
    startAt: at(3, '06:00'),
    endAt: at(3, '09:30'),
    venue: 'Agta Beach',
    location: 'Brgy. Talahid, Almeria',
    registrationInfo: 'Walk-ins welcome. Bring gloves, a hat and a water bottle. Sacks provided.',
    status: 'scheduled',
    goingCount: 41,
    interestedCount: 18,
    updatedDaysAgo: 2,
  },
  {
    id: 'evt-kawayan-fiesta',
    organizationId: 'org-kultura',
    title: 'Kawayan Street Dance Showdown',
    description:
      'Youth dance groups from Kawayan barangays perform in the town fiesta street dance. Food stalls and a local band after the parade.',
    category: 'cultural',
    startAt: at(6, '14:00'),
    endAt: at(6, '19:00'),
    venue: 'Kawayan Town Plaza',
    location: 'Brgy. Poblacion, Kawayan',
    registrationInfo: 'Free to watch. Dance groups register with the municipal tourism desk.',
    status: 'scheduled',
    goingCount: 120,
    interestedCount: 64,
    updatedDaysAgo: 4,
  },
  {
    id: 'evt-kawayan-swim',
    organizationId: 'org-redcross-youth',
    title: 'Water Safety & Swimming Clinic',
    description: 'Learn basic swimming and water rescue skills with Red Cross Youth lifeguards.',
    category: 'sports',
    startAt: at(9, '08:00'),
    endAt: at(9, '11:00'),
    venue: 'Ungale Beach Resort',
    location: 'Brgy. Ungale, Kawayan',
    registrationInfo: 'Ages 13 and up. Limited to 40 participants; sign up at the Red Cross Youth page.',
    status: 'scheduled',
    goingCount: 22,
    interestedCount: 15,
    updatedDaysAgo: 3,
  },
  {
    id: 'evt-maripipi-pottery',
    organizationId: 'org-tourism',
    title: 'Maripipi Pottery Workshop',
    description:
      'Hands-on clay pottery with Maripipi’s traditional potters. Learn the coil method and take home your own pot.',
    category: 'cultural',
    startAt: at(11, '09:00'),
    endAt: at(11, '15:00'),
    venue: 'Ol-og Pottery Center',
    location: 'Brgy. Ol-og, Maripipi',
    registrationInfo: '₱150 materials fee. Boat leaves Kawayan port at 6:30 AM.',
    status: 'scheduled',
    goingCount: 18,
    interestedCount: 33,
    updatedDaysAgo: 5,
  },
  {
    id: 'evt-culaba-cup',
    organizationId: 'org-sk-province',
    title: 'Culaba Youth Basketball Cup',
    description: 'Inter-barangay 3x3 basketball for ages 15–21. Finals and awarding on the same day.',
    category: 'sports',
    startAt: at(4, '13:00'),
    endAt: at(4, '18:00'),
    venue: 'Culaba Municipal Gym',
    location: 'Brgy. Poblacion, Culaba',
    registrationInfo: 'Teams of 4 (one reserve). Register with your barangay SK chair.',
    status: 'scheduled',
    goingCount: 75,
    interestedCount: 40,
    updatedDaysAgo: 1,
  },
  {
    id: 'evt-caibiran-bootcamp',
    organizationId: 'org-compsoc',
    title: 'Caibiran Coding Bootcamp',
    description: 'A free one-day intro to web development for senior high school students.',
    category: 'educational',
    startAt: at(8, '08:30'),
    endAt: at(8, '16:30'),
    venue: 'Caibiran National High School',
    location: 'Brgy. Palengke, Caibiran',
    registrationInfo: 'Bring a laptop if you have one; a few units are available to borrow.',
    status: 'scheduled',
    goingCount: 35,
    interestedCount: 28,
    updatedDaysAgo: 2,
  },
  {
    id: 'evt-cabucgayan-trees',
    organizationId: 'org-sk-province',
    title: 'Cabucgayan Tree Growing Day',
    description: 'Plant native trees along the Libtong river bank with the SK and the barangay council.',
    category: 'volunteer',
    startAt: at(13, '06:30'),
    endAt: at(13, '10:00'),
    venue: 'Libtong River Bank',
    location: 'Brgy. Libtong, Cabucgayan',
    registrationInfo: 'Seedlings and snacks provided. Wear closed shoes.',
    status: 'scheduled',
    goingCount: 48,
    interestedCount: 22,
    updatedDaysAgo: 6,
  },
  {
    id: 'evt-biliran-run',
    organizationId: 'org-tourism',
    title: 'Biliran Town Heritage Fun Run',
    description: '3K and 5K routes passing the Biliran town church and the old bridge. Medals for finishers.',
    category: 'sports',
    startAt: at(15, '05:30'),
    endAt: at(15, '08:30'),
    venue: 'Biliran Town Plaza',
    location: 'Brgy. Poblacion, Biliran',
    registrationInfo: '₱200 with race shirt; ₱100 without. Register online or at the plaza booth.',
    status: 'scheduled',
    goingCount: 90,
    interestedCount: 51,
    updatedDaysAgo: 3,
  },
  {
    id: 'evt-busali-falls',
    organizationId: 'org-sk-province',
    title: 'Busali Falls Eco-Trek',
    description: 'Guided trek to Busali Falls with a short talk on protecting the watershed.',
    category: 'youth',
    startAt: at(18, '07:00'),
    endAt: at(18, '12:00'),
    venue: 'Busali Falls Trailhead',
    location: 'Brgy. Busali, Biliran',
    registrationInfo: 'Ages 15+. Wear trekking shoes; local guides join every group of 10.',
    status: 'scheduled',
    goingCount: 26,
    interestedCount: 37,
    updatedDaysAgo: 2,
  },
  // Past events (shown in My Event History, hidden from Browse)
  {
    id: 'evt-tree-planting',
    organizationId: 'org-coastal',
    title: 'Mangrove Planting Activity',
    description: 'Planting mangrove seedlings along the Atipolo coast with local fisherfolk.',
    category: 'volunteer',
    startAt: at(-12, '06:00'),
    endAt: at(-12, '10:00'),
    venue: 'Atipolo Mangrove Area',
    location: 'Brgy. Atipolo, Naval',
    registrationInfo: 'Wear boots or old shoes. Seedlings provided.',
    status: 'scheduled',
    goingCount: 52,
    interestedCount: 20,
    updatedDaysAgo: 20,
  },
  {
    id: 'evt-first-aid',
    organizationId: 'org-redcross-youth',
    title: 'Basic First Aid Training',
    description: 'Hands-on basics: CPR, wound care, and responding to emergencies.',
    category: 'educational',
    startAt: at(-20, '09:00'),
    endAt: at(-20, '15:00'),
    venue: 'Barangay Hall',
    location: 'Brgy. P.I. Garcia, Naval',
    registrationInfo: 'Free. Certificates for participants who complete the session.',
    status: 'scheduled',
    goingCount: 30,
    interestedCount: 15,
    updatedDaysAgo: 30,
  },
];

export const events: CommunityEvent[] = eventSeeds.map(({ updatedDaysAgo, ...e }) => ({
  ...e,
  coordinates: coordinatesFor(e.location),
  photos: [],
  updatedAt: at(-updatedDaysAgo, '09:00'),
}));

export const users: Profile[] = [
  {
    id: 'user-resident',
    displayName: 'Ashley Reyes',
    email: 'ashley@example.com',
    phone: '09171234567',
    municipality: 'Naval',
    barangay: 'Caraycaray',
    location: 'Brgy. Caraycaray, Naval',
    role: 'resident',
    joinedAt: at(-120, '10:00'),
  },
  {
    id: 'user-organizer',
    displayName: 'Carlo Mendoza',
    email: 'carlo.sk@example.com',
    phone: '09181234567',
    municipality: 'Naval',
    barangay: 'Larrazabal',
    location: 'Brgy. Larrazabal, Naval',
    role: 'organizer',
    joinedAt: at(-200, '10:00'),
  },
  {
    id: 'user-resident-2',
    displayName: 'Maria Santos',
    email: 'maria.santos@example.com',
    phone: '09191234567',
    municipality: 'Naval',
    barangay: 'P.I. Garcia',
    location: 'Brgy. P.I. Garcia, Naval',
    role: 'resident',
    joinedAt: at(-45, '10:00'),
  },
  {
    id: 'user-resident-3',
    displayName: 'Jomar Dela Cruz',
    email: 'jomar.dc@example.com',
    phone: '',
    municipality: 'Biliran',
    barangay: '',
    location: 'Biliran',
    role: 'resident',
    joinedAt: at(-12, '10:00'),
  },
  {
    // Admin console only. Signs in through the administrator toggle on Sign in.
    id: 'user-admin',
    displayName: 'Community Connect Admin',
    email: 'admin@example.com',
    phone: '',
    municipality: 'Naval',
    barangay: '',
    location: 'Naval',
    role: 'admin',
    joinedAt: at(-365, '10:00'),
  },
];

// More sample residents so the admin user table has pages to browse.
const SAMPLE_RESIDENTS: [string, string, string][] = [
  ['Angela Villanueva', 'Caraycaray', 'Naval'],
  ['Mark Anthony Gerona', 'Atipolo', 'Naval'],
  ['Kristine Joy Lagumbay', 'P.I. Garcia', 'Naval'],
  ['Rhea Mae Cabigas', 'Poblacion', 'Almeria'],
  ['John Paul Saldivar', 'Larrazabal', 'Naval'],
  ['Princess Ann Dadula', 'Sto. Niño', 'Kawayan'],
  ['Kenneth Ybañez', 'Poblacion', 'Caibiran'],
  ['Shaira Montejo', 'Agpangi', 'Naval'],
  ['Christian Pepito', 'Poblacion', 'Biliran'],
  ['Lovely Rose Tabuan', 'Busali', 'Biliran'],
  ['Jerome Abellana', 'Libertad', 'Naval'],
  ['Nicole Ann Cabahug', 'Poblacion', 'Culaba'],
];

users.push(
  ...SAMPLE_RESIDENTS.map(([displayName, barangay, municipality], i): Profile => ({
    id: `user-sample-${i + 1}`,
    displayName,
    email: `${displayName.split(' ')[0].toLowerCase()}.${displayName.split(' ').at(-1)!.toLowerCase().replace('ñ', 'n')}@example.com`,
    phone: '',
    municipality,
    barangay,
    location: `Brgy. ${barangay}, ${municipality}`,
    role: 'resident',
    joinedAt: at(-(3 + i * 7), '14:00'),
  }))
);

/** Demo password for the seeded accounts (mock auth only). */
export const DEMO_PASSWORD = 'community123';

export const passwords = new Map<string, string>(users.map((u) => [u.id, DEMO_PASSWORD]));

export const deactivated = new Set<string>();

/** Accounts an administrator suspended; they can't sign in. */
export const suspended = new Set<string>();

export const memberships: Membership[] = [
  { userId: 'user-organizer', organizationId: 'org-sk-naval', memberRole: 'admin' },
];

export const savedByUser = new Map<string, Set<string>>([
  ['user-resident', new Set(['evt-coastal-cleanup', 'evt-tree-planting'])],
  ['user-organizer', new Set()],
]);

export const rsvpsByUser = new Map<string, Map<string, RsvpResponse>>([
  [
    'user-resident',
    new Map<string, RsvpResponse>([
      ['evt-youth-summit', 'going'],
      ['evt-hoops-opening', 'interested'],
      ['evt-cultural-night', 'interested'],
      ['evt-tree-planting', 'going'],
      ['evt-first-aid', 'interested'],
      // Map demo: pins in other towns.
      ['evt-almeria-cleanup', 'going'],
      ['evt-kawayan-fiesta', 'going'],
      ['evt-maripipi-pottery', 'interested'],
      ['evt-culaba-cup', 'going'],
      ['evt-caibiran-bootcamp', 'interested'],
      ['evt-cabucgayan-trees', 'going'],
      ['evt-biliran-run', 'interested'],
    ]),
  ],
  ['user-organizer', new Map()],
]);

export const notificationsByUser = new Map<string, AppNotification[]>([
  [
    'user-resident',
    [
      {
        id: 'ntf-seed-1',
        eventId: 'evt-cultural-night',
        kind: 'postponed',
        title: 'Event postponed',
        body: 'Biliranon Cultural Night: Moved from its original date because of rain.',
        createdAt: at(-2, '09:00'),
        read: false,
      },
    ],
  ],
]);

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newEvents: false,
  recommendations: true,
  reminders: true,
  scheduleChanges: true,
  cancellations: true,
  announcements: true,
};

export const notificationSettingsByUser = new Map<string, NotificationSettings>();

export const interestsByUser = new Map<string, UserInterests>([
  ['user-resident', { selected: ['sports', 'community', 'environment'], custom: [] }],
]);

// Sample items so the admin console has something to review.
export const applications: OrganizerApplication[] = [
  {
    id: 'app-seed-1',
    userId: 'user-resident-2',
    organizationName: 'NSU Volunteers Club',
    organizationType: 'school',
    description:
      'Student volunteer group of Naval State University. We run coastal cleanups, tutoring for elementary pupils and relief packing during typhoon season.',
    contactEmail: 'nsu.volunteers@example.com',
    contactPhone: '09191234567',
    documents: [
      { name: 'OSA-recognition-2026.pdf', uri: '', size: 184_000 },
      { name: 'Adviser-endorsement.pdf', uri: '', size: 96_000 },
    ],
    status: 'pending',
    submittedAt: at(-1, '15:20'),
    updatedAt: at(-1, '15:20'),
  },
  {
    id: 'app-seed-2',
    userId: 'user-resident-3',
    organizationName: 'Biliran Bikers Group',
    organizationType: 'other',
    description: 'Weekend cycling group that organizes fun rides around the island.',
    contactEmail: 'jomar.dc@example.com',
    contactPhone: '',
    documents: [{ name: 'group-photo.jpg', uri: '', size: 420_000 }],
    status: 'pending',
    submittedAt: at(-3, '10:05'),
    updatedAt: at(-3, '10:05'),
  },
];

export const reports: EventReport[] = [
  {
    id: 'rpt-seed-1',
    userId: 'user-resident-3',
    eventId: 'evt-coding-workshop',
    eventTitle: 'Build Your First App Workshop',
    reason: 'wrong_details',
    details: 'The post says it is free but the sign-up form asks for a ₱200 fee.',
    createdAt: at(-1, '19:40'),
    status: 'open',
  },
  {
    id: 'rpt-seed-2',
    userId: 'user-resident-2',
    eventId: 'evt-coding-workshop',
    eventTitle: 'Build Your First App Workshop',
    reason: 'misleading',
    details: '',
    createdAt: at(0, '07:10'),
    status: 'open',
  },
];

export const feedback: Feedback[] = [
  {
    id: 'fb-seed-1',
    userId: 'user-resident',
    kind: 'suggestion',
    message: 'Please add a way to share an event to Messenger so I can invite friends.',
    createdAt: at(-2, '21:15'),
  },
];

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export const session: { userId: string | null } = { userId: null };

export function requireUserId() {
  if (!session.userId) throw new Error('Please sign in first.');
  return session.userId;
}

// ---------------------------------------------------------------------------
// Change signal
// ---------------------------------------------------------------------------
// Screens re-load when data changes. With a real backend this would be driven
// by realtime updates instead of local writes.

let dataVersion = 0;
const listeners = new Set<() => void>();

export function subscribeToChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDataVersion() {
  return dataVersion;
}

export function notifyChange() {
  dataVersion += 1;
  listeners.forEach((listener) => listener());
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
