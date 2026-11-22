# Community Connect — Code Guide

How the code is organized, where to find things, and how the pieces fit
together. Read this first if you're new to the project.

> Quick start: `npm install`, then `npx expo start`, and scan the QR code
> with Expo Go (phone and computer on the same wifi).
> Demo accounts (password `community123`): resident `ashley@example.com`,
> organizer `carlo.sk@example.com`, admin `admin@example.com` (on Sign in,
> **tap the logo** first to switch to administrator sign-in).

---

## 1. The big picture

```
 Screens (src/app)            what you see; one file = one screen
     │  call
     ▼
 Hooks (src/hooks)            load data for a screen and reload it when data changes
     │  call
     ▼
 Data modules (src/data)      ALL reading/writing of data + permission checks
     │  read/write
     ▼
 Mock tables (src/data/db.ts) in-memory sample data (resets when the app reloads)
```

- **Screens never touch the data directly.** They call hooks
  (`useEvents`, `useCurrentUser`, …) or data functions (`createEvent`,
  `signIn`, …).
- **Every change** (save, RSVP, edit, approve, …) calls `notifyChange()`
  in `db.ts`. All hooks listen for that and reload, so every screen updates
  by itself.
- **Moving to a real backend (Supabase)** means rewriting only the
  functions in `src/data/`. Screens and hooks stay the same.

## 2. Folder map

```
src/
  app/                 SCREENS (expo-router: the file path is the route)
    _layout.tsx        root: decides signed-out / resident app / admin console
    sign-in.tsx        sign in (+ administrator mode by tapping the logo)
    sign-up.tsx        create a resident account
    (tabs)/            the 4 tabs: index (Browse), map, saved, profile
    event/[id].tsx     event details
    notifications.tsx  in-app notifications (bell)
    organizer/         Organizer Tools: index (list), new, [id] (edit)
    settings/          everything under Profile: edit-profile, security,
                       interests, notifications, organizer-application,
                       history, privacy, help
    admin/             admin console: index (dashboard), applications,
                       application/[id], reports, organizations, users,
                       feedback, profile

  components/          REUSABLE PIECES, grouped by purpose
    ui/                generic building blocks: button, chip, icon, avatar,
                       themed-text, form-field, bottom-sheet, confirm-dialog,
                       screen-header, settings-screen, search-bar,
                       status-badge, empty-state, info-row, theme-toggle,
                       loading-animation
    layout/            app frame: app-header, app-tabs (+ .web), startup-splash
    events/            event-card, event-cover, event-form, events-map (+ .web),
                       filter-sheet, recommended-strip, rsvp-buttons,
                       manage-event-panel, report-event-sheet, organizer-line,
                       date-time-pickers, category
    photos/            photo-picker (event photos), photo-cropper (profile
                       photo crop), photo-gallery (full-screen viewer)
    admin/             admin-shell (sidebar layout), admin-table (DataTable,
                       row menu, pagination), admin-ui (cards, stat tiles)

  data/                ALL DATA ACCESS (swap these for the backend)
    types.ts           every shared type + PermissionError / ValidationError
    db.ts              mock tables, demo accounts, places/coordinates,
                       session, change signal (notifyChange)
    events.ts          events, search/filters, saves, RSVPs, organizer
                       actions, reports, map events
    account.ts         sign-in/up/out, profile, password, organizer
                       applications, feedback
    admin.ts           admin-only: applications review, reports,
                       organizations, users, stats
    interests.ts       interest options and "Recommended for you" matching
    notifications.ts   who gets which alert, reminders, notification settings

  hooks/
    use-events.ts      useEvents, useEvent, useCurrentUser, useAdminUsers, …
                       (one loader per kind of data; all reload on changes)
    use-event-actions.tsx  saved events + RSVPs shared by all screens
    use-theme.ts       theme colors for the current light/dark mode
    use-color-scheme.ts / color-scheme-preference.ts   day/night setting

  constants/
    theme.ts           colors (light + dark), spacing, radius
    app.ts             SUPPORT_EMAIL (replace with the team's address)

  utils/
    format.ts          dates/times, always in Philippine time (Asia/Manila)
    maps.ts            Biliran map region, "Open in Google Maps"
```

Other folders: `assets/` (logo, icons, splash), `design/` (Figma files),
`docs/` (documentation paper and presentation).

## 3. Where do I find…?

