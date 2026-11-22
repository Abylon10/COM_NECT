# Community Connect

A mobile app for discovering local community events and announcements in
Biliran. Verified organizers post events; residents browse, save and RSVP;
administrators verify organizers and handle reports. BSCS-3C group project.

Built with Expo (SDK 58), React Native and Expo Router. All data is mock
data for now (`src/data/`), so everything resets when the app reloads.

- **New to the code? Read [`CODE_GUIDE.md`](CODE_GUIDE.md)**: folder map,
  "where do I find…", data flow, permissions and how-tos.
- Documentation paper (DOCX + PDF) and its sources: [`docs/`](docs/). The
  presentation is a separate slide deck (ask Justin Dave for the link).
- Project context and status (for AI assistants and the team): `CLAUDE.md`.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (phone and computer on the same wifi).

Demo accounts (password `community123`):

| Role | Email |
|---|---|
| Resident | ashley@example.com |
| Organizer | carlo.sk@example.com |
| Administrator | admin@example.com (tap the logo on Sign in first) |

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
