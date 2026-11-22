# Community Connect — Project Context

A mobile app for discovering local community events and announcements.
BSCS-3C group project (proposal submitted Sept 30, 2026, instructor
Mary Angel Palma).

## Team

Salundaguit, Henjiel A. · Ucag, Jennifer N. · Monsales, Justin Dave ·
Bohol, Philip · Doloeras, Patricia · Pedida, Toroi

**Current setup: Justin Dave is building the app solo for now.** The rest
of the team will pull the repo once the base screens are ready. Avoid
changes that assume multiple people are committing at once.

## What the app needs to do (from the proposal)

- Residents browse/search local events and announcements in one place,
  filtered by date, category, location, or organizing group.
- Each event shows title, date, time, venue, organizer, description, and
  registration/participation instructions.
- Residents can save events and give a simple RSVP/interest signal.
- Optional notifications/reminders, including alerts when an organizer
  changes an event (time/venue change, cancellation).
- **Two user types with different permissions:** residents
  (browse/save/RSVP) and **verified organizers** (create/edit/manage
  listings). This is a core requirement, since the pitch is trusted
  organizer posts versus open community boards.
- Target users are young adults (18–20) looking for youth, educational,
  sports, cultural, and volunteer events. Design mobile-first with fast
  browsing.

## Repo

- GitHub: `https://github.com/Abylon10/COM_NECT.git`
- The Expo project is at the **repo root** (`package.json` is at the top
  level). Teammates clone and run it with no extra `cd`.
- Justin Dave's local copy: `C:\Users\Pc\Documents\COM_NECT\community-connect`.
  Run all project commands from that folder, not its parent.
- The repo also has an `AGENTS.md` from the Expo template. This file adds
  project-specific context on top of it.

## Stack

- **Expo (React Native), SDK 58**, created with `create-expo-app@latest`.
- **expo-router** with file-based routing in `src/app/`. Each file there
  is a screen.
- **Tabs use `NativeTabs`** from `expo-router/unstable-native-tabs`,
  defined in `src/components/app-tabs.tsx`. Tabs are declared with
  `<NativeTabs.Trigger name="...">`, where the name matches a file in
  `src/app/(tabs)/`. A separate `src/components/app-tabs.web.tsx`
  controls the web preview only.
- **Backend: Supabase is the proposed choice but not yet confirmed by the
  team.** It fits the resident/organizer auth split, and Justin Dave has
  used it before on a separate project. Don't build real auth or database
  features on it until the team agrees.
- `expo-notifications` is the likely choice for reminders and alerts. Not
  yet decided.

## Approach

- **Build the UI with mock data first.** Screens don't depend on the
  backend decision, so work can continue while it's pending.
- **Keep all data access in one place:** the modules in `src/data/`.
  Screens call their functions and never know where data comes from.
  Switching from mock data to Supabase, or another backend, should only
  require changing those modules.

## Code conventions (from the template)

- Theme colors come from `Colors` in `src/constants/theme.ts`:
  ```ts
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  ```
  Use `colors.background`, `colors.text`, `colors.backgroundElement` so
  screens work in light and dark mode.
- Wrap screens in `SafeAreaView` from `react-native-safe-area-context`.
- Imports use the `@/` alias for `src/` (e.g. `@/constants/theme`).

## Draft data model (proposal, not final)

- **profiles**: `id` (linked to login), `display_name`, `role`
  (defaults to `resident`).
- **organizations**: `name`, `description`, `contact_info`, `is_verified`.
  Events belong to organizations, which also covers "filter by
  organizing group."
- **organization_members**: `user_id`, `organization_id`, `member_role`
  (`admin` / `editor`). Users can create/edit events only for verified
  organizations they belong to. This handles groups whose officers
  change every year.
- **events**: `organization_id`, `created_by`, `title`, `description`,
  `category`, `start_at`, `end_at`, `venue`, `location`,
  `registration_info`, `status` (`scheduled` / `cancelled` /
  `postponed`), `created_at`, `updated_at`.