| I want to change… | Screen | Components | Data |
|---|---|---|---|
| Sign in / admin sign-in | `app/sign-in.tsx` | – | `account.ts` → `signIn` |
| Which area shows after sign-in | `app/_layout.tsx` | – | `account.ts` → `getSessionKind` |
| Browse list, search, filters | `app/(tabs)/index.tsx` | `events/event-card`, `events/filter-sheet`, `events/recommended-strip`, `ui/search-bar` | `events.ts` → `getEvents`, `getRecommendedEvents` |
| Event details page | `app/event/[id].tsx` | `events/event-cover`, `events/rsvp-buttons`, `events/manage-event-panel`, `events/report-event-sheet`, `photos/photo-gallery` | `events.ts` → `getEvent`, `reportEvent` |
| Save / Going / Interested | (any card or details) | `events/rsvp-buttons` | `hooks/use-event-actions.tsx`, `events.ts` → `setEventSaved`, `setRsvp` |
| Map tab and pins | `app/(tabs)/map.tsx` | `events/events-map` (+ `.web`) | `events.ts` → `getMyMapEvents`; places in `db.ts` (`PLACES`, `MUNICIPALITIES`) |
| Saved tab | `app/(tabs)/saved.tsx` | `events/event-card` | `events.ts` → `getEventsByIds` |
| Profile tab and settings menu | `app/(tabs)/profile.tsx` | `ui/settings-screen` | `account.ts` |
| Edit profile / photo crop | `app/settings/edit-profile.tsx` | `photos/photo-cropper` | `account.ts` → `updateProfile` |
| Organizer application | `app/settings/organizer-application.tsx` | – | `account.ts` → `submitOrganizerApplication` |
| Create / edit events | `app/organizer/*` | `events/event-form`, `photos/photo-picker`, `events/date-time-pickers` | `events.ts` → `createEvent`, `updateEvent` |
| Notifications | `app/notifications.tsx`, `app/settings/notifications.tsx` | – | `notifications.ts` |
| Admin pages | `app/admin/*` | `admin/admin-shell`, `admin/admin-table`, `admin/admin-ui` | `admin.ts` |
| Colors, spacing | – | – | `constants/theme.ts` |
| Icons | – | `ui/icon.tsx` (add to `Icons`) | – |
| Loading animation | – | `ui/loading-animation`, `layout/startup-splash` | – |
| Demo data (events, users, …) | – | – | `db.ts` |

## 4. Users and permissions

| Role | Can do | Checked in |
|---|---|---|
| Resident | browse, save, RSVP, report, apply to be an organizer | `events.ts` / `account.ts` (must be signed in) |
| Organizer | everything a resident can + create/edit/cancel events and announce, **only** for verified organizations they belong to | `events.ts` → `canManageOrganization` (throws `PermissionError`) |
| Administrator | only the admin console: review applications, reports, organizations, users | `admin.ts` → `requireAdmin` (throws `PermissionError`) |

- Permissions are checked **in the data layer**, not only by hiding buttons.
  With Supabase these checks become row-level security (RLS) rules.
- `app/_layout.tsx` uses `Stack.Protected` so each kind of user can only
  open its own screens (signed out → sign-in screens; resident/organizer →
  the app; admin → `app/admin`).

## 5. How to…

**Add a screen:** create a file under `src/app/` (e.g. `settings/about.tsx`
becomes the route `/settings/about`), wrap it in `SettingsScreen` or
`SafeAreaView`, then list it in the right `Stack.Protected` group in
`app/_layout.tsx`.

**Add data:** add the type to `data/types.ts`, the mock table to `db.ts`,
the function to the matching data module (call `notifyChange()` after
writes), and a loader hook in `hooks/use-events.ts`.

**Add a demo event:** add an entry to `eventSeeds` in `db.ts`. Dates use
`at(daysFromToday, 'HH:MM')`, so they stay in the future. For a map pin, add
its barangay to `PLACES` (or it falls back to the town center).

**Add an icon:** add `{ ios: 'sf.symbol.name', md: 'material_symbol' }` to
`Icons` in `components/ui/icon.tsx`.

**Use theme colors:** `const theme = useTheme();` then `theme.text`,
`theme.background`, `theme.primary`, … Never hard-code colors, so night
mode keeps working.

## 6. Rules that save hours (already hit)

- **`Button` stretches** (`flex: 1`) so pairs share a row. To size one to
  its label, give it a style with `flex: 0`. Using only `flexGrow: 0` works
  on web but makes empty tall pills on Android.
- **Reanimated:** a helper called inside `useAnimatedStyle` must start with
  `'worklet';`, or the phone crashes ("Tried to synchronously call a Remote
  Function"). The web preview doesn't catch this.
- **Dialogs:** use `ConfirmDialog`, not `Alert.alert` with buttons (those do
  nothing on web).
- **Times** are always shown in Philippine time: use `utils/format.ts`.
- **Phone width:** check screens at 360px wide. Nothing should stick out
  past the edge.
- Imports use the `@/` alias for `src/` (e.g. `@/components/ui/button`).

## 7. Before you push

```bash
npx tsc --noEmit   # types
npx expo lint      # lint
```

Both must pass with no errors. Then test on a phone with Expo Go.
