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

- **Expo (React Native), SDK 57**, created with `create-expo-app@latest`.
- **expo-router** with file-based routing in `src/app/`. Each file there
  is a screen.
- **Tabs use `NativeTabs`** from `expo-router/unstable-native-tabs`,
  defined in `src/components/app-tabs.tsx`. Tabs are declared with
  `<NativeTabs.Trigger name="...">`, where the name matches a file in
  `src/app/`. A separate `src/components/app-tabs.web.tsx` controls the
  web preview only and hasn't been updated yet.
- **Backend: Supabase is the proposed choice but not yet confirmed by the
  team.** It fits the resident/organizer auth split, and Justin Dave has
  used it before on a separate project. Don't build real auth or database
  features on it until the team agrees.
- `expo-notifications` is the likely choice for reminders and alerts. Not
  yet decided.

## Approach

- **Build the UI with mock data first.** Screens don't depend on the
  backend decision, so work can continue while it's pending.
- **Keep all data access in one place** (planned: `src/data/events.ts`).
  Screens call functions from that file and never know where data comes
  from. Switching from mock data to Supabase, or another backend, should
  only require changing that file.

## Code conventions (from the template)

- Theme colors come from `Colors` in `src/constants/theme.ts`:
  ```ts
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
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
- **Don't `git clone` inside the existing project folder.** It creates a
  nested copy that can get committed as an embedded repo. To test a fresh
  clone, clone into a separate folder (e.g. `Documents\COM_NECT_test`),
  then delete it afterwards.

## Project structure

```
src/
  app/                    routes (expo-router)
    _layout.tsx           root Stack + EventActionsProvider
    (tabs)/_layout.tsx    tab bar (NativeTabs via components/app-tabs)
    (tabs)/index.tsx      Browse: search, category chips, filter sheet, event list
    (tabs)/saved.tsx      My Events: Saved / Going / Interested
    (tabs)/profile.tsx    Profile (mock user, menu items are "coming soon")
    event/[id].tsx        Event details, pushed over the tabs
  data/events.ts          ALL data access + mock data (swap this for the backend)
  hooks/use-events.ts     loaders that screens use (useEvents, useEvent, ...)
  hooks/use-event-actions.tsx  saved events + RSVPs shared across screens
  components/             UI pieces (event-card, event-cover, filter-sheet, ...)
  constants/theme.ts      colors (teal brand), spacing, radius
  utils/format.ts         date/time formatting (always Asia/Manila time)
```

- Icons: `components/icon.tsx` wraps `SymbolView` (SF Symbols on iOS,
  Material Symbols on Android/web). Add new icons to `Icons` there.
- Event covers are category-colored placeholders, not photos. An image
  field can be added later.
- UI style follows the "Plandoon" reference mockups: teal accent, pill
  chips, rounded cards, outline + filled button pairs.

## Current status

- Browse, Saved, and Profile tabs plus the Event details screen are built
  with mock data (8 events, 7 organizations in Naval, Biliran).
- Search matches title, organizer, venue, and location. Filters: category
  chips, plus a sheet for date range, location, and organizer.
- Save (bookmark) and RSVP (Interested / Going) work in memory and reset
  when the app reloads.
- Cancelled/postponed events show a badge and the organizer's note;
  RSVP is disabled for cancelled events.
- App icon, splash, and header use the Community Connect logo (teal).
- Web preview tab bar (`app-tabs.web.tsx`) is updated too.
- ESLint is set up (`npx expo lint`). Lint and typecheck pass.
- Not yet tested on a real device after these changes. Check the native
  tab bar icons on Android and iOS in Expo Go.

## Next steps

1. Run on device (Expo Go) and check the tab bar, filter sheet, and
   details screen.
2. Get team confirmation on Supabase, then replace the mock data in
   `src/data/events.ts` with real database calls and add the
   resident/organizer auth.
3. Organizer tools: create/edit event screens, shown only to members of
   verified organizations.
4. Decide notification triggers (saved event changed, upcoming reminder,
   new event in a followed category).
5. Answer the open questions above (announcements, who verifies, area).
