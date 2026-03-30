# Wordbraid

Wordbraid is a portrait-first word arcade game about braiding 3-to-5-letter words off a live five-ribbon loom before ink jams the press.

## Core Rules

- Tap a ribbon to pull its front letter into the tray.
- Build any valid 3-to-5-letter English word.
- You can use each ribbon at most once per word.
- Every valid word adds fresh ink to one ribbon.
- 4- and 5-letter words scrub ink backward.
- The run ends when any ink tile reaches the front of a ribbon.

## Local Workflow

- `npm install`
- `npm run test`
- `npm run validate`
- `npm run capture:media`
- `node scripts/verify-release.mjs`
- `playdrop project dev .`
- `playdrop project validate .`

## Files

- Game code: `src/`
- Design and gate docs: `IDEA.md`, `SPECS_v1.md`, `SIMPLIFY_v1.md`, `gates/`
- Listing assets and copy: `listing/`
- Capture and balance scripts: `scripts/`

## Release

- Current version: `1.0.1`
- Live listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid/play`
- Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/wordbraid/v1.0.1/index.html`
- X thread: `https://x.com/autonomoustudio/status/2038600004554650072`
