# Community Connect — Figma files

Wireframes, hi-fi screens, a user flow, and a design-system sheet, as
**SVG files you can import into Figma**. Figma's own `.fig` format can't
be generated outside Figma, but imported SVGs come in as editable layers:
text stays editable (font: Inter, built into Figma), and shapes and icons
are vectors.

```
design/figma/
  wireframes/   8 grayscale screens (390 × 844, iPhone 14/15)
  hifi/         the same 8 screens in the app's real colors
  hifi-dark/    dark-mode versions of Browse, Event details, Profile
  boards/       everything on one canvas each: wireframes, hi-fi,
                user flow, design system
  previews/     PNG previews of the boards (for viewing outside Figma)
```

Screens: 01 Sign in · 02 Browse · 03 Filters · 04 Event details ·
05 Saved · 06 Notifications · 07 Profile · 08 Create event (organizer).
Sign in, Notifications, and Create event are **planned** screens that
aren't built in the app yet.

## Import into Figma

1. Create a new Design file. Add three pages: **Wireframes**, **Hi-fi**,
   **Prototype flow**.
2. On the Wireframes page, drag in every file from `wireframes/` at once.
   Each SVG becomes its own **frame** named after the file.
3. On the Hi-fi page, drag in everything from `hifi/` and `hifi-dark/`.
4. On the Prototype flow page, drag in `boards/user-flow.svg` as a
   reference, and `boards/design-system.svg` if you want the styles sheet.
5. Optional cleanup: select a frame and use **Ungroup** (Shift+Cmd/Ctrl+G)
   on the outer group, then turn repeated pieces (event card, chip,
   button, tab bar) into **components**.

Tip: the `boards/*.svg` files are great for presenting, but each one
imports as a single big frame. For prototyping, use the individual screen
files so each screen is its own frame.

## Wire up the prototype (Prototype tab in Figma)

Set **02 Browse** as the flow's starting frame, with device **iPhone 14**.
Then add these connections (select the layer, drag the blue handle to the
target frame):

| From frame | Layer to click | Interaction | Goes to | Animation |
|---|---|---|---|---|
| 01 Sign in | `Button/Sign in`, `Guest link` | On tap | 02 Browse | Dissolve |
| 02 Browse | `Event card/Youth Leadership Summit 2026` | On tap | 04 Event details | Push → left |
| 02 Browse | `Filter button` | On tap | 03 Filters | Move in ↑ (or Open overlay, bottom) |
| 02 Browse | `icon/notifications` | On tap | 06 Notifications | Push → left |
| 02 / 05 / 07 | `Tab/Browse`, `Tab/Saved`, `Tab/Profile` | On tap | 02 / 05 / 07 | Instant |
| 03 Filters | `Button/Show 3 events`, `Button/Reset`, `Backdrop` | On tap | 02 Browse | Move out ↓ |
| 04 Event details | `Back button` | On tap | Back | Push → right |
| 06 Notifications | `Notification/Reminder: tomorrow` | On tap | 04 Event details | Push → left |
| 06 Notifications | `icon/arrow_back` | On tap | Back | Push → right |
| 07 Profile | `Menu/Organizer Tools` | On tap | 08 Create event | Move in ↑ |
| 08 Create event | `icon/close`, `Button/Publish` | On tap | Back | Move out ↓ |

For a day/night demo, connect `icon/dark_mode` on 02 Browse (hi-fi) to
02 Browse (dark) with **Smart animate**.

## Regenerating

The files are generated from `design/tools/generate_figma.py`, which mirrors
the app's theme (`src/constants/theme.ts`) and mock data. To change them,
edit the script and run:

```bash
pip install fonttools brotli
npm pack @fontsource/inter@5 && tar xzf fontsource-inter-*.tgz
python3 design/tools/generate_figma.py package/files
```

The Inter files are only used to measure text widths. Icons come from the
Material Symbols font the app already uses (`icons.json`).