- **saves**: `user_id`, `event_id`, `created_at` (bookmark).
- **rsvps**: `user_id`, `event_id`, `response` (`going` / `interested`).
  Kept separate from saves, since bookmarking isn't the same as planning
  to attend.
- **categories**: fixed list for now: youth, educational, sports,
  cultural, volunteer.

Notifications on event changes can target everyone in `saves` and
`rsvps` for that event. No notifications table is needed until reminders
are decided.

**Open questions for the team:**
1. Are announcements separate from events, or events without a date?
   (Separate table vs. a `type` field.)
2. Who verifies organizations? Possibly the group acting as admins for
   the demo.
3. Coverage area: Naval's barangays only, or all of Biliran? Determines
   how detailed `location` needs to be.

## Environment gotchas (already hit, save the repeat)

- **PowerShell blocks `npx`** by default (`running scripts is disabled
  on this system`). Fix once per machine:
  `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
  (type `Y`).
- **`npm install` can fail with `ECONNRESET`** on a flaky connection.
  The project files are usually already created. `cd` into the folder
  and re-run `npm install` instead of re-running `create-expo-app`.
- **Expo Go needs the phone and computer on the same wifi.** Phone on
  mobile data shows a generic "Something went wrong" error. Check the
  phone's status bar for wifi vs. cellular first.
- **After an SDK upgrade, update Expo Go on the phone** (Play Store /
  App Store). An old Expo Go shows "Project is incompatible with this
  version of Expo Go". Also run `npm install` after pulling.
- **Don't `git clone` inside the existing project folder.** It creates a
  nested copy that can get committed as an embedded repo. To test a fresh
  clone, clone into a separate folder (e.g. `Documents\COM_NECT_test`),
  then delete it afterwards.

## Project structure

```
src/
  app/                    routes (expo-router)
    _layout.tsx           root Stack; Stack.Protected switches between the
                          signed-in app and sign-in / sign-up
    sign-in.tsx, sign-up.tsx
    (tabs)/index.tsx      Browse: Recommended for you, search, chips, filters, list
    (tabs)/map.tsx        Map of Biliran with the user's Going / Interested events
    (tabs)/saved.tsx      My Events: Saved / Going / Interested (?segment=going)
    (tabs)/profile.tsx    Profile: tappable stats, appearance, settings menu, log out
    event/[id].tsx        Event details (Google Maps link, report, organizer panel)
    organizer/            Organizer Tools: list, new event, edit event
    notifications.tsx     In-app notifications (bell icon)
    settings/             edit-profile, security (password, deactivate, delete),
                          interests, notifications (settings), organizer-application,
                          history, privacy, help
  data/                   ALL data access (swap these for the backend)
    types.ts              shared types
    db.ts                 in-memory mock tables, session, change signal, places
    events.ts             events, saves/RSVPs, organizer actions, reports, map
    account.ts            sign-in, profile, password, organizer applications, feedback
    interests.ts          interest options, matching, user interests
    notifications.ts      delivery rules, reminders, notification settings
  hooks/use-events.ts     loaders screens use; re-load when data changes
  hooks/use-event-actions.tsx  saved events + RSVPs shared across screens
  components/             UI pieces (event-card, event-form, events-map(.web),
                          bottom-sheet, confirm-dialog, settings-screen, ...)
  constants/              theme.ts (colors, spacing), app.ts (support email)
  utils/                  format.ts (dates in Asia/Manila), maps.ts (Biliran region,
                          open in Google Maps)
