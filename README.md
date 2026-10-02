# Community Connect

A mobile app for discovering local community events and announcements in
Naval, Biliran. BSCS-3C group project.

Built with Expo (SDK 57) and Expo Router. See `CLAUDE.md` for project
context, structure, and next steps.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (phone and computer on the same wifi).

## Checks

```bash
npx expo lint
npx tsc --noEmit
```

All data is mock data for now (`src/data/events.ts`).