```

- Icons: `components/icon.tsx` wraps `SymbolView` (SF Symbols on iOS,
  Material Symbols on Android/web). Add new icons to `Icons` there.
- Event covers are category-colored placeholders, not photos.
- UI style follows the "Plandoon" reference mockups: teal accent, pill
  chips, rounded cards, outline + filled button pairs.
- Use `ConfirmDialog` instead of `Alert.alert` with buttons (those do
  nothing on the web preview).

## Current status

- Tabs: Browse, Map, Saved, Profile, plus Event details, built with mock
  data (organizations and events in Naval, Biliran). Mock event dates are
  relative to today, so there are always upcoming events; Browse hides
  events that already ended (they appear in My Event History).
- **Sign-in (mock):** the app starts at Sign in. Demo accounts (password
  `community123`): resident ashley@example.com, organizer
  carlo.sk@example.com. Sign up creates a resident. Log out (with a
  confirmation) returns to Sign in. All data resets on reload.
- **Profile & Settings:** tappable Saved/Going/Interested counts, Edit
  Profile (photo via expo-image-picker, name, email with a verification
  step, contact number, municipality/barangay), Account & Security
  (change password, deactivate, delete), My Interests (drives
  "Recommended for you" on Browse), Notification settings (6 toggles that
  the alert rules respect), My Event History, Privacy Policy (draft),
  Help & Feedback (FAQ, email, feedback form).
- **Become an Organizer:** application form (organization, type,
  description, contacts, supporting documents via expo-document-picker),
  statuses Pending / Approved / Not approved / Needs revision. The admin
  side isn't built, so a clearly-labeled demo panel approves/rejects.
  Approval creates a verified organization and unlocks Organizer Tools.
- **Map tab:** react-native-maps (Google Maps on Android, Apple Maps on
  iOS in Expo Go), centered on Biliran, pins for the user's upcoming Going
  (teal) / Interested (amber) events. Coordinates are approximate
  (`PLACES` / `MUNICIPALITIES` in `data/db.ts`). Web preview shows an
  embedded Google Map. Events also have "Open in Google Maps".
- Organizers can post announcements to an event's followers and see
  going / interested / saved counts. Residents can report events.
- Search matches title, organizer, venue, and location. Filters: category
  chips, plus a sheet for date range, location, and organizer.
- Save (bookmark) and RSVP (Interested / Going) work in memory and reset
  when the app reloads.
- Cancelled/postponed events show a badge and the organizer's note;
  RSVP is disabled for cancelled events.
- App icon, splash, and header use the Community Connect logo (teal).
- Day/night toggle: sun/moon button in the Browse header, plus System /
  Day / Night choice on Profile (`hooks/color-scheme-preference.ts`).
  Native uses `Appearance.setColorScheme`, so the tab bar and alerts
  follow too. The choice is saved on the device (AsyncStorage).
- **Organizer tools (mock data):** organizer Carlo Mendoza is admin of the
  verified SK Federation of Naval. Organizers create events and edit, postpone
  or cancel them (a note is required). Permissions are checked in
  `src/data/events.ts` (`PermissionError`), mirroring the planned
  database rules, not only by hiding buttons.
- **In-app alerts:** event changes/cancellations (to followers),
  reminders the day before Going events, organizer announcements, new
  events / recommendations, and application results, each respecting the
  user's notification settings. This stands in for push notifications
  until `expo-notifications` is decided.
- Date/time pickers are custom (calendar + 30-minute time slots), so no
  native picker package is needed and they work on web too. Events are
  single-day; times are entered in Philippine time.
- Web preview tab bar (`app-tabs.web.tsx`) is updated too.
- ESLint is set up (`npx expo lint`). Lint and typecheck pass.
- Not yet tested on a real device after these changes. Check the native
  tab bar icons on Android and iOS in Expo Go.

## Next steps

1. Run on device (Expo Go) and check the tab bar (4 tabs), Map, image and
   document pickers, settings screens, organizer form and notifications.
2. Replace `SUPPORT_EMAIL` in `src/constants/app.ts` with the team's real
   address. Before a production Android build, add a Google Maps API key
   (`android.config.googleMaps.apiKey` in app.json); Expo Go needs none.
3. Get team confirmation on Supabase, then replace the mock data in
   `src/data/` with real database calls, replace the mock sign-in with
   Supabase Auth, and add row-level security matching the checks in
   `createEvent` / `updateEvent` / `postAnnouncement`.
4. Build the administrator side (review organizer applications and
   event reports) to replace the demo review panel.
5. Push notifications (`expo-notifications`) for the alerts that are
   in-app only today.
6. Organizer extras: manage organization members, event photos,
   multi-day events, picking a map pin for the venue.
7. Answer the open questions above (announcements, who verifies, area).
